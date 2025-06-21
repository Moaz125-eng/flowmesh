import { logger } from "../utils/logger.js";
import { closePool } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import {
  listAllWorkflows,
  removeWorkflow,
  setWorkflowEnabled,
} from "../workflows/service.js";
import { listExecutions } from "../execution/repository.js";
import { listDlq } from "../queue/dlq.js";

const HELP = `flowmesh-cli <command> [args]

Commands:
  migrate              Apply database schema
  list                 List all workflows
  enable <id>          Enable a workflow
  disable <id>         Disable a workflow
  delete <id>          Delete a workflow
  executions [id]      List recent executions (filter by workflow id)
  dlq                  List dead-letter queue entries
  help                 Show this message
`;

async function commandMigrate(): Promise<void> {
  await runMigrations();
}

async function commandList(): Promise<void> {
  const items = await listAllWorkflows({ limit: 200 });
  if (items.length === 0) {
    process.stdout.write("(no workflows)\n");
    return;
  }
  for (const wf of items) {
    const status = wf.enabled ? "on " : "off";
    process.stdout.write(
      `${status}  ${wf.id}  ${wf.name.padEnd(32)} ${wf.trigger.type}\n`,
    );
  }
}

async function commandToggle(id: string | undefined, enabled: boolean): Promise<void> {
  if (!id) throw new Error("workflow id is required");
  const wf = await setWorkflowEnabled(id, enabled);
  logger.info({ id: wf.id, enabled: wf.enabled }, "workflow updated");
}

async function commandDelete(id: string | undefined): Promise<void> {
  if (!id) throw new Error("workflow id is required");
  await removeWorkflow(id);
  logger.info({ id }, "workflow deleted");
}

async function commandExecutions(workflowId: string | undefined): Promise<void> {
  const items = await listExecutions({ workflowId, limit: 50 });
  for (const e of items) {
    process.stdout.write(
      `${e.id}  ${e.status.padEnd(10)} ${e.workflowName} (${e.triggeredBy}) ${e.startedAt}\n`,
    );
  }
}

async function commandDlq(): Promise<void> {
  const items = await listDlq({ limit: 50 });
  for (const entry of items) {
    process.stdout.write(
      `#${entry.id}  ${entry.workflowId ?? "-"}  ${entry.reason}  ${entry.createdAt}\n`,
    );
  }
}

async function dispatch(): Promise<void> {
  const [, , cmd, arg] = process.argv;
  switch (cmd) {
    case "migrate":
      return commandMigrate();
    case "list":
      return commandList();
    case "enable":
      return commandToggle(arg, true);
    case "disable":
      return commandToggle(arg, false);
    case "delete":
      return commandDelete(arg);
    case "executions":
      return commandExecutions(arg);
    case "dlq":
      return commandDlq();
    case "help":
    case undefined:
      process.stdout.write(HELP);
      return;
    default:
      process.stderr.write(`unknown command: ${cmd}\n${HELP}`);
      process.exit(1);
  }
}

dispatch()
  .then(() => closePool())
  .catch((err) => {
    logger.error({ err }, "cli failed");
    void closePool().finally(() => process.exit(1));
  });
