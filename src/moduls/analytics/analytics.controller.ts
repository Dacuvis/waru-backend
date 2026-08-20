import { AnalyticsService } from "./analytics.service";
import type { DateRangeQuery } from "./analytics.type";

const service = new AnalyticsService();

export class AnalyticsController {
  async getDashboard({
    query,
  }: {
    query: DateRangeQuery;
  }) {
    return await service.getDashboard(query);
  }

  async getSalesOverview({ query }: { query: DateRangeQuery }) {
    return await service.getSalesOverview(query);
  }

  async getDailySales({ query }: { query: DateRangeQuery }) {
    return await service.getDailySales(query);
  }

  async getTopMenuItems({
    query,
  }: {
    query: DateRangeQuery & { limit?: string };
  }) {
    return await service.getTopMenuItems(query);
  }

  async getInventorySummary() {
    return await service.getInventorySummary();
  }

  async getReviewSummary() {
    return await service.getReviewSummary();
  }
}
