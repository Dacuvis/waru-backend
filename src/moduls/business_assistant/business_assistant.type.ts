import type { ObjectId } from "mongodb";

export type AssistantMessageRole = "user" | "assistant";
export type InsightCategory =
  | "sales"
  | "inventory"
  | "promo"
  | "review"
  | "general";

export interface AssistantMessage {
  role: AssistantMessageRole;
  content: string;
  timestamp: Date;
  insights?: BusinessInsight[];
}

export interface AssistantSession {
  _id?: ObjectId;
  userId?: string;
  bossId?: string;
  title: string;
  messages: AssistantMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionRequest {
  title?: string;
  message: string;   // pesan awal dari user
}

export interface SendMessageRequest {
  message: string;
}

// Response dari assistant (insight bisnis)
export interface BusinessInsight {
  category: InsightCategory;
  summary: string;
  recommendations: string[];
  data?: Record<string, unknown>;
}

export interface AssistantResponse {
  message: string;
  insights?: BusinessInsight[];
}