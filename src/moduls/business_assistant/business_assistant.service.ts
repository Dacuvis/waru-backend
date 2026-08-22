import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { BusinessAssistantModel } from "./business_assistant.model";
import { AnalyticsModel } from "../analytics/analytics.model";
import type {
  CreateSessionRequest,
  SendMessageRequest,
  AssistantResponse,
  BusinessInsight,
} from "./business_assistant.type";

/**
 * Engine insight berbasis aturan (rule-based).
 * Menganalisis data dari analytics dan menghasilkan rekomendasi bisnis.
 * Dapat digantikan dengan integrasi LLM di masa mendatang.
 */
async function generateInsights(
  message: string,
  analyticsModel: AnalyticsModel,
): Promise<AssistantResponse> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const lowerMsg = message.toLowerCase();
  const insights: BusinessInsight[] = [];

  // Tentukan topik dari pesan user
  const wantsSales =
    lowerMsg.includes("penjualan") ||
    lowerMsg.includes("revenue") ||
    lowerMsg.includes("omzet") ||
    lowerMsg.includes("pendapatan");

  const wantsInventory =
    lowerMsg.includes("stok") ||
    lowerMsg.includes("inventory") ||
    lowerMsg.includes("bahan");

  const wantsReview =
    lowerMsg.includes("review") ||
    lowerMsg.includes("rating") ||
    lowerMsg.includes("ulasan");

  const wantsMenu =
    lowerMsg.includes("menu") ||
    lowerMsg.includes("makanan") ||
    lowerMsg.includes("minuman") ||
    lowerMsg.includes("terlaris");

  const wantsGeneral =
    !wantsSales && !wantsInventory && !wantsReview && !wantsMenu;

  try {
    // ── Sales Insight ──────────────────────────────────────────────────────
    if (wantsSales || wantsGeneral) {
      const sales = await analyticsModel.getSalesOverview(weekAgo, endOfDay);
      const recommendations: string[] = [];

      if (sales.cancelledOrders > sales.completedOrders * 0.2) {
        recommendations.push(
          "Tingkat pembatalan order cukup tinggi (>20%). Periksa proses kitchen dan waktu tunggu.",
        );
      }
      if (sales.averageOrderValue < 50000) {
        recommendations.push(
          "Rata-rata nilai order masih rendah. Pertimbangkan bundle menu atau promo minimum order.",
        );
      }
      if (sales.totalOrders === 0) {
        recommendations.push("Belum ada order minggu ini. Coba aktifkan promo untuk menarik pelanggan.");
      } else {
        recommendations.push(
          `Total ${sales.completedOrders} order selesai minggu ini dengan pendapatan Rp ${sales.totalRevenue.toLocaleString("id-ID")}.`,
        );
      }

      insights.push({
        category: "sales",
        summary: `Minggu ini: ${sales.totalOrders} order, pendapatan Rp ${sales.totalRevenue.toLocaleString("id-ID")}, rata-rata Rp ${Math.round(sales.averageOrderValue).toLocaleString("id-ID")} per order.`,
        recommendations,
        data: sales as any,
      });
    }

    // ── Inventory Insight ──────────────────────────────────────────────────
    if (wantsInventory || wantsGeneral) {
      const inv = await analyticsModel.getInventorySummary();
      const recommendations: string[] = [];

      if (inv.lowStockCount > 0) {
        recommendations.push(
          `Ada ${inv.lowStockCount} item dengan stok di bawah minimum. Segera lakukan restock.`,
        );
      } else {
        recommendations.push("Semua stok inventory dalam kondisi aman.");
      }
      recommendations.push(
        `Total nilai inventory saat ini Rp ${inv.totalInventoryValue.toLocaleString("id-ID")}.`,
      );

      insights.push({
        category: "inventory",
        summary: `${inv.totalItems} item inventory, ${inv.lowStockCount} di bawah stok minimum.`,
        recommendations,
        data: inv as any,
      });
    }

    // ── Review Insight ─────────────────────────────────────────────────────
    if (wantsReview || wantsGeneral) {
      const rev = await analyticsModel.getReviewSummary();
      const recommendations: string[] = [];

      if (rev.averageRating >= 4.5) {
        recommendations.push("Rating sangat bagus! Pertahankan kualitas pelayanan.");
      } else if (rev.averageRating >= 3.5) {
        recommendations.push("Rating cukup baik. Fokus pada pengurangan review bintang 1-2.");
      } else if (rev.averageRating > 0) {
        recommendations.push(
          "Rating perlu ditingkatkan. Lakukan evaluasi menu dan pelayanan.",
        );
      } else {
        recommendations.push("Belum ada review yang dipublikasikan.");
      }

      insights.push({
        category: "review",
        summary: `Rating rata-rata: ${rev.averageRating}/5 dari ${rev.totalReviews} review.`,
        recommendations,
        data: rev as any,
      });
    }

    // ── Top Menu Insight ───────────────────────────────────────────────────
    if (wantsMenu || wantsGeneral) {
      const topMenu = await analyticsModel.getTopMenuItems(weekAgo, endOfDay, 5);
      const recommendations: string[] = [];

      if (topMenu.length > 0) {
        const top = topMenu[0] as any;
        recommendations.push(
          `Menu terlaris: "${top.name}" dengan ${top.totalSold} porsi terjual minggu ini.`,
        );
        recommendations.push(
          "Pastikan stok bahan baku untuk menu terlaris selalu tersedia.",
        );
      } else {
        recommendations.push("Belum ada data penjualan menu minggu ini.");
      }

      insights.push({
        category: "general",
        summary: `Top ${topMenu.length} menu terlaris minggu ini.`,
        recommendations,
        data: { topMenu } as any,
      });
    }
  } catch (err) {
    logger.warn({ err }, "Gagal mengambil data analytics untuk insight");
  }

  const responseMessage =
    insights.length > 0
      ? `Saya menemukan ${insights.length} insight untuk bisnis Anda berdasarkan data terkini.`
      : "Maaf, saya tidak dapat menganalisis data saat ini. Pastikan data orders dan inventory sudah tersedia.";

  return { message: responseMessage, insights };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class BusinessAssistantService {
  private model = new BusinessAssistantModel();
  private analyticsModel = new AnalyticsModel();

  async getSessions(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil sesi business assistant");

    const { data, total } = await this.model.getSessions(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getSessionById(id: string) {
    const session = await this.model.getSessionById(id);
    if (!session) throw new AppError(`Sesi dengan id ${id} tidak ditemukan`, 404, "E30");
    logger.info({ sessionId: id }, "Mengambil sesi by id");
    return session;
  }

  async createSession(data: CreateSessionRequest) {
    const now = new Date();

    // Generate insight berdasarkan pesan awal
    const assistantResponse = await generateInsights(data.message, this.analyticsModel);

    const session = {
      title: data.title ?? `Sesi ${now.toLocaleDateString("id-ID")}`,
      messages: [
        { role: "user" as const, content: data.message, timestamp: now },
        {
          role: "assistant" as const,
          content: assistantResponse.message,
          timestamp: new Date(),
          insights: assistantResponse.insights,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.model.createSession(session as any);
    logger.info({ sessionId: result.insertedId }, "Sesi business assistant dibuat");

    return {
      sessionId: result.insertedId,
      title: session.title,
      response: assistantResponse,
    };
  }

  async sendMessage(id: string, data: SendMessageRequest) {
    const session = await this.model.getSessionById(id);
    if (!session) throw new AppError(`Sesi dengan id ${id} tidak ditemukan`, 404, "E30");

    const now = new Date();

    // Simpan pesan user
    await this.model.addMessage(id, {
      role: "user",
      content: data.message,
      timestamp: now,
    });

    // Generate insight & simpan balasan assistant
    const assistantResponse = await generateInsights(data.message, this.analyticsModel);
    await this.model.addMessage(id, {
      role: "assistant",
      content: assistantResponse.message,
      timestamp: new Date(),
      insights: assistantResponse.insights,
    });

    logger.info({ sessionId: id }, "Pesan dikirim ke business assistant");
    return assistantResponse;
  }

  async deleteSession(id: string) {
    const session = await this.model.getSessionById(id);
    if (!session) throw new AppError(`Sesi dengan id ${id} tidak ditemukan`, 404, "E30");

    const deleted = await this.model.deleteSession(id);
    logger.info({ sessionId: id }, "Sesi business assistant dihapus");
    return deleted;
  }
}
