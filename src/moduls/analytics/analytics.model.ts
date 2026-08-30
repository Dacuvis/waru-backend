import { db } from "../../config/client";

export class AnalyticsModel {
  private orders = db.collection("orders");
  private payment = db.collection("payment");
  private inventory = db.collection("inventory");
  private review = db.collection("review");

  // ── Sales ────────────────────────────────────────────────────────────────

  async getSalesOverview(from: Date, to: Date) {
    const dateFilter = { createdAt: { $gte: from, $lte: to } };

    const [ordersData, revenueData] = await Promise.all([
      this.orders
        .aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      this.payment
        .aggregate([
          { $match: { ...dateFilter, status: "paid" } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const statusMap: Record<string, number> = {};
    ordersData.forEach((d: any) => {
      statusMap[d._id] = d.count;
    });

    const totalOrders = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const totalRevenue = (revenueData[0] as any)?.totalRevenue ?? 0;
    const completedOrders = statusMap["completed"] ?? 0;
    const cancelledOrders = statusMap["cancelled"] ?? 0;

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      averageOrderValue: completedOrders > 0 ? totalRevenue / completedOrders : 0,
    };
  }

  async getDailySales(from: Date, to: Date) {
    return await this.payment
      .aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, status: "paid" } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", totalOrders: 1, totalRevenue: 1, _id: 0 } },
      ])
      .toArray();
  }

  async getTopMenuItems(from: Date, to: Date, limit: number = 10) {
    return await this.orders
      .aggregate([
        {
          $match: {
            createdAt: { $gte: from, $lte: to },
            status: { $in: ["completed"] },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            totalSold: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.subtotal" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: limit },
        { $project: { name: "$_id", totalSold: 1, totalRevenue: 1, _id: 0 } },
      ])
      .toArray();
  }

  async getPaymentMethodSummary(from: Date, to: Date) {
    return await this.payment
      .aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, status: "paid" } },
        {
          $group: {
            _id: "$method",
            count: { $sum: 1 },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { total: -1 } },
        { $project: { method: "$_id", count: 1, total: 1, _id: 0 } },
      ])
      .toArray();
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  async getInventorySummary() {
    const result = await this.inventory
      .aggregate([
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalInventoryValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
          },
        },
      ])
      .toArray();

    const lowStockCount = await this.inventory.countDocuments({
      $expr: {
        $and: [
          { $gt: ["$quantity", 0] },
          { $lte: ["$quantity", "$minimumStock"] },
        ],
      },
    });

    const outOfStockCount = await this.inventory.countDocuments({
      quantity: 0,
    });

    const safeStockCount = await this.inventory.countDocuments({
      $expr: { $gt: ["$quantity", "$minimumStock"] },
    });

    return {
      totalItems: (result[0] as any)?.totalItems ?? 0,
      lowStockCount,
      outOfStockCount,
      safeStockCount,
      totalInventoryValue: (result[0] as any)?.totalInventoryValue ?? 0,
    };
  }

  // ── Review ────────────────────────────────────────────────────────────────

  async getReviewSummary() {
    const [avgResult, distribution] = await Promise.all([
      this.review
        .aggregate([
          { $match: { isPublished: true } },
          {
            $group: {
              _id: null,
              averageRating: { $avg: "$rating" },
              totalReviews: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      this.review
        .aggregate([
          { $match: { isPublished: true } },
          { $group: { _id: "$rating", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ]);

    const ratingDistribution: Record<string, number> = {};
    distribution.forEach((d: any) => {
      ratingDistribution[String(d._id)] = d.count;
    });

    return {
      averageRating: Number(((avgResult[0] as any)?.averageRating ?? 0).toFixed(2)),
      totalReviews: (avgResult[0] as any)?.totalReviews ?? 0,
      ratingDistribution,
    };
  }
}