import type { FlowMeshPlugin } from "../types.js";
import { evaluateCondition } from "../../workflows/conditions.js";
import { buildConditionScope } from "../../execution/context.js";
import { ValidationError } from "../../utils/errors.js";

export const conditionPlugin: FlowMeshPlugin = {
  type: "condition",
  description: "Evaluate a boolean expression and pass through",
  async run({ config, context, nodeId }) {
    const expression =
      typeof config.expression === "string" ? config.expression : "";
    if (!expression) {
      throw new ValidationError(`condition node ${nodeId} missing expression`);
    }
    const scope = buildConditionScope(context, nodeId);
    const result = evaluateCondition(expression, scope);
    return { matched: result, expression };
  },
};
