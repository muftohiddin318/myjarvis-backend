import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    service: "myjarvis-backend",
    version: "0.3.0",
    capabilities: {
      aiRouter: true,
      toolCalling: true,
      safeBuiltinTools: true,
      webSearch: false,
      authenticatedPersonalData: false
    },
    timestamp: new Date().toISOString()
  });
}