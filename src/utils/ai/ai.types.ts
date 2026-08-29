import type { BusinessInsight } from "../../moduls/business_assistant/business_assistant.type";

export type AIProviderType = "rule-based" | "generic-http" | "groq" | "custom";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIBusinessContext {
  salesSummary: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  inventorySummary: {
    totalItems: number;
    lowStockCount: number;
    totalInventoryValue: number;
  };
  reviewSummary: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<string, number>;
  };
  topMenuItems: Array<{
    name: string;
    totalSold: number;
    totalRevenue: number;
  }>;
  periodDescription: string;
}

export interface AIGenerateParams {
  systemInstruction: string;
  contextText: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AIGenerateResult {
  text: string;
  insights?: BusinessInsight[];
  providerName: string;
  rawJson?: Record<string, unknown>;
}

export interface AIProvider {
  name: string;
  generateResponse(params: AIGenerateParams): Promise<AIGenerateResult>;
}

export interface AIConfig {
  provider: AIProviderType;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs: number;
  maxHistoryMessages: number;
}