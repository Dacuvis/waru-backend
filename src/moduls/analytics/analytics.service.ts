import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import { AnalyticsModel } from "./analytics.model";
import type { DateRangeQuery, AnalyticsPeriod } from "./analytics.type";

/**
 * Hitung range tanggal berdasarkan period atau custom startDate/endDate.
 */
function resolveDateRange(query: DateRangeQuery): { from: Date; to: Date } {
  const now = new Date();

  if (query.period === "custom") {
    if (!query.startDate || !query.endDate) {
      throw new AppError("startDate dan endDate wajib diisi untuk period custom", 400);
    }
    const from = new Date(query.startDate);
    const to = new Date(query.endDate);
    if (isNaN(from.getTime())) throw new AppError("Format startDate tidak valid", 400, "E10");
    if (isNaN(to.getTime())) throw new AppError("Format endDate tidak valid", 400, "E10");
    if (to < from) throw new AppError("endDate harus setelah startDate", 400, "E10");
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  const from = new Date(now);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  switch (query.period ?? "today") {
    case "today":
      from.setHours(0, 0, 0, 0);
      break;
    case "week":
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    case "month":
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case "year":
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
    default:
      from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

export class AnalyticsService {
  private model = new AnalyticsModel();

  async getDashboard(query: DateRangeQuery) {
    const { from, to } = resolveDateRange(query);
    const period = (query.period ?? "today") as AnalyticsPeriod;

    logger.info({ period, from, to }, "Mengambil analytics dashboard");

    const [sales, dailySales, topMenuItems, paymentMethods, inventory, reviews] =
      await Promise.all([
        this.model.getSalesOverview(from, to),
        this.model.getDailySales(from, to),
        this.model.getTopMenuItems(from, to),
        this.model.getPaymentMethodSummary(from, to),
        this.model.getInventorySummary(),
        this.model.getReviewSummary(),
      ]);

    return {
      period,
      dateRange: { from, to },
      sales,
      dailySales,
      topMenuItems,
      paymentMethods,
      inventory,
      reviews,
    };
  }

  async getSalesOverview(query: DateRangeQuery) {
    const { from, to } = resolveDateRange(query);
    logger.info({ from, to }, "Mengambil sales overview");
    return await this.model.getSalesOverview(from, to);
  }

  async getDailySales(query: DateRangeQuery) {
    const { from, to } = resolveDateRange(query);
    logger.info({ from, to }, "Mengambil daily sales");
    return await this.model.getDailySales(from, to);
  }

  async getTopMenuItems(query: DateRangeQuery & { limit?: string }) {
    const { from, to } = resolveDateRange(query);
    const parsedLimit = Number.parseInt(query.limit ?? "10", 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 50)
      : 10;
    logger.info({ from, to, limit }, "Mengambil top menu items");
    return await this.model.getTopMenuItems(from, to, limit);
  }

  async getInventorySummary() {
    logger.info("Mengambil inventory summary");
    return await this.model.getInventorySummary();
  }

  async getReviewSummary() {
    logger.info("Mengambil review summary");
    return await this.model.getReviewSummary();
  }
}
