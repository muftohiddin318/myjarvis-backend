import type { VercelRequest, VercelResponse } from "@vercel/node";
import { executeTool } from "../src/core/tools/executor.js";
import { listTools } from "../src/core/tools/registry.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, tools: listTools() });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const body = req.body as { name?: string; args?: unknown };
  if (!body?.name) return res.status(400).json({ error: "tool_name_required" });

  // Until authenticated user/session context exists, this public endpoint may
  // execute read-only tools only. The client cannot elevate its own risk level.
  const result = await executeTool(body.name, body.args ?? {}, "read");

  return res
    .status(result.ok ? 200 : result.requiresApproval ? 403 : 400)
    .json(result);
}