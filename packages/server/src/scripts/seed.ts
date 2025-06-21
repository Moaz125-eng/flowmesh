import { logger } from "../utils/logger.js";
import { runMigrations } from "../db/migrate.js";
import { createWorkflow } from "../workflows/service.js";
import { closePool } from "../db/client.js";

const SAMPLES = [
  {
    name: "hello-world",
    description: "Logs a friendly greeting on demand.",
    trigger: { type: "manual" as const },
    nodes: [
      {
        id: "greet",
        type: "log",
        config: {
          level: "info",
          message:
            "hello {{ payload.name }}, the time is {{ payload.now }}",
        },
      },
    ],
    edges: [],
    enabled: true,
  },
  {
    name: "issue-to-slack",
    description: "Forward GitHub issue events to a Slack channel.",
    trigger: {
      type: "webhook" as const,
      path: "github/issues",
      method: "POST" as const,
    },
    nodes: [
      {
        id: "filter",
        type: "condition",
        config: { expression: "payload.action == 'opened'" },
      },
      {
        id: "notify",
        type: "slack.postMessage",
        config: {
          webhookUrl: "{{ payload.slackUrl }}",
          text:
            "New issue: {{ payload.issue.title }} ({{ payload.issue.html_url }})",
        },
      },
    ],
    edges: [{ from: "filter", to: "notify", when: "true" }],
    enabled: false,
  },
  {
    name: "nightly-cleanup",
    description: "Runs every night at 02:00 to ping a cleanup endpoint.",
    trigger: { type: "cron" as const, expression: "0 2 * * *" },
    nodes: [
      {
        id: "ping",
        type: "http.request",
        config: {
          url: "https://example.com/internal/cleanup",
          method: "POST",
        },
        retry: {
          maxAttempts: 3,
          backoff: "exponential" as const,
          initialDelayMs: 500,
          maxDelayMs: 5000,
        },
      },
    ],
    edges: [],
    enabled: false,
  },
];

async function main(): Promise<void> {
  await runMigrations();
  let created = 0;
  for (const sample of SAMPLES) {
    try {
      const wf = await createWorkflow(sample);
      logger.info({ id: wf.id, name: wf.name }, "seeded workflow");
      created++;
    } catch (err) {
      logger.error({ err, name: sample.name }, "seed failed");
    }
  }
  logger.info({ created, total: SAMPLES.length }, "seed complete");
  await closePool();
}

main().catch((err) => {
  logger.error({ err }, "seed crashed");
  process.exit(1);
});
