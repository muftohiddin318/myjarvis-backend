export type WebProviderStatus = "configured" | "not_configured";

export function webProviderStatus(): WebProviderStatus {
  return process.env.TAVILY_API_KEY ? "configured" : "not_configured";
}
