import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authConfigured } from "../../src/core/auth/verify.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    configured: authConfigured(),
    mode: authConfigured() ? "jwt" : "not_configured"
  });
}
