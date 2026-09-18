import { GoogleGenerativeAI } from "@google/generative-ai";

type ChatInput = {
  message: string;
  conversationId?: string;
  language: string;
};

export async function routeChat(input: ChatInput) {
  const providers = [
    process.env.GEMINI_API_KEY ? "gemini" : null,
    process.env.GROQ_API_KEY ? "groq" : null,
    process.env.OPENROUTER_API_KEY ? "openrouter" : null,
  ].filter(Boolean) as string[];

  if (providers.length === 0) {
    return {
      ok: false,
      provider: null,
      message: "MyJarvis backend is online, but no AI provider is configured yet.",
      conversationId: input.conversationId ?? null,
    };
  }

  for (const provider of providers) {
    try {
      if (provider === "gemini") {
        const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = client.getGenerativeModel({
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        });
        const result = await model.generateContent(input.message);

        return {
          ok: true,
          provider: "gemini",
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
          message: result.response.text(),
          conversationId: input.conversationId ?? null,
        };
      }

      throw new Error("provider_not_implemented");
    } catch (error) {
      console.error("Provider failed", { provider, error });
    }
  }

  throw new Error("all_configured_providers_failed");
}
