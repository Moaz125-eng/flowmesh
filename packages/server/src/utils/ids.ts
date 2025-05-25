import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

const workflowIdGen = customAlphabet(alphabet, 20);
const executionIdGen = customAlphabet(alphabet, 24);

export const newWorkflowId = (): string => `wf_${workflowIdGen()}`;
export const newExecutionId = (): string => `ex_${executionIdGen()}`;
