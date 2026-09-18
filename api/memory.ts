import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { verifyBearerToken } from "../src/core/auth/verify.js";
import { addMemory, listMemories, forgetMemory } from "../src/core/memory/store.js";

const CreateSchema = z.object({
  content: z.string().min(1).max(2000),
  category: z.enum(["preference","profile","goal","project","fact","workflow"]),
  importance: z.number().int().min(1).max(10).default(5),
  source: z.string().max(100).default("user"),
  expiresAt: z.string().datetime().optional()
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user;
  try { user = await verifyBearerToken(req.headers.authorization); }
  catch (error) {
    const code = error instanceof Error ? error.message : String(error);
    return res.status(code === "auth_not_configured" ? 503 : 401).json({ ok:false, error: code === "auth_not_configured" ? "auth_not_configured" : "unauthorized" });
  }

  if (req.method === "GET") return res.status(200).json({ok:true, memories:listMemories(user.id)});
  if (req.method === "POST") {
    const parsed=CreateSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({ok:false,error:"invalid_request"});
    return res.status(201).json({ok:true,memory:addMemory({...parsed.data,userId:user.id})});
  }
  if (req.method === "DELETE") {
    const id=typeof req.query.id==="string"?req.query.id:"";
    if(!id) return res.status(400).json({ok:false,error:"memory_id_required"});
    return res.status(200).json({ok:true,deleted:forgetMemory(user.id,id)});
  }
  res.setHeader("Allow","GET, POST, DELETE");
  return res.status(405).json({error:"method_not_allowed"});
}
