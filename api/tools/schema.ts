import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getModelToolSchemas } from "../../src/core/tools/toolCalling.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    toolChoice: "auto",
    tools: getModelToolSchemas()
  });
}
