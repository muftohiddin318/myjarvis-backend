export type ToolRisk = "read" | "low" | "medium" | "high";
export type ToolStatus = "available" | "requires_integration" | "disabled";

export type ToolValidationResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export type ToolDefinition<TArgs = unknown, TResult = unknown> = {
  name: string;
  description: string;
  risk: ToolRisk;
  status: ToolStatus;
  inputSchema: Record<string, unknown>;
  validateArgs?: (args: unknown) => ToolValidationResult;
  execute: (args: TArgs) => Promise<TResult> | TResult;
};

export type ToolExecutionResult = {
  ok: boolean;
  tool: string;
  result?: unknown;
  error?: string;
  requiresApproval?: boolean;
};