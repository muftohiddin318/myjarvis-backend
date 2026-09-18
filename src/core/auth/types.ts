export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  claims: Record<string, unknown>;
};

export type AuthConfig = {
  issuer?: string;
  audience?: string;
  jwksUrl?: string;
};
