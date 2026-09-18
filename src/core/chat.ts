type ChatInput = {
  message: string;
  conversationId?: string;
  language: string;
};

type ProviderResult = {
  message: string;
  model: string;
};

async function callGemini(message: string): Promise<ProviderResult> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(message);
  return { message: result.response.text(), model: modelName };
}

async function callGroq(message: string): Promise<ProviderResult> {
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY!}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: message }],
      temperature: 0.2
    })
  });

  if (!response.ok) throw new Error(`groq_http_${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("groq_empty_response");
  return { message: text, model };
}

async function callOpenRouter(message: string): Promise<ProviderResult> {
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY!}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://myjarvis-backend.vercel.app",
      "X-Title": "MyJarvis"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: message }],
      temperature: 0.2
    })
  });

  if (!response.ok) throw new Error(`openrouter_http_${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("openrouter_empty_response");
  return { message: text, model };
}

export async function routeChat(input: ChatInput) {
  const providers = [
    process.env.GEMINI_API_KEY ? "gemini" : null,
    process.env.GROQ_API_KEY ? "groq" : null,
    process.env.OPENROUTER_API_KEY ? "openrouter" : null
  ].filter(Boolean) as string[];

  if (providers.length === 0) {
    return {
      ok: false,
      provider: null,
      message: "MyJarvis backend is online, but no AI provider is configured yet.",
      conversationId: input.conversationId ?? null
    };
  }

  const prompt = input.language && input.language !== "en"
    ? `Respond in ${input.language}.\n\n${input.message}`
    : input.message;

  for (const provider of providers) {
    try {
      let result: ProviderResult;
      if (provider === "gemini") result = await callGemini(prompt);
      else if (provider === "groq") result = await callGroq(prompt);
      else result = await callOpenRouter(prompt);

      return {
        ok: true,
        provider,
        model: result.model,
        message: result.message,
        conversationId: input.conversationId ?? null
      };
    } catch (error) {
      console.error("Provider failed", {
        provider,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    ok: false,
    provider: null,
    message: "All configured AI providers failed. Please try again shortly.",
    conversationId: input.conversationId ?? null
  };
}
