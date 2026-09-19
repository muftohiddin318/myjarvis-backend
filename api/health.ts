import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authConfigured } from "../src/core/auth/verify.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    service: "myjarvis-backend",
    version: "0.5.0",
    capabilities: {
      aiRouter: true,
      toolCalling: true,
      safeBuiltinTools: true,
      webSearch: Boolean(process.env.TAVILY_API_KEY),
      authenticatedPersonalData: authConfigured(),
      telegramSend: Boolean(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH && process.env.TELEGRAM_STRING_SESSION && process.env.TELEGRAM_ACTION_SECRET)
    },
    timestamp: new Date().toISOString()
  });
}
