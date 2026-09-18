import type { ToolDefinition } from "./types.js";
import { listTools } from "./registry.js";

export type ToolCall = { name: string; arguments: Record<string, unknown> };

export function getModelToolSchemas() {
  return listTools().map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }
  }));
}

export function parseToolCalls(value: unknown): ToolCall[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ToolCall =>
    !!item &&
    typeof item === "object" &&
    typeof (item as any).name === "string" &&
    !!(item as any).arguments &&
    typeof (item as any).arguments === "object"
  );
}

export function toolNames() {
  return listTools().map(tool => tool.name);
}
