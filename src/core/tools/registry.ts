import { builtinTools } from "./builtins.js";
import type { ToolDefinition } from "./types.js";

const tools = new Map<string, ToolDefinition>();
for (const tool of builtinTools) tools.set(tool.name, tool);

export function listTools() {
  return [...tools.values()].map(({ execute, ...definition }) => definition);
}

export function getTool(name: string) {
  return tools.get(name);
}