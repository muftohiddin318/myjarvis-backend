type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatInput = {
  message: string;
  conversationId?: string;
  language: string;
  history?: ChatMessage[];
  userContext?: string;
};

type ProviderResult = {
  message: string;
  model: string;
};

const SYSTEM_PROMPT = `You are MyJarvis, a serious personal AI assistant.

You are one unified assistant across web, voice, Telegram and future interfaces. Be useful across study, IELTS preparation, work, research, planning, technology and everyday tasks.

Behavior:
- Be accurate and honest. Never invent current facts, tool results, personal data or completed actions.
- If current information is required and web tools are not available, say that clearly instead of pretending to have searched.
- Use the user's provided context when relevant, but do not claim to remember information that was not provided.
- Prefer practical, structured answers and clear next steps.
- Match the user's requested language. English is the default; Uzbek is supported.
- When a request is ambiguous, ask a concise clarification only when necessary.
- Never claim an external action was completed unless a connected tool actually returned success.
- Treat this response layer as the reasoning/communication core; tools and external actions will be connected through the tool engine.`;

const PROVIDER_TIMEOUT_MS = 25_000;

async function withTimeout<T>(promise: Promise<T>, ms = PROVIDER_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("provider_timeout")), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildMessages(input: ChatInput): ChatMessage[] {
  const history = (input.history ?? [])
    .filter(item => ["user", "assistant", "system"].includes(item.role))
    .filter(item => typeof item.content === "string" && item.content.trim())
    .slice(-20);

  const context = input.userContext?.trim()
    ? `\nRelevant user context:\n${input.userContext.trim()}`
    : "";

  const languageInstruction = input.language && input.language !== "en"
    ? `\nRespond in ${input.language}.`
    : "";

  return [
    { role: "system", content: SYSTEM_PROMPT + languageInstruction + context },
    ...history,
    { role: "user", content: input.message }
  ];
}

function compactMessages(messages: ChatMessage[]) {
  return messages.map(({ role, content }) => ({ role, content }));
}

async function callGemini(messages: ChatMessage[]): Promise<ProviderResult> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({ model: modelName });

  const system = messages.find(m => m.role === "system")?.content ?? SYSTEM_PROMPT;
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  const result = await withTimeout(
    model.generateContent({
      systemInstruction: system,
      contents
    } as Parameters<typeof model.generateContent>[0])
  );

  const text = result.response.text();
  if (!text.trim()) throw new Error("gemini_empty_response");
  return { message: text, model: modelName };
}

async function callOpenAICompatible(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  headers: Record<string, string> = {}
): Promise<ProviderResult> {
  const response = await withTimeout(fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify({
      model,
      messages: compactMessages(messages),
      temperature: 0.2
    })
  }));

  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error("provider_empty_response");
  return { message: text, model };
}

async function callGroq(messages: ChatMessage[]): Promise<ProviderResult> {
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  return callOpenAICompatible(
    "https://api.groq.com/openai/v1/chat/completions",
    process.env.GROQ_API_KEY!,
    model,
    messages
  );
}

async function callOpenRouter(messages: ChatMessage[]): Promise<ProviderResult> {
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  return callOpenAICompatible(
    "https://openrouter.ai/api/v1/chat/completions",
    process.env.OPENROUTER_API_KEY!,
    model,
    messages,
    {
      "HTTP-Referer": "https://myjarvis-backend.vercel.app",
      "X-Title": "MyJarvis"
    }
  );
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

  const messages = buildMessages(input);
  const failures: string[] = [];

  for (const provider of providers) {
    try {
      let result: ProviderResult;
      if (provider === "gemini") result = await callGemini(messages);
      else if (provider === "groq") result = await callGroq(messages);
      else result = await callOpenRouter(messages);

      return {
        ok: true,
        provider,
        model: result.model,
        message: result.message,
        conversationId: input.conversationId ?? null,
        meta: {
          providersAttempted: failures.length + 1,
          fallbackUsed: failures.length > 0
        }
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`${provider}:${reason}`);
      console.error("Provider failed", { provider, error: reason });
    }
  }

  return {
    ok: false,
    provider: null,
    message: "All configured AI providers failed. Please try again shortly.",
    conversationId: input.conversationId ?? null,
    meta: { failures }
  };
}
