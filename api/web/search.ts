import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { searchWeb } from "../../src/core/web/search.js";

const RequestSchema = z.object({
  query: z.string().min(2).max(500),
  maxResults: z.number().int().min(1).max(10).default(5)
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_request" });

  try {
    return res.status(200).json({ ok: true, ...(await searchWeb(parsed.data.query, parsed.data.maxResults)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "web_search_not_configured") {
      return res.status(503).json({ ok: false, error: "web_search_not_configured" });
    }
    console.error("MyJarvis web search error", error);
    return res.status(502).json({ ok: false, error: "web_search_provider_error" });
  }
}
