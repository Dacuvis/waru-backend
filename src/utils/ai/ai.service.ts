import { getAIConfig } from "./ai.config";
import type { AIProvider, AIMessage, AIGenerateResult, AIConfig } from "./ai.types";
import { RuleBasedAdapter, GenericHttpAdapter, GroqAdapter } from "./ai.provider";
import { logger } from "../logger/logger";
import type { AssistantResponse, BusinessInsight } from "../../moduls/business_assistant/business_assistant.type";

export const DEFAULT_SYSTEM_INSTRUCTION = `
Anda adalah Waru Business Assistant, asisten AI bisnis cerdas yang membantu pemilik usaha (Owner/Boss) memahami kondisi operasional dan memberikan insight serta rekomendasi bisnis berdasarkan data analitik terkini yang diberikan.

ATURAN DAN BATASAN PENTING:
1. Hanya gunakan data konteks bisnis yang diberikan. Jangan mengarang angka, omzet, atau metrik yang tidak ada di konteks.
2. Jika data tertentu tidak tersedia di konteks, nyatakan secara jujur bahwa data tersebut tidak tersedia.
3. Anda HANYA memberikan rekomendasi dan analisis (Recommendation-Only). Anda TIDAK memiliki akses dan TIDAK BOLEH mengklaim telah melakukan mutasi/perubahan pada database (misal merubah harga, mengubah stok, atau memproses pembayaran).
4. Keputusan bisnis akhir tetap sepenuhnya berada di tangan Pemilik Usaha (Owner).
5. Jangan pernah meminta, menampilkan, atau membocorkan data sensitif seperti password, kunci rahasia, token, atau kredensial internal.
6. Berikan respon yang ramah, profesional, ringkas, dan actionable.
`.trim();

export class AIService {
  private config: AIConfig;
  private provider: AIProvider;
  private fallbackProvider: AIProvider;

  constructor(customProvider?: AIProvider, customConfig?: AIConfig) {
    this.config = customConfig || getAIConfig();
    this.fallbackProvider = new RuleBasedAdapter();

    if (customProvider) {
      this.provider = customProvider;
    } else if (this.config.provider === "groq" && this.config.apiKey) {
      this.provider = new GroqAdapter({
        apiKey: this.config.apiKey,
        model: this.config.model,
        timeoutMs: this.config.timeoutMs,
      });
    } else if (this.config.provider === "generic-http" && this.config.baseUrl) {
      this.provider = new GenericHttpAdapter({
        apiKey: this.config.apiKey,
        model: this.config.model,
        baseUrl: this.config.baseUrl,
        timeoutMs: this.config.timeoutMs,
      });
    } else {
      // Safe fallback when no external provider/baseUrl is configured
      this.provider = this.fallbackProvider;
    }
  }

  async processChat(
    contextText: string,
    historyMessages: Array<{ role: "user" | "assistant"; content: string }>,
    userMessage: string,
  ): Promise<AssistantResponse> {
    // Truncate history to max configured limit
    const maxHistory = this.config.maxHistoryMessages;
    const truncatedHistory = historyMessages.slice(-maxHistory);

    const formattedMessages: AIMessage[] = [
      ...truncatedHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    try {
      logger.info(
        { provider: this.provider.name, messageCount: formattedMessages.length },
        "Mengirim request ke AI Provider",
      );

      const result = await this.provider.generateResponse({
        systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
        contextText,
        messages: formattedMessages,
      });

      return this.normalizeResult(result);
    } catch (err: any) {
      logger.warn(
        { provider: this.provider.name, err: err?.message || err },
        "Gagal memproses request ke AI Provider eksternal. Menggunakan fallback rule-based.",
      );

      // Safe fallback to RuleBasedAdapter on external provider error / timeout
      try {
        const fallbackResult = await this.fallbackProvider.generateResponse({
          systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
          contextText,
          messages: formattedMessages,
        });
        return this.normalizeResult(fallbackResult);
      } catch (fallbackErr) {
        logger.error({ fallbackErr }, "Fallback AI engine error");
        return {
          message: "Maaf, terjadi kendala saat menganalisis data bisnis Anda. Silakan coba beberapa saat lagi.",
          insights: [],
        };
      }
    }
  }

  private normalizeResult(result: AIGenerateResult): AssistantResponse {
    const rawText = result.text || "Terima kasih. Berikut hasil analisis bisnis Anda.";

    // Validate structured insights if provided
    const validInsights: BusinessInsight[] = [];
    if (Array.isArray(result.insights)) {
      for (const item of result.insights) {
        if (item && typeof item.category === "string" && typeof item.summary === "string" && Array.isArray(item.recommendations)) {
          validInsights.push({
            category: item.category,
            summary: item.summary,
            recommendations: item.recommendations.map(String),
            data: typeof item.data === "object" && item.data !== null ? item.data : undefined,
          });
        }
      }
    }

    return {
      message: rawText,
      insights: validInsights.length > 0 ? validInsights : undefined,
    };
  }
}