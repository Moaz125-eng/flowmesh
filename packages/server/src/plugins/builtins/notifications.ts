import type { FlowMeshPlugin } from "../types.js";
import { renderTemplate } from "../template.js";
import { ValidationError } from "../../utils/errors.js";

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal,
  });
  const ct = res.headers.get("content-type") ?? "";
  const data = ct.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text();
  if (!res.ok) {
    throw new Error(
      `${url} responded with ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
    );
  }
  return { status: res.status, data };
}

export const slackPlugin: FlowMeshPlugin = {
  type: "slack.postMessage",
  description: "Send a Slack message via incoming webhook",
  async run({ config, context, nodeId }) {
    const rendered = renderTemplate(config, context) as Record<string, unknown>;
    const url =
      typeof rendered.webhookUrl === "string" ? rendered.webhookUrl : undefined;
    const text = typeof rendered.text === "string" ? rendered.text : undefined;
    if (!url || !text) {
      throw new ValidationError(
        `slack node ${nodeId} requires webhookUrl and text`,
      );
    }
    return postJson(
      url,
      { text, channel: rendered.channel, username: rendered.username },
      {},
      context.signal,
    );
  },
};

export const discordPlugin: FlowMeshPlugin = {
  type: "discord.postMessage",
  description: "Send a Discord message via webhook",
  async run({ config, context, nodeId }) {
    const rendered = renderTemplate(config, context) as Record<string, unknown>;
    const url =
      typeof rendered.webhookUrl === "string" ? rendered.webhookUrl : undefined;
    const content =
      typeof rendered.content === "string" ? rendered.content : undefined;
    if (!url || !content) {
      throw new ValidationError(
        `discord node ${nodeId} requires webhookUrl and content`,
      );
    }
    return postJson(
      url,
      { content, username: rendered.username },
      {},
      context.signal,
    );
  },
};

export const githubPlugin: FlowMeshPlugin = {
  type: "github.createIssueComment",
  description: "Comment on a GitHub issue",
  async run({ config, context, nodeId }) {
    const rendered = renderTemplate(config, context) as Record<string, unknown>;
    const token = typeof rendered.token === "string" ? rendered.token : "";
    const owner = typeof rendered.owner === "string" ? rendered.owner : "";
    const repo = typeof rendered.repo === "string" ? rendered.repo : "";
    const issue = Number(rendered.issueNumber);
    const body = typeof rendered.body === "string" ? rendered.body : "";
    if (!token || !owner || !repo || !issue || !body) {
      throw new ValidationError(
        `github node ${nodeId} requires token, owner, repo, issueNumber, body`,
      );
    }
    return postJson(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issue}/comments`,
      { body },
      {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "flowmesh",
      },
      context.signal,
    );
  },
};
