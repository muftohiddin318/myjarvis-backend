import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { routeChat } from "../src/core/chat.js";

const RequestSchema = z.object({
  message: z.string().min(1).max(12000),
  conversationId: z.string().optional(),
  language: z.string().max(20).default("en"),
  history: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(12000)
  })).max(30).optional(),
  userContext: z.string().max(12000).optional()
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  try {
    const result = await routeChat(parsed.data);
    return res.status(result.ok ? 200 : 503).json(result);
  } catch (error) {
    console.error("MyJarvis chat error", error);
    return res.status(500).json({
      error: "internal_error",
      message: "MyJarvis could not complete the request."
    });
  }
}