import { routeChat } from "../chat.js";

type TelegramSendResult = {
  ok: boolean;
  result?: unknown;
  description?: string;
};

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("telegram_bot_not_configured");
  return token;
}

async function telegramApi(method: string, body: Record<string, unknown>) {
  const response = await fetch(
    `https://api.telegram.org/bot${encodeURIComponent(botToken())}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json() as TelegramSendResult;
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `telegram_api_error_${response.status}`);
  }

  return data.result;
}

export function validateBotSecret(secret: string | undefined) {
  const expected = process.env.TELEGRAM_BOT_WEBHOOK_SECRET;
  if (!expected) return false;
  return Boolean(secret) && secret === expected;
}

export function ownerConfigured() {
  return Boolean(process.env.MYJARVIS_OWNER_TELEGRAM_ID);
}

export function isOwnerChat(chatId: number | string | undefined) {
  const expected = process.env.MYJARVIS_OWNER_TELEGRAM_ID;
  return Boolean(expected && chatId !== undefined && String(chatId) === expected);
}

export async function sendBotMessage(chatId: number | string, text: string, replyMarkup?: unknown) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4096),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

export async function sendBotTyping(chatId: number | string) {
  return telegramApi("sendChatAction", {
    chat_id: chatId,
    action: "typing"
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text: text.slice(0, 200) } : {})
  });
}

export async function processBotText(chatId: number | string, text: string) {
  await sendBotTyping(chatId);

  const result = await routeChat({
    message: text,
    conversationId: `telegram-bot:${chatId}`,
    language: "en",
    history: [],
    userContext: `Telegram Bot channel. Owner chat id: ${chatId}`
  });

  return result;
}

export async function createTelegramBotWebhook(url: string, secretToken: string) {
  return telegramApi("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false
  });
}

export async function getTelegramBotInfo() {
  return telegramApi("getMe", {});
}

export async function getTelegramBotWebhookInfo() {
  return telegramApi("getWebhookInfo", {});
}
