import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authConfigured, verifyBearerToken } from "../../src/core/auth/verify.js";
import { createApprovalToken } from "../../src/core/actions/approvalToken.js";
import { getTool } from "../../src/core/tools/registry.js";

const Schema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("send_telegram_message"),
    args: z.object({
      username: z.string().min(3).max(64),
      message: z.string().min(1).max(4096)
    })
  }),
  z.object({
    tool: z.literal("bot_send_message"),
    args: z.object({
      chatId: z.union([z.string(), z.number()]).optional(),
      message: z.string().min(1).max(4096)
    })
  })
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_request" });

  const tool = getTool(parsed.data.tool);
  if (!tool || tool.status !== "available") {
    return res.status(503).json({ error: "tool_not_configured", tool: parsed.data.tool });
  }

  let userId: string | undefined;
  if (authConfigured()) {
    try {
      userId = (await verifyBearerToken(req.headers.authorization)).id;
    } catch {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  try {
    const approvalToken = createApprovalToken({
      tool: parsed.data.tool,
      toolArgs: parsed.data.args,
      userId,
      ttlSeconds: 300
    });

    return res.status(200).json({
      ok: true,
      requiresApproval: true,
      tool: parsed.data.tool,
      args: parsed.data.args,
      expiresInSeconds: 300,
      approvalToken
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
