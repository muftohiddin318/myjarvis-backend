import { getTool } from "./registry.js";
import type { ToolExecutionResult } from "./types.js";

const APPROVAL_RANK = { read: 0, low: 1, medium: 2, high: 3 } as const;

export async function executeTool(name: string, args: unknown, allowedRisk: keyof typeof APPROVAL_RANK = "read"): Promise<ToolExecutionResult> {
  const tool = getTool(name);
  if (!tool) return { ok:false, tool:name, error:"tool_not_found" };
  if (tool.status !== "available") return { ok:false, tool:name, error:"tool_unavailable" };
  if (APPROVAL_RANK[tool.risk] > APPROVAL_RANK[allowedRisk]) {
    return { ok:false, tool:name, error:"approval_required", requiresApproval:true };
  }
  try {
    const result = await tool.execute(args);
    return { ok:true, tool:name, result };
  } catch (error) {
    return { ok:false, tool:name, error:error instanceof Error ? error.message : String(error) };
  }
}