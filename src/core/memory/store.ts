import type { MemoryRecord } from "./types.js";

const memoryStore = new Map<string, MemoryRecord[]>();

export function listMemories(userId: string, limit = 20): MemoryRecord[] {
  return (memoryStore.get(userId) ?? [])
    .filter(m => !m.expiresAt || new Date(m.expiresAt).getTime() > Date.now())
    .sort((a,b) => b.importance - a.importance)
    .slice(0, limit);
}

export function addMemory(input: Omit<MemoryRecord, "id"|"createdAt"|"updatedAt">): MemoryRecord {
  const now = new Date().toISOString();
  const record: MemoryRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
  const existing = memoryStore.get(input.userId) ?? [];
  existing.push(record);
  memoryStore.set(input.userId, existing);
  return record;
}

export function forgetMemory(userId: string, id: string): boolean {
  const existing = memoryStore.get(userId) ?? [];
  const next = existing.filter(m => m.id !== id);
  memoryStore.set(userId, next);
  return next.length !== existing.length;
}
