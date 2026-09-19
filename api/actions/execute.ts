import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authConfigured, verifyBearerToken } from "../../src/core/auth/verify.js";
import { verifyApprovalToken } from "../../src/core/actions/approvalToken.js";
import { executeTool } from "../../src/core/tools/executor.js";

const Schema = z.object({
  approvalToken: z.string().min(20)
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_request" });

  try {
    const approval = verifyApprovalToken(parsed.data.approvalToken);

    if (authConfigured()) {
      const user = await verifyBearerToken(req.headers.authorization);
      if (approval.userId && approval.userId !== user.id) {
        return res.status(403).json({ error: "approval_owner_mismatch" });
      }
    }

    const result = await executeTool(
      approval.tool,
      approval.args,
      "medium"
    );

    if (!result.ok) {
      return res.status(result.requiresApproval ? 403 : 502).json(result);
    }

    return res.status(200).json({
      ok: true,
      approved: true,
      executed: true,
      result: result.result
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
