import type { AIProvider, AIGenerateParams, AIGenerateResult } from "./ai.types";
import type { BusinessInsight } from "../../moduls/business_assistant/business_assistant.type";
import Groq from "groq-sdk";

/**
 * Adapter 1: Rule-Based Fallback Adapter
 * Provider fallback aman ketika API Key eksternal belum dikonfigurasi atau ketika HTTP request gagal.
 */
export class RuleBasedAdapter implements AIProvider {
  name = "rule-based";

  async generateResponse(params: AIGenerateParams): Promise<AIGenerateResult> {
    const { contextText, messages } = params;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const lower = lastUserMessage.toLowerCase();

    const insights: BusinessInsight[] = [];

    const wantsSales = lower.includes("penjualan") || lower.includes("revenue") || lower.includes("omzet") || lower.includes("pendapatan");
    const wantsInventory = lower.includes("stok") || lower.includes("inventory") || lower.includes("bahan");
    const wantsReview = lower.includes("review") || lower.includes("rating") || lower.includes("ulasan");
    const wantsMenu = lower.includes("menu") || lower.includes("makanan") || lower.includes("minuman") || lower.includes("terlaris");
    const wantsGeneral = !wantsSales && !wantsInventory && !wantsReview && !wantsMenu;

    // Parse values from contextText if present
    if (wantsSales || wantsGeneral) {
      insights.push({
        category: "sales",
        summary: "Analisis performa penjualan berdasarkan data terkini.",
        recommendations: [
          "Pantau terus rasio pembatalan order untuk memastikan kelancaran operasional dapur.",
          "Pertimbangkan promo bundling atau minimum belanja untuk meningkatkan rata-rata nilai order.",
        ],
      });
    }

    if (wantsInventory || wantsGeneral) {
      insights.push({
        category: "inventory",
        summary: "Evaluasi status stok dan inventaris toko.",
        recommendations: [
          "Lakukan pengecekan berkala pada item dengan stok mendekati limit minimum.",
          "Pastikan koordinasi tim dapur dan bagian pembelian bahan baku berjalan baik.",
        ],
      });
    }

    if (wantsReview || wantsGeneral) {
      insights.push({
        category: "review",
        summary: "Evaluasi kepuasan pelanggan dari reviu toko.",
        recommendations: [
          "Pertahankan kualitas pelayanan pada ulasan positif.",
          "Evaluasi masukan pelanggan pada ulasan berating rendah untuk perbaikan menu dan layanan.",
        ],
      });
    }

    if (wantsMenu || wantsGeneral) {
      insights.push({
        category: "general",
        summary: "Analisis popularitas menu terlaris.",
        recommendations: [
          "Pastikan ketersediaan bahan baku utama untuk top menu terlaris selalu tercukupi.",
        ],
      });
    }

    const text = `Saya menemukan ${insights.length} insight untuk bisnis Anda berdasarkan data analitik terkini.\n\n${contextText}`;

    return {
      text,
      insights,
      providerName: this.name,
    };
  }
}

/**
 * Adapter 2: Generic HTTP Provider Adapter
 * Adapter HTTP generic yang fleksibel untuk penyedia LLM/AI API eksternal (OpenAI-compatible / Gateway / Custom REST API).
 */
export class GenericHttpAdapter implements AIProvider {
  name = "generic-http";
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: { apiKey?: string; model?: string; baseUrl?: string; timeoutMs?: number }) {
    this.apiKey = options.apiKey || "";
    this.model = options.model || "generic-v1";
    this.baseUrl = options.baseUrl || "";
    this.timeoutMs = options.timeoutMs || 10000;
  }

  async generateResponse(params: AIGenerateParams): Promise<AIGenerateResult> {
    if (!this.baseUrl) {
      throw new Error("AI_BASE_URL belum dikonfigurasi.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const promptMessages = [
        { role: "system", content: `${params.systemInstruction}\n\n${params.contextText}` },
        ...params.messages,
      ];

      const requestBody = {
        model: this.model,
        messages: promptMessages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 1000,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI Gateway HTTP Error ${response.status}: ${response.statusText}`);
      }

      const json = (await response.json()) as any;

      // Extract response text defensively
      let rawText = "";
      if (typeof json.choices?.[0]?.message?.content === "string") {
        rawText = json.choices[0].message.content;
      } else if (typeof json.output === "string") {
        rawText = json.output;
      } else if (typeof json.text === "string") {
        rawText = json.text;
      } else {
        rawText = JSON.stringify(json);
      }

      // Try parsing structured JSON insights if present in output
      let insights: BusinessInsight[] | undefined = undefined;
      try {
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
        if (jsonMatch && (jsonMatch[1] || jsonMatch[0])) {
          const targetJson = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(targetJson);
          if (Array.isArray(parsed.insights)) {
            insights = parsed.insights;
          }
        }
      } catch {
        // Safe fallback: keep text response without insights array
      }

      return {
        text: rawText,
        insights,
        providerName: this.name,
        rawJson: json,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Adapter 3: Groq Provider Adapter
 * Menggunakan groq-sdk resmi untuk berinteraksi dengan API Groq.
 */
export class GroqAdapter implements AIProvider {
  name = "groq";
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(options: { apiKey?: string; model?: string; timeoutMs?: number }) {
    this.apiKey = options.apiKey || "";
    this.model = options.model || "openai/gpt-oss-120b";
    this.timeoutMs = options.timeoutMs || 10000;
  }

  async generateResponse(params: AIGenerateParams): Promise<AIGenerateResult> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY / AI_API_KEY tidak dikonfigurasi.");
    }

    const groq = new Groq({
      apiKey: this.apiKey,
    });

    const promptMessages = [
      { role: "system" as const, content: `${params.systemInstruction}\n\n${params.contextText}` },
      ...params.messages.map((m) => ({
        role: m.role === "system" ? ("system" as const) : m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
    ];

    const completion = await groq.chat.completions.create(
      {
        messages: promptMessages,
        model: this.model,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 1000,
      },
      {
        timeout: this.timeoutMs,
      }
    );

    const rawText = completion.choices?.[0]?.message?.content || "";

    // Parse structured JSON insights if present in output
    let insights: BusinessInsight[] | undefined = undefined;
    try {
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
      if (jsonMatch && (jsonMatch[1] || jsonMatch[0])) {
        const targetJson = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(targetJson);
        if (Array.isArray(parsed.insights)) {
          insights = parsed.insights;
        }
      }
    } catch {
      // Safe fallback
    }

    return {
      text: rawText,
      insights,
      providerName: this.name,
      rawJson: completion as any,
    };
  }
}