export type AnalyticsPeriod = "today" | "week" | "month" | "year" | "custom";

export interface DateRangeQuery {
  period?: AnalyticsPeriod;
  startDate?: string;  // ISO date, dipakai kalau period = custom
  endDate?: string;
}

export interface SalesOverview {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface DailySales {
  date: string;
  totalOrders: number;
  totalRevenue: number;
}

export interface TopMenuItem {
  name: string;
  totalSold: number;
  totalRevenue: number;
}

export interface PaymentMethodSummary {
  method: string;
  count: number;
  total: number;
}

export interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  totalInventoryValue: number;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>; // { "1": 2, "2": 5, ... }
}

export interface AnalyticsDashboard {
  period: AnalyticsPeriod;
  dateRange: { from: Date; to: Date };
  sales: SalesOverview;
  paymentMethods: PaymentMethodSummary[];
  topMenuItems: TopMenuItem[];
  inventory: InventorySummary;
  reviews: ReviewSummary;
}
