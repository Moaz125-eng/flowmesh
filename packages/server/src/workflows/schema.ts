import { z } from "zod";

const NodeIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_\-:.]+$/, "invalid node id");

const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(20),
  backoff: z.enum(["exponential", "fixed"]),
  initialDelayMs: z.number().int().min(0),
  maxDelayMs: z.number().int().min(0).optional(),
});

const WorkflowNodeSchema = z.object({
  id: NodeIdSchema,
  type: z.string().min(1),
  config: z.record(z.unknown()).default({}),
  retry: RetryPolicySchema.optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const WorkflowEdgeSchema = z.object({
  from: NodeIdSchema,
  to: NodeIdSchema,
  when: z.string().optional(),
});

const WebhookTriggerSchema = z.object({
  type: z.literal("webhook"),
  path: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_\-/]+$/, "invalid webhook path"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("POST"),
  signingSecret: z.string().optional(),
});

const CronTriggerSchema = z.object({
  type: z.literal("cron"),
  expression: z.string().min(1),
  timezone: z.string().optional(),
});

const ManualTriggerSchema = z.object({
  type: z.literal("manual"),
});

const TriggerSchema = z.discriminatedUnion("type", [
  WebhookTriggerSchema,
  CronTriggerSchema,
  ManualTriggerSchema,
]);

export const WorkflowInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  trigger: TriggerSchema,
  nodes: z.array(WorkflowNodeSchema).min(1),
  edges: z.array(WorkflowEdgeSchema).default([]),
  enabled: z.boolean().default(true),
});

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>;
