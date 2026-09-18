import type { ToolDefinition, ToolValidationResult } from "./types.js";
import { searchWeb } from "../web/search.js";

const validateSearchArgs = (args: unknown): ToolValidationResult => {
  if (!args || typeof args !== "object" || Array.isArray(args)) return { ok: false, error: "invalid_arguments" };
  const obj = args as Record<string, unknown>;
  if (typeof obj.query !== "string" || obj.query.trim().length < 2 || obj.query.length > 500) {
    return { ok: false, error: "invalid_arguments" };
  }
  const maxResults = obj.maxResults === undefined ? 5 : obj.maxResults;
  if (typeof maxResults !== "number" || !Number.isInteger(maxResults) || maxResults < 1 || maxResults > 10) {
    return { ok: false, error: "invalid_arguments" };
  }
  return { ok: true, value: { query: obj.query.trim(), maxResults } };
};

export const webTools: ToolDefinition[] = [{
  name: "search_web",
  description: "Search the live web for current information. Only available when a web search provider is configured.",
  risk: "read",
  status: process.env.TAVILY_API_KEY ? "available" : "requires_integration",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: { type: "string", minLength: 2, maxLength: 500 },
      maxResults: { type: "integer", minimum: 1, maximum: 10, default: 5 }
    }
  },
  validateArgs: validateSearchArgs,
  execute: async (args) => searchWeb(args.query, args.maxResults)
}];
