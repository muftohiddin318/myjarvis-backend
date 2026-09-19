import type { ToolDefinition, ToolValidationResult } from "./types.js";
import { sendTelegramMessage } from "../telegram/client.js";

const configured = Boolean(
  process.env.TELEGRAM_API_ID &&
  process.env.TELEGRAM_API_HASH &&
  process.env.TELEGRAM_STRING_SESSION &&
  process.env.TELEGRAM_ACTION_SECRET
);

const validateSend: ToolDefinition["validateArgs"] = (args: unknown): ToolValidationResult => {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return { ok: false, error: "invalid_arguments" };
  }

  const obj = args as Record<string, unknown>;
  if (typeof obj.username !== "string" || !/^@?[A-Za-z0-9_]{3,64}$/.test(obj.username.trim())) {
    return { ok: false, error: "invalid_username" };
  }
  if (typeof obj.message !== "string" || obj.message.trim().length < 1 || obj.message.length > 4096) {
    return { ok: false, error: "invalid_message" };
  }

  return {
    ok: true,
    value: {
      username: obj.username.trim(),
      message: obj.message
    }
  };
};

export const telegramTools: ToolDefinition[] = [{
  name: "send_telegram_message",
  description: "Send a direct Telegram message from the user's authorized personal Telegram account. This is an external action and always requires explicit approval before execution.",
  risk: "medium",
  status: configured ? "available" : "requires_integration",
  inputSchema: {
    type: "object",
    required: ["username", "message"],
    properties: {
      username: {
        type: "string",
        description: "Telegram username, with or without the @ prefix."
      },
      message: {
        type: "string",
        minLength: 1,
        maxLength: 4096
      }
    }
  },
  validateArgs: validateSend,
  execute: async (args) => sendTelegramMessage(args.username, args.message)
}];
