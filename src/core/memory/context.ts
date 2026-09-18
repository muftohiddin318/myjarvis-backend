import { listMemories } from "./store.js";

export function buildMemoryContext(userId: string) {
  const memories = listMemories(userId);
  if (!memories.length) return "";
  return memories.map(m => `[${m.category}; importance=${m.importance}] ${m.content}`).join("\n");
}
