import type { FlowMeshPlugin } from "../types.js";
import { renderTemplate } from "../template.js";
import { ValidationError } from "../../utils/errors.js";

export const httpPlugin: FlowMeshPlugin = {
  type: "http.request",
  description: "Make an outbound HTTP request",
  async run({ config, context, nodeId }) {
    const rendered = renderTemplate(config, context) as Record<string, unknown>;
    const url = typeof rendered.url === "string" ? rendered.url : undefined;
    if (!url) {
      throw new ValidationError(`http node ${nodeId} missing url`);
    }
    const method =
      typeof rendered.method === "string"
        ? rendered.method.toUpperCase()
        : "GET";
    const headers =
      rendered.headers && typeof rendered.headers === "object"
        ? (rendered.headers as Record<string, string>)
        : {};
    const hasBody = method !== "GET" && method !== "HEAD";
    const body = hasBody && rendered.body !== undefined
      ? typeof rendered.body === "string"
        ? rendered.body
        : JSON.stringify(rendered.body)
      : undefined;
    if (body && !headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: context.signal,
    });
    const contentType = res.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text();
    if (!res.ok) {
      throw new Error(
        `http ${method} ${url} failed with ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
      );
    }
    return { status: res.status, data };
  },
};
