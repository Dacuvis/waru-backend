import { Elysia } from "elysia";
import { authMiddleware } from "../../utils/auth/auth.middleware";
import { requireRole } from "../../utils/auth/role.middleware";
import { AnalyticsController } from "./analytics.controller";
import { analyticsQueryValidation, topMenuQueryValidation } from "./analytics.validation";
import type { DateRangeQuery } from "./analytics.type";

const ctrl = new AnalyticsController();

export const analyticsRoute = new Elysia({ prefix: "/analytics" })
  .use(authMiddleware)
  .use(requireRole(["boss"]))

  // GET /analytics/dashboard?period=week
  .get(
    "/dashboard",
    ({ query }: { query: DateRangeQuery }) => ctrl.getDashboard({ query }),
    analyticsQueryValidation,
  )

  // GET /analytics/sales?period=month
  .get(
    "/sales",
    ({ query }: { query: DateRangeQuery }) => ctrl.getSalesOverview({ query }),
    analyticsQueryValidation,
  )

  // GET /analytics/sales/daily?period=week
  .get(
    "/sales/daily",
    ({ query }: { query: DateRangeQuery }) => ctrl.getDailySales({ query }),
    analyticsQueryValidation,
  )

  // GET /analytics/menu/top?period=month&limit=5
  .get(
    "/menu/top",
    ({ query }: { query: DateRangeQuery & { limit?: string } }) =>
      ctrl.getTopMenuItems({ query }),
    topMenuQueryValidation,
  )

  // GET /analytics/inventory
  .get("/inventory", () => ctrl.getInventorySummary())

  // GET /analytics/reviews
  .get("/reviews", () => ctrl.getReviewSummary());