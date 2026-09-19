import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getTelegramBotInfo,
  getTelegramBotWebhookInfo,
  ownerConfigured
} from "../../../src/core/telegram/bot.js";

const PUBLIC_BACKEND_URL =
  process.env.MYJARVIS_PUBLIC_BACKEND_URL ||
  "https://myjarvis-backend.vercel.app";

function expectedWebhookUrl() {
  return PUBLIC_BACKEND_URL.replace(/\/$/, "") + "/api/telegram/bot/webhook";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const configured = Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_BOT_WEBHOOK_SECRET &&
    process.env.MYJARVIS_OWNER_TELEGRAM_ID
  );

  if (!configured) {
    return res.status(200).json({
      ok: true,
      configured: false,
      connected: false,
      ownerConfigured: ownerConfigured(),
      webhookConfigured: false
    });
  }

  try {
    const [bot, webhook] = await Promise.all([
      getTelegramBotInfo(),
      getTelegramBotWebhookInfo()
    ]);

    const webhookUrl = typeof webhook === "object" && webhook !== null && "url" in webhook
      ? String((webhook as { url?: unknown }).url || "")
      : "";
    const webhookConfigured = webhookUrl === expectedWebhookUrl();

    return res.status(200).json({
      ok: true,
      configured: true,
      connected: true,
      ownerConfigured: ownerConfigured(),
      webhookConfigured,
      webhookUrl: webhookUrl || null,
      expectedWebhookUrl: expectedWebhookUrl(),
      bot
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      configured: true,
      connected: false,
      webhookConfigured: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
