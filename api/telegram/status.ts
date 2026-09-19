import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authConfigured, verifyBearerToken } from "../../src/core/auth/verify.js";
import { getTelegramAccount } from "../../src/core/telegram/client.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  if (authConfigured()) {
    try {
      await verifyBearerToken(req.headers.authorization);
    } catch {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  const configured = Boolean(
    process.env.TELEGRAM_API_ID &&
    process.env.TELEGRAM_API_HASH &&
    process.env.TELEGRAM_STRING_SESSION &&
    process.env.TELEGRAM_ACTION_SECRET
  );

  if (!configured) {
    return res.status(200).json({
      ok: true,
      configured: false,
      connected: false,
      message: "Telegram personal-account credentials are not configured."
    });
  }

  try {
    const account = await getTelegramAccount();
    return res.status(200).json({
      ok: true,
      configured: true,
      connected: true,
      account
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
