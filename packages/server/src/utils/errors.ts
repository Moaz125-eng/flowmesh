export class FlowMeshError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, opts: { statusCode?: number; code?: string } = {}) {
    super(message);
    this.name = "FlowMeshError";
    this.statusCode = opts.statusCode ?? 500;
    this.code = opts.code ?? "internal_error";
  }
}

export class ValidationError extends FlowMeshError {
  constructor(message: string) {
    super(message, { statusCode: 400, code: "validation_error" });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends FlowMeshError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} ${id} not found` : `${resource} not found`, {
      statusCode: 404,
      code: "not_found",
    });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends FlowMeshError {
  constructor(message: string) {
    super(message, { statusCode: 409, code: "conflict" });
    this.name = "ConflictError";
  }
}
