import { builtinTools } from "./builtins.js";
import { webTools } from "./web.js";
import { telegramTools } from "./telegram.js";
import { botTelegramTools } from "./botTelegram.js";
import type { ToolDefinition } from "./types.js";

const tools = new Map<string, ToolDefinition<any, any>>();
for (const tool of [...builtinTools, ...webTools, ...telegramTools, ...botTelegramTools]) tools.set(tool.name, tool);

export function listTools() {
  return [...tools.values()].map(({ execute, validateArgs, ...definition }) => definition);
}

export function getTool(name: string) {
  return tools.get(name);
}
