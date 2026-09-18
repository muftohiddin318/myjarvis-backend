import { executeTool } from "./tools/executor.js";
import { getModelToolSchemas } from "./tools/toolCalling.js";

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
  userId?: string;
};

type NormalizedToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

type AgentTurn = {
  message: string;
  toolCalls: NormalizedToolCall[];
  provider: string;
  model: string;
  providerState: unknown;
};

const SYSTEM_PROMPT = `You are MyJarvis, a serious personal AI assistant.

You are one unified assistant across web, voice, Telegram and future interfaces. Be useful across study, IELTS preparation, work, research, planning, technology and everyday tasks.

Behavior:
- Be accurate and honest. Never invent current facts, tool results, personal data or completed actions.
- Use tools when they are appropriate and available. Never claim a tool was used when it was not.
- Only use the registered tools supplied to you.
- Current information that requires web access must not be fabricated; web tools will be added separately.
- Use the user's provided context when relevant, but do not treat untrusted client context as verified personal data.
- Prefer practical, structured answers and clear next steps.
- Match the user's requested language. English is the default; Uzbek is supported.
- Ask a concise clarification only when necessary.
- External actions and higher-risk tools require approval; never bypass the permission system.
- You may use multiple safe tools when needed, but avoid unnecessary tool calls.`;

const PROVIDER_TIMEOUT_MS = 25_000;
const MAX_AGENT_STEPS = 5;
const MODEL_TOOLS = getModelToolSchemas();

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
    ? `\nRelevant user context (untrusted conversational context):\n${input.userContext.trim()}`
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

function openAITools() {
  return MODEL_TOOLS;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return {};
}

async function callOpenAICompatibleTurn(
  url: string,
  apiKey: string,
  model: string,
  messages: Array<Record<string, unknown>>,
  headers: Record<string, string> = {}
): Promise<AgentTurn> {
  const response = await withTimeout(fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      tools: openAITools(),
      tool_choice: "auto"
    })
  }));

  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }>;
      };
    }>;
  };

  const message = data.choices?.[0]?.message;
  if (!message) throw new Error("provider_empty_response");

  const toolCalls = (message.tool_calls ?? [])
    .filter(call => call.function?.name)
    .map((call, index) => ({
      id: call.id || `tool_${index + 1}`,
      name: call.function!.name!,
      arguments: parseJsonObject(call.function?.arguments)
    }));

  return {
    message: message.content?.trim() || "",
    toolCalls,
    provider: url.includes("groq") ? "groq" : "openrouter",
    model,
    providerState: message
  };
}

async function callGeminiTurn(
  modelName: string,
  messages: ChatMessage[],
  priorContents?: unknown[]
): Promise<AgentTurn> {
  const key = process.env.GEMINI_API_KEY!;
  const system = messages.find(m => m.role === "system")?.content ?? SYSTEM_PROMPT;
  const baseContents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  const contents = priorContents?.length ? priorContents : baseContents;
  const functionDeclarations = MODEL_TOOLS.map(tool => ({
    name: (tool as any).function.name,
    description: (tool as any).function.description,
    parameters: (tool as any).function.parameters
  }));

  const response = await withTimeout(fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        tools: [{ functionDeclarations }]
      })
    }
  ));

  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<any> } }>;
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const toolCalls: NormalizedToolCall[] = parts
    .filter(part => part.functionCall?.name)
    .map((part, index) => ({
      id: `gemini_tool_${index + 1}`,
      name: part.functionCall.name,
      arguments: parseJsonObject(part.functionCall.args)
    }));
  const message = parts.filter(part => typeof part.text === "string").map(part => part.text).join("\n").trim();

  return {
    message,
    toolCalls,
    provider: "gemini",
    model: modelName,
    providerState: data.candidates?.[0]?.content ?? { parts }
  };
}

async function runAgent(input: ChatInput, provider: string, model: string): Promise<{ result: AgentTurn; steps: number }> {
  const baseMessages = buildMessages(input);
  let steps = 0;
  let totalToolCalls = 0;

  if (provider === "gemini") {
    let contents: any[] | undefined;
    let turn = await callGeminiTurn(model, baseMessages);
    while (turn.toolCalls.length && steps < MAX_AGENT_STEPS) {
      steps++;
      const functionResponses = [];
      for (const call of turn.toolCalls.slice(0, 3)) {
        totalToolCalls++;
        if (totalToolCalls > 10) throw new Error("tool_call_limit");
        const executed = await executeTool(call.name, call.arguments, "read");
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: executed.ok ? { ok: true, result: executed.result } : { ok: false, error: executed.error }
          }
        });
      }
      const previous = turn.providerState as any;
      contents = [
        ...(contents ?? baseMessages.filter(m => m.role !== "system").map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }))),
        { role: "model", parts: previous.parts ?? [] },
        { role: "user", parts: functionResponses }
      ];
      turn = await callGeminiTurn(model, baseMessages, contents);
    }
    if (turn.toolCalls.length) throw new Error("agent_step_limit");
    return { result: turn, steps };
  }

  const messages: Array<Record<string, unknown>> = [
    ...baseMessages.map(m => ({ role: m.role, content: m.content }))
  ];

  let turn = await callOpenAICompatibleTurn(
    provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions",
    provider === "groq" ? process.env.GROQ_API_KEY! : process.env.OPENROUTER_API_KEY!,
    model,
    messages,
    provider === "openrouter"
      ? { "HTTP-Referer": "https://myjarvis-backend.vercel.app", "X-Title": "MyJarvis" }
      : {}
  );

  while (turn.toolCalls.length && steps < MAX_AGENT_STEPS) {
    steps++;
    messages.push({
      role: "assistant",
      content: turn.message || null,
      tool_calls: turn.toolCalls.map(call => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.arguments) }
      }))
    });

    for (const call of turn.toolCalls.slice(0, 3)) {
      totalToolCalls++;
      if (totalToolCalls > 10) throw new Error("tool_call_limit");
      const executed = await executeTool(call.name, call.arguments, "read");
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.name,
        content: JSON.stringify(executed.ok
          ? { ok: true, result: executed.result }
          : { ok: false, error: executed.error })
      });
    }

    turn = await callOpenAICompatibleTurn(
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://openrouter.ai/api/v1/chat/completions",
      provider === "groq" ? process.env.GROQ_API_KEY! : process.env.OPENROUTER_API_KEY!,
      model,
      messages,
      provider === "openrouter"
        ? { "HTTP-Referer": "https://myjarvis-backend.vercel.app", "X-Title": "MyJarvis" }
        : {}
    );
  }

  if (turn.toolCalls.length) throw new Error("agent_step_limit");
  return { result: turn, steps };
}

export async function routeChat(input: ChatInput) {
  const providers = [
    process.env.GEMINI_API_KEY ? "gemini" : null,
    process.env.GROQ_API_KEY ? "groq" : null,
    process.env.OPENROUTER_API_KEY ? "openrouter" : null
  ].filter(Boolean) as string[];

  if (!providers.length) {
    return {
      ok: false,
      provider: null,
      message: "MyJarvis backend is online, but no AI provider is configured yet.",
      conversationId: input.conversationId ?? null
    };
  }

  const failures: string[] = [];

  for (const provider of providers) {
    const model = provider === "gemini"
      ? process.env.GEMINI_MODEL || "gemini-2.5-flash"
      : provider === "groq"
        ? process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
        : process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    try {
      const { result, steps } = await runAgent(input, provider, model);
      return {
        ok: true,
        provider,
        model,
        message: result.message || "Tool execution completed.",
        conversationId: input.conversationId ?? null,
        meta: {
          providersAttempted: failures.length + 1,
          fallbackUsed: failures.length > 0,
          agentSteps: steps
        }
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`${provider}:${reason}`);
      console.error("Provider/agent failed", { provider, error: reason });
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