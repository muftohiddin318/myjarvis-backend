import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getTelegramBotInfo, ownerConfigured } from "../../../src/core/telegram/bot.js";

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
      ownerConfigured: ownerConfigured()
    });
  }

  try {
    const bot = await getTelegramBotInfo();
    return res.status(200).json({
      ok: true,
      configured: true,
      connected: true,
      bot
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
