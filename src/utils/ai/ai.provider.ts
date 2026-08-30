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

    // Helper to extract section from contextText
    const extractSection = (header: string, endHeader?: string): string => {
      const startIdx = contextText.indexOf(header);
      if (startIdx === -1) return "";
      const contentAfter = contextText.slice(startIdx + header.length);
      if (!endHeader) return contentAfter.trim();
      const endIdx = contentAfter.indexOf(endHeader);
      return (endIdx !== -1 ? contentAfter.slice(0, endIdx) : contentAfter).trim();
    };

    const salesSection = extractSection("[RINGKASAN PENJUALAN INTERNAL]", "[MENU TERLARIS DI WARU");
    const topMenuSection = extractSection("[MENU TERLARIS DI WARU (TOP 5)]", "[STATUS STOK & INVENTARIS]");
    const inventorySection = extractSection("[STATUS STOK & INVENTARIS]", "[RATING & KEPUASAN PELANGGAN]");
    const reviewSection = extractSection("[RATING & KEPUASAN PELANGGAN]", "====");
    const activeMenuSection = extractSection("[DAFTAR MENU AKTIF WARU]", "[RINGKASAN PENJUALAN");

    // 1. Intent Detection
    const isMarketTrend =
      lower.includes("gen z") ||
      lower.includes("tren") ||
      lower.includes("trend") ||
      lower.includes("anak muda") ||
      lower.includes("pasar") ||
      lower.includes("populer") ||
      lower.includes("lagi hits") ||
      lower.includes("disukai") ||
      lower.includes("kekinian");

    const isMenuRecommendation =
      !isMarketTrend &&
      (lower.includes("menu baru") ||
        lower.includes("ide menu") ||
        lower.includes("rekomendasi menu") ||
        lower.includes("tambah menu") ||
        lower.includes("ide produk") ||
        lower.includes("menu apa yang cocok"));

    const isInventory =
      lower.includes("stok") ||
      lower.includes("inventory") ||
      lower.includes("bahan") ||
      lower.includes("habis") ||
      lower.includes("gudang") ||
      lower.includes("beli");

    const isRecipe =
      lower.includes("resep") ||
      lower.includes("komposisi") ||
      lower.includes("takaran") ||
      lower.includes("bumbu") ||
      lower.includes("bahan ayam geprek") ||
      lower.includes("resep ayam");

    const isStrategy =
      lower.includes("strategi") ||
      lower.includes("meningkatkan") ||
      lower.includes("promosi") ||
      lower.includes("pelanggan") ||
      lower.includes("repeat order") ||
      lower.includes("omzet naik") ||
      lower.includes("cara agar") ||
      lower.includes("tips");

    const isSalesPerformance =
      !isStrategy &&
      (lower.includes("terlaris") ||
        lower.includes("paling laku") ||
        lower.includes("penjualan") ||
        lower.includes("omzet") ||
        lower.includes("revenue") ||
        lower.includes("ranking") ||
        lower.includes("laporan") ||
        lower.includes("turun"));

    let responseText = "";

    // 2. Context-Aware Response Generation
    if (isMarketTrend) {
      responseText = `Berikut adalah analisa tren pasar dan preferensi konsumen (khususnya segmen muda/Gen Z) dalam industri kuliner F&B saat ini:

### 1. Tren Kuliner Utama
- **Makanan Pedas Berlevel & Varian Sambal Artisan:** Menu dengan sensasi pedas gurih atau keju lumer sangat digemari karena memberikan pengalaman rasa yang eksploratif.
- **Snackable & Finger Foods:** Porsi praktis yang cocok untuk ngobrol atau sharing (misal: camilan gorengan krispi, kulit ayam renyah, tahu pedas).
- **Minuman Visual & Refreshing:** Teh rasa buah (*fruit-infused tea*), *cheese tea*, atau es susu gula aren yang estetik untuk media sosial.
- **Paket Hemat (Combo Meal):** Paket komplit (makanan utama + minuman + sambal ekstra) dengan harga bersahabat.

### 2. Peluang Inovasi untuk WARU
Dari menu eksisting yang ada di WARU, Anda tidak perlu merombak seluruh dapur. Opsi *quick win* yang sangat potensial:
- Menghadirkan **Ayam Geprek Sambal Matah / Keju Mozzarella** dengan pilihan level kepedasan.
- Menyediakan paket bundling hemat **Nasi Goreng + Minuman Segar**.`;

      insights.push({
        category: "general",
        summary: "Insight tren pasar dan preferensi kuliner Gen Z.",
        recommendations: [
          "Luncurkan inovasi varian level pedas pada menu utama (Ayam Geprek).",
          "Kembangkan minuman estetik berbiaya bahan rendah seperti Flavored Iced Tea.",
        ],
      });
    } else if (isMenuRecommendation) {
      responseText = `Berdasarkan lini produk kuliner WARU saat ini, berikut rekomendasi pengembangan menu baru yang strategis dan mudah dieksekusi:

### Rekomendasi Menu Baru Potensial:
1. **Ayam Geprek Sambal Korek / Matah Spesial:** Memperkaya varian menu utama tanpa menambah kompleksitas rantai pasok daging ayam.
2. **Nasi Goreng Kampung / Gila:** Memanfaatkan bahan dapur yang sudah ada untuk memperluas variasi menu makanan berat.
3. **Es Lemon Tea Selasih / Es Cincau Susu:** Minuman pendamping segar ber-margin keuntungan tinggi.
4. **Side Dish Krispi (Tahu Crispy / Kulit Krispi):** Tambahan *add-on* efektif untuk meningkatkan rata-rata nilai order (*average order value*).`;

      insights.push({
        category: "general",
        summary: "Rekomendasi penambahan varian menu ber-margin tinggi.",
        recommendations: [
          "Manfaatkan bahan baku utama yang sudah ada untuk diversifikasi rasa.",
          "Gunakan produk side-dish sebagai pendorong upselling di kasir.",
        ],
      });
    } else if (isRecipe) {
      responseText = `Berikut adalah panduan standar resep dan kebutuhan bahan baku untuk menu di WARU:

### Standar Bahan & Komposisi:
- **Daging & Unggas:** Daging ayam potong segar, bumbu marinasi (bawang putih, ketumbar, garam, merica).
- **Adonan & Tepung:** Tepung bumbu krispi berlapis renyah.
- **Sambal Signature:** Cabai rawit merah, bawang putih, garam, siraman minyak panas.
- **Nasi & Pelengkap:** Beras pulen, lalapan segar (timun/kubis).

*Catatan Operasional:* Pastikan takaran bahan baku terstandarisasi agar rasa konsisten dan pemakaian bahan sesuai sistem inventaris.`;

      insights.push({
        category: "inventory",
        summary: "Standarisasi resep dan konsumsi bahan baku.",
        recommendations: [
          "Pastikan tim dapur mencatat porsi bumbu sesuai SOP resep.",
        ],
      });
    } else if (isInventory) {
      responseText = `Berikut adalah ringkasan status stok dan ketersediaan bahan baku di inventaris WARU:

### Status Inventaris Terkini:
${inventorySection || "- Stok bahan utama dalam batas normal operasional."}

### Rekomendasi Pengadaan & Dapur:
1. Prioritaskan pembelian ulang (*reorder*) pada bahan baku yang mendekati batas minimum stok.
2. Koordinasikan dengan kasir jika ada menu yang bahannya menipis agar status ketersediaan di POS tetap akurat.`;

      insights.push({
        category: "inventory",
        summary: "Evaluasi ketersediaan stok inventaris dan bahan baku.",
        recommendations: [
          "Segera lakukan restock pada item yang berada di bawah limit minimum.",
          "Cek fisik gudang secara berkala untuk mencocokkan stok aktual.",
        ],
      });
    } else if (isStrategy) {
      responseText = `Berikut strategi bisnis praktis yang dapat diterapkan untuk meningkatkan penjualan dan omzet WARU:

### 1. Strategi Menu Bundling
Kombinasikan menu makanan berat dengan minuman segar dalam satu paket harga khusus (misal: Paket Hemat Ayam Geprek + Es Teh Manis). Ini terbukti efektif menaikkan nilai rata-rata belanja per pelanggan (*Average Order Value*).

### 2. Pemanfaatan Waktu Operasional (Happy Hour Promo)
Berikan promo potongan harga khusus pada jam-jam sepi (misal: pukul 14.00 - 16.30 WIB) untuk meratakan distribusi traffic harian.

### 3. Up-Selling di Meja Kasir
Latih staf kasir untuk menawarkan menu pelengkap (kerupuk, gorengan krispi, atau es ekstra) saat pelanggan melakukan pembayaran.`;

      insights.push({
        category: "sales",
        summary: "Strategi pertumbuhan penjualan dan efisiensi operasional.",
        recommendations: [
          "Buat program promo bundling minuman untuk mendongkrak omzet.",
          "Tingkatkan kecepatan pelayanan di dapur saat jam sibuk.",
        ],
      });
    } else if (isSalesPerformance) {
      responseText = `Berikut adalah data performa penjualan dan menu terlaris WARU berdasarkan transaksi terkini:

### Ringkasan Penjualan:
${salesSection || "- Data penjualan sedang diakumulasikan."}

### Peringkat Menu Terlaris (Top Ranking):
${topMenuSection || "- Belum ada data ranking menu."}

### Evaluasi Performa:
- Menu terlaris menjadi kontributor utama perputaran omzet. Pastikan ketersediaan bahan bakunya selalu terjaga.`;

      insights.push({
        category: "sales",
        summary: "Analisis performa omzet dan menu terlaris.",
        recommendations: [
          "Jaga konsistensi stok bahan untuk menu-menu peringkat atas.",
          "Optimalkan promosi pada jam-jam sibuk untuk mendorong omzet lebih tinggi.",
        ],
      });
    } else {
      responseText = `Halo! Saya adalah WARU Business Assistant. Saya siap membantu Anda menganalisis performa bisnis, mengevaluasi penjualan, mengontrol stok inventaris, serta memberikan rekomendasi strategi kuliner untuk kedai WARU Anda.

Silakan ajukan pertanyaan seputar:
- Performa penjualan dan menu terlaris
- Ketersediaan stok dan bahan baku
- Ide produk baru dan tren pasar kuliner
- Strategi peningkatan omzet dan promosi`;

      insights.push({
        category: "general",
        summary: "Asisten bisnis siap membantu operasional WARU.",
        recommendations: [
          "Tanyakan metrik spesifik untuk mendapatkan analisis yang terarah.",
        ],
      });
    }

    return {
      text: responseText,
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