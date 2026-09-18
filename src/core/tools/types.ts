export type ToolRisk = "read" | "low" | "medium" | "high";
export type ToolStatus = "available" | "requires_integration" | "disabled";

export type ToolDefinition<TArgs = unknown, TResult = unknown> = {
  name: string;
  description: string;
  risk: ToolRisk;
  status: ToolStatus;
  inputSchema: Record<string, unknown>;
  execute: (args: TArgs) => Promise<TResult> | TResult;
};

export type ToolExecutionResult = {
  ok: boolean;
  tool: string;
  result?: unknown;
  error?: string;
  requiresApproval?: boolean;
};