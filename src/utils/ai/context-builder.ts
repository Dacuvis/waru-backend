import type { AnalyticsModel } from "../../moduls/analytics/analytics.model";
import type { AIBusinessContext } from "./ai.types";

export async function buildBusinessContext(
  analyticsModel: AnalyticsModel,
): Promise<{ contextText: string; structuredData: AIBusinessContext }> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch aggregated data in parallel
  const [sales, inventory, review, topMenu] = await Promise.all([
    analyticsModel.getSalesOverview(weekAgo, endOfDay).catch(() => ({
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
    })),
    analyticsModel.getInventorySummary().catch(() => ({
      totalItems: 0,
      lowStockCount: 0,
      totalInventoryValue: 0,
    })),
    analyticsModel.getReviewSummary().catch(() => ({
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: {},
    })),
    analyticsModel.getTopMenuItems(weekAgo, endOfDay, 5).catch(() => []),
  ]);

  const periodDescription = `7 hari terakhir (${weekAgo.toISOString().slice(0, 10)} s.d. ${now.toISOString().slice(0, 10)})`;

  const topMenuItems = (topMenu as any[]).map((item) => ({
    name: String(item.name || "Unknown"),
    totalSold: Number(item.totalSold || 0),
    totalRevenue: Number(item.totalRevenue || 0),
  }));

  const structuredData: AIBusinessContext = {
    salesSummary: {
      totalOrders: sales.totalOrders,
      completedOrders: sales.completedOrders,
      cancelledOrders: sales.cancelledOrders,
      totalRevenue: sales.totalRevenue,
      averageOrderValue: Math.round(sales.averageOrderValue),
    },
    inventorySummary: {
      totalItems: inventory.totalItems,
      lowStockCount: inventory.lowStockCount,
      totalInventoryValue: inventory.totalInventoryValue,
    },
    reviewSummary: {
      averageRating: review.averageRating,
      totalReviews: review.totalReviews,
      ratingDistribution: review.ratingDistribution,
    },
    topMenuItems,
    periodDescription,
  };

  const topMenuStr =
    topMenuItems.length > 0
      ? topMenuItems.map((m, i) => `${i + 1}. ${m.name} (${m.totalSold} porsi, Rp ${m.totalRevenue.toLocaleString("id-ID")})`).join("\n")
      : "Belum ada data menu terlaris.";

  const contextText = `
=== KONTEKS DATA BISNIS WARU ===
Periode: ${periodDescription}

[RINGKASAN PENJUALAN]
- Total Pesanan: ${sales.totalOrders}
- Pesanan Selesai: ${sales.completedOrders}
- Pesanan Dibatalkan: ${sales.cancelledOrders}
- Total Omzet: Rp ${sales.totalRevenue.toLocaleString("id-ID")}
- Rata-rata Nilai Order: Rp ${Math.round(sales.averageOrderValue).toLocaleString("id-ID")}

[STOK & INVENTARIS]
- Total Item Inventaris: ${inventory.totalItems}
- Item Stok Menipis (<= Limit Minimum): ${inventory.lowStockCount}
- Total Nilai Inventaris: Rp ${inventory.totalInventoryValue.toLocaleString("id-ID")}

[RATING & REVIU PELANGGAN]
- Rating Rata-rata: ${review.averageRating} / 5
- Total Reviu: ${review.totalReviews}

[MENU TERLARIS (TOP 5)]
${topMenuStr}
================================
`.trim();

  return { contextText, structuredData };
}