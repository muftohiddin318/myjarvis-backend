import type { ToolDefinition, ToolValidationResult } from "./types.js";
import { sendBotMessage, ownerConfigured } from "../telegram/bot.js";

const configured = Boolean(
  process.env.TELEGRAM_BOT_TOKEN &&
  process.env.TELEGRAM_BOT_WEBHOOK_SECRET &&
  process.env.MYJARVIS_OWNER_TELEGRAM_ID
);

const validate: ToolDefinition["validateArgs"] = (args: unknown): ToolValidationResult => {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return { ok: false, error: "invalid_arguments" };
  }

  const obj = args as Record<string, unknown>;
  if (typeof obj.message !== "string" || obj.message.trim().length < 1 || obj.message.length > 4096) {
    return { ok: false, error: "invalid_message" };
  }

  const target = obj.chatId ?? "owner";
  if (
    target !== "owner" &&
    typeof target !== "string" &&
    typeof target !== "number"
  ) {
    return { ok: false, error: "invalid_chat_id" };
  }

  return {
    ok: true,
    value: {
      chatId: String(target),
      message: obj.message
    }
  };
};

function resolveChatId(chatId: string) {
  const ownerId = process.env.MYJARVIS_OWNER_TELEGRAM_ID;
  if (chatId === "owner" || chatId === "self") {
    if (!ownerId) throw new Error("telegram_bot_owner_not_configured");
    return ownerId;
  }

  const ownerUsername = (process.env.MYJARVIS_OWNER_TELEGRAM_USERNAME || "").replace(/^@/, "").toLowerCase();
  if (
    ownerUsername &&
    chatId.replace(/^@/, "").toLowerCase() === ownerUsername
  ) {
    if (!ownerId) throw new Error("telegram_bot_owner_not_configured");
    return ownerId;
  }

  if (/^-?\d+$/.test(chatId)) return chatId;

  throw new Error(
    "telegram_bot_usernames_cannot_be_resolved_for_direct_messages_use_owner_or_numeric_chat_id"
  );
}

export const botTelegramTools: ToolDefinition[] = [{
  name: "bot_send_message",
  description: "Send a message as the official MyJarvis Telegram bot. This external action requires explicit approval.",
  risk: "medium",
  status: configured && ownerConfigured() ? "available" : "requires_integration",
  inputSchema: {
    type: "object",
    required: ["message"],
    properties: {
      chatId: {
        type: "string",
        description: "Use 'owner' for the configured MyJarvis owner chat or a numeric Telegram chat ID."
      },
      message: {
        type: "string",
        minLength: 1,
        maxLength: 4096
      }
    }
  },
  validateArgs: validate,
  execute: async (args) => {
    const chatId = resolveChatId(args.chatId);
    const telegramResult = await sendBotMessage(chatId, args.message);

    return {
      sent: true,
      channel: "telegram_bot",
      chatId,
      confirmed: true,
      telegramResult
    };
  }
}];
