import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyBearerToken } from "../src/core/auth/verify.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await verifyBearerToken(req.headers.authorization);
    return res.status(200).json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : String(error);
    const status = code === "auth_not_configured" ? 503 : 401;
    return res.status(status).json({
      ok: false,
      error: status === 503 ? "auth_not_configured" : "unauthorized"
    });
  }
}
