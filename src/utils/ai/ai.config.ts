import type { AIConfig, AIProviderType } from "./ai.types";

export function getAIConfig(): AIConfig {
  const providerRaw = (process.env.AI_PROVIDER || "rule-based").toLowerCase();
  let provider: AIProviderType = "rule-based";

  if (providerRaw === "generic-http") {
    provider = "generic-http";
  } else if (providerRaw === "groq") {
    provider = "groq";
  } else if (providerRaw === "custom") {
    provider = "custom";
  }

  const timeoutMsParsed = parseInt(process.env.AI_TIMEOUT_MS || "10000", 10);
  const timeoutMs = isNaN(timeoutMsParsed) || timeoutMsParsed <= 0 ? 10000 : timeoutMsParsed;

  const maxHistoryParsed = parseInt(process.env.AI_MAX_HISTORY || "6", 10);
  const maxHistoryMessages = isNaN(maxHistoryParsed) || maxHistoryParsed <= 0 ? 6 : maxHistoryParsed;

  return {
    provider,
    apiKey: process.env.GROQ_API_KEY || process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || "openai/gpt-oss-120b",
    baseUrl: process.env.AI_BASE_URL || "",
    timeoutMs,
    maxHistoryMessages,
  };
}