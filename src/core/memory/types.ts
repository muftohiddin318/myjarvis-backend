export type MemoryCategory = "preference" | "profile" | "goal" | "project" | "fact" | "workflow";
export type MemoryRecord = {
  id: string;
  userId: string;
  content: string;
  category: MemoryCategory;
  importance: number;
  source: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
};
