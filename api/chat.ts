import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { routeChat } from "../src/core/chat.js";

const RequestSchema = z.object({
  message: z.string().min(1).max(12000),
  conversationId: z.string().optional(),
  language: z.string().default("en")
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
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
    return res.status(200).json(result);
  } catch (error) {
    console.error("MyJarvis chat error", error);
    return res.status(500).json({
      error: "internal_error",
      message: "MyJarvis could not complete the request."
    });
  }
}
