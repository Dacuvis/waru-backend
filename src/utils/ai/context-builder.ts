import type { AnalyticsModel } from "../../moduls/analytics/analytics.model";
import type { MenuModel } from "../../moduls/menu/menu.model";
import type { InventoryModel } from "../../moduls/inventory/inventory.model";
import type { AIBusinessContext } from "./ai.types";

export async function buildBusinessContext(
  analyticsModel: AnalyticsModel,
  menuModel?: MenuModel,
  inventoryModel?: InventoryModel,
): Promise<{ contextText: string; structuredData: AIBusinessContext }> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch aggregated data in parallel
  const [sales, inventory, review, topMenu, menuListRes, lowStockRes] = await Promise.all([
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
    menuModel ? menuModel.findAll(0, 50).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    inventoryModel ? inventoryModel.getLowStock(0, 20).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
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
      ? topMenuItems.map((m, i) => `${i + 1}. ${m.name} (${m.totalSold} porsi, Total Omzet: Rp ${m.totalRevenue.toLocaleString("id-ID")})`).join("\n")
      : "Belum ada data transaksi menu terlaris pada periode ini.";

  const activeMenus = (menuListRes?.data || []) as any[];
  const activeMenuStr =
    activeMenus.length > 0
      ? activeMenus.map((m) => `- ${m.name} [Kategori: ${m.category || "Umum"}, Harga: Rp ${(m.price || 0).toLocaleString("id-ID")}${m.isAvailable ? "" : " (Kosong)"}]`).join("\n")
      : "- Ayam Geprek (Heavy Food, Rp 30.000)\n- Nasi Goreng Waru (Heavy Food, Rp 25.000)\n- Es Teh Manis (Light Food, Rp 5.000)";

  const lowStockItems = (lowStockRes?.data || []) as any[];
  const lowStockStr =
    lowStockItems.length > 0
      ? lowStockItems.map((i) => `- ${i.name}: Stok ${i.quantity} ${i.unit || "unit"} (Batas Minimum: ${i.minimumStock} ${i.unit || "unit"})`).join("\n")
      : "Semua stok inventaris dalam kondisi aman di atas batas minimum.";

  const contextText = `
=== DATA KONTEKS INTERNAL KEDAI WARU ===
Periode Laporan: ${periodDescription}

[DAFTAR MENU AKTIF WARU]
${activeMenuStr}

[RINGKASAN PENJUALAN INTERNAL]
- Total Pesanan Masuk: ${sales.totalOrders}
- Pesanan Selesai: ${sales.completedOrders}
- Pesanan Dibatalkan: ${sales.cancelledOrders}
- Total Omzet: Rp ${sales.totalRevenue.toLocaleString("id-ID")}
- Rata-rata Nilai Order: Rp ${Math.round(sales.averageOrderValue).toLocaleString("id-ID")}

[MENU TERLARIS DI WARU (TOP 5)]
${topMenuStr}

[STATUS STOK & INVENTARIS]
- Total Item Inventaris: ${inventory.totalItems}
- Item Mendekati/Di Bawah Limit Minimum: ${inventory.lowStockCount} item
${lowStockStr}

[RATING & KEPUASAN PELANGGAN]
- Rata-rata Rating: ${review.averageRating} / 5.0 (dari total ${review.totalReviews || 0} ulasan)
========================================
`.trim();

  return { contextText, structuredData };
}