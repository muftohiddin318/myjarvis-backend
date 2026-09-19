import { createHmac, timingSafeEqual } from "node:crypto";

type ApprovalPayload = {
  v: 1;
  tool: string;
  args: Record<string, unknown>;
  exp: number;
  nonce: string;
  userId?: string;
};

function secret() {
  const value = process.env.TELEGRAM_ACTION_SECRET;
  if (!value) throw new Error("action_secret_not_configured");
  return value;
}

function b64(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function unb64(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function createApprovalToken(args: {
  tool: string;
  toolArgs: Record<string, unknown>;
  userId?: string;
  ttlSeconds?: number;
}) {
  const payload: ApprovalPayload = {
    v: 1,
    tool: args.tool,
    args: args.toolArgs,
    exp: Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? 300),
    nonce: cryptoRandom()
  };
  if (args.userId) payload.userId = args.userId;

  const body = b64(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function cryptoRandom() {
  return Buffer.from(
    createHmac("sha256", secret())
      .update(`${Date.now()}:${Math.random()}`)
      .digest()
  ).toString("base64url");
}

export function verifyApprovalToken(token: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new Error("invalid_approval_token");

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("invalid_approval_token");
  }

  const payload = JSON.parse(unb64(body)) as ApprovalPayload;
  if (payload.v !== 1 || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("approval_token_expired");
  }

  return payload;
}
