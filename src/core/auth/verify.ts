import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AuthConfig, AuthUser } from "./types.js";

export function getAuthConfig(): AuthConfig {
  return {
    issuer: process.env.AUTH_ISSUER,
    audience: process.env.AUTH_AUDIENCE,
    jwksUrl: process.env.AUTH_JWKS_URL
  };
}

export function authConfigured() {
  const c = getAuthConfig();
  return Boolean(c.issuer && c.audience && c.jwksUrl);
}

function bearerToken(value: string | undefined) {
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function verifyBearerToken(authorization?: string): Promise<AuthUser> {
  const token = bearerToken(authorization);
  if (!token) throw new Error("missing_bearer_token");

  const config = getAuthConfig();
  if (!config.issuer || !config.audience || !config.jwksUrl) {
    throw new Error("auth_not_configured");
  }

  const jwks = createRemoteJWKSet(new URL(config.jwksUrl));
  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.issuer,
    audience: config.audience
  });

  const id = typeof payload.sub === "string" ? payload.sub : null;
  if (!id) throw new Error("token_subject_missing");

  return {
    id,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    claims: payload as JWTPayload as Record<string, unknown>
  };
}
