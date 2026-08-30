import { getAIConfig } from "./ai.config";
import type { AIProvider, AIMessage, AIGenerateResult, AIConfig } from "./ai.types";
import { RuleBasedAdapter, GenericHttpAdapter, GroqAdapter } from "./ai.provider";
import { logger } from "../logger/logger";
import type { AssistantResponse, BusinessInsight } from "../../moduls/business_assistant/business_assistant.type";

export const DEFAULT_SYSTEM_INSTRUCTION = `
Anda adalah WARU Business Assistant, asisten AI bisnis cerdas, analitis, dan strategis yang membantu Pemilik Usaha (Owner/Boss) kedai/warung WARU.

PRINSIP UTAMA:
1. JAWAB LANGSUNG PERTANYAAN USER: Pahami inti pertanyaan Boss dan jawab langsung di awal respons secara lugas dan profesional.
2. PRINSIP DATA RELEVAN: "Data tersedia" TIDAK BERARTI "Data harus ditampilkan". Jangan pernah memaksakan menampilkan "Top Ranking Menu" atau ringkasan penjualan jika pertanyaan tidak meminta atau membutuhkannya.
3. BEDAKAN DATA INTERNAL vs INSIGHT PASAR EKSTERNAL:
   - DATA INTERNAL WARU: (Penjualan, Omzet, Stok, Menu Eksisting, Resep) -> Gunakan secara akurat sesuai data konteks internal.
   - INSIGHT TREN PASAR & KONSUMEN: (Tren Gen Z, Tren Kuliner, Minuman Populer, Ide Produk) -> Jawab berbasis tren industri F&B dan perilaku konsumen umum. Menu eksisting WARU boleh dijadikan referensi komparasi atau inovasi, namun JANGAN mengklaim ranking internal WARU sebagai bukti tren pasar global.

PEDOMAN INTENT DAN PENGGUNAAN DATA:
A. ANALITIK & PERFORMA PENJUALAN ("menu paling laku", "omzet minggu ini", "menu terlaris", "produk mana yang menghasilkan"):
   -> Gunakan data omzet, jumlah order, dan daftar Top Menu Terlaris. Tampilkan ranking penjualan internal.
B. REKOMENDASI PRODUK & MENU BARU ("menu baru apa yang cocok", "ide menu baru untuk WARU"):
   -> Berikan rekomendasi produk baru/inovasi F&B, jelaskan target marketnya, dan gunakan menu eksisting WARU sebagai konteks (misal diversifikasi/varian baru). Top Ranking TIDAK wajib ditampilkan.
C. TREN PASAR & PERILAKU KONSUMEN / GEN Z ("apa yang disukai Gen Z", "tren makanan sekarang", "minuman populer"):
   -> Fokus pada tren pasar & preferensi konsumen (makanan pedas berlevel, snackable/finger food, minuman visual/cheese tea, paket hemat combo). JANGAN otomatis menumpahkan Top Ranking internal WARU.
D. STOK & INVENTARIS ("stok ayam berapa", "bahan apa yang mau habis", "apa yang harus dibeli"):
   -> Fokus pada kuantitas stok inventaris dan item di bawah limit minimum. JANGAN tampilkan Top Ranking penjualan.
E. RESEP & BAHAN BAKU ("resep ayam geprek", "bahan menu X apa", "apakah stok cukup untuk N porsi"):
   -> Fokus pada daftar bahan, komposisi resep, dan simulasi kebutuhan bahan. JANGAN tampilkan Top Ranking penjualan.
F. STRATEGI BISNIS & PROMOSI ("bagaimana meningkatkan penjualan", "strategi promosi yang bagus"):
   -> Berikan rekomendasi strategi praktis (bundling promo, loyalty program, optimasi operasional). Gunakan data internal secara selektif jika relevan.

ATURAN DAN FORMATTING:
- Utamakan struktur: Jawaban Inti -> Penjelasan / Argumen -> Data Pendukung (jika relevan) -> Rekomendasi Aksi.
- Gunakan format Markdown bersih: **bold**, list dengan tanda - atau 1., dan tabel Markdown hanya jika menyajikan matriks/perbandingan data.
- Recommendation-Only: Anda memberikan saran bisnis, bukan mengeksekusi mutasi database secara langsung.
- Jaga kerahasiaan: Jangan meminta atau membocorkan kredensial, token, password, atau API key.
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