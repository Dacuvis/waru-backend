import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { OrderModel, PaymentModel } from "./cashier.model";
import type { CreateOrder, UpdateOrder, CreatePayment, UpdatePayment } from "./cashier.type";

// ─── Order Service ──────────────────────────────────────────────────────────

export class OrderService {
  private model = new OrderModel();

  async getAll(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil daftar orders");

    const { data, total } = await this.model.getAll(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string) {
    const order = await this.model.getById(id);
    if (!order) throw new AppError(`Order dengan id ${id} tidak ditemukan`, 404);
    logger.info({ orderId: id }, "Mengambil order by id");
    return order;
  }

  async getByStatus(status: string, query: PaginationQuery) {
    const validStatuses = ["pending", "processing", "completed", "cancelled"];
    if (!validStatuses.includes(status)) throw new AppError("Status order tidak valid", 400);

    const { page, limit, skip } = parsePagination(query);
    logger.info({ status, page, limit }, "Mengambil orders by status");

    const { data, total } = await this.model.getByStatus(status, skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async create(data: CreateOrder) {
    // Hitung subtotal tiap item dan total order
    const items = data.items.map((item) => ({
      ...item,
      subtotal: item.price * item.quantity,
    }));
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    const now = new Date();
    const order = {
      ...data,
      items,
      totalAmount,
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.model.create(order);
    logger.info({ orderId: result.insertedId, totalAmount }, "Order baru dibuat");
    return result;
  }

  async update(id: string, data: UpdateOrder) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Order dengan id ${id} tidak ditemukan`, 404);

    let updateData: UpdateOrder & { totalAmount?: number; updatedAt: Date } = {
      ...data,
      updatedAt: new Date(),
    };

    // Recalculate total jika items diubah
    if (data.items) {
      const items = data.items.map((item) => ({
        ...item,
        subtotal: item.price * item.quantity,
      }));
      updateData.totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    }

    const updated = await this.model.update(id, updateData);
    logger.info({ orderId: id }, "Order diupdate");
    return updated;
  }

  async delete(id: string) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Order dengan id ${id} tidak ditemukan`, 404);

    const deleted = await this.model.delete(id);
    logger.info({ orderId: id }, "Order dihapus");
    return deleted;
  }
}

// ─── Payment Service ──────────────────────────────────────────────────────

export class PaymentService {
  private model = new PaymentModel();
  private orderModel = new OrderModel();

  async getAll(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil daftar payments");

    const { data, total } = await this.model.getAll(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string) {
    const payment = await this.model.getById(id);
    if (!payment) throw new AppError(`Payment dengan id ${id} tidak ditemukan`, 404);
    logger.info({ paymentId: id }, "Mengambil payment by id");
    return payment;
  }

  async create(data: CreatePayment) {
    // Validasi order exist
    const order = await this.orderModel.getById(data.orderId);
    if (!order) throw new AppError(`Order dengan id ${data.orderId} tidak ditemukan`, 404);

    // Cek apakah order sudah dibayar
    const existing = await this.model.getByOrderId(data.orderId);
    if (existing && existing.status === "paid") {
      throw new AppError("Order ini sudah dibayar", 409);
    }

    const totalAmount = (order as any).totalAmount as number;
    if (data.paidAmount < totalAmount) {
      throw new AppError(
        `Jumlah bayar (${data.paidAmount}) kurang dari total tagihan (${totalAmount})`,
        400,
      );
    }

    const now = new Date();
    const payment = {
      ...data,
      tableNumber: (order as any).tableNumber as number,
      totalAmount,
      changeAmount: data.paidAmount - totalAmount,
      status: "paid" as const,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.model.create(payment);

    // Update status order jadi completed
    await this.orderModel.update(data.orderId, {
      status: "completed",
      updatedAt: new Date(),
    });

    logger.info(
      { paymentId: result.insertedId, orderId: data.orderId, method: data.method },
      "Payment berhasil dibuat",
    );
    return result;
  }

  async update(id: string, data: UpdatePayment) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Payment dengan id ${id} tidak ditemukan`, 404);

    const updated = await this.model.update(id, { ...data, updatedAt: new Date() });
    logger.info({ paymentId: id, status: data.status }, "Payment diupdate");
    return updated;
  }

  async delete(id: string) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Payment dengan id ${id} tidak ditemukan`, 404);

    const deleted = await this.model.delete(id);
    logger.info({ paymentId: id }, "Payment dihapus");
    return deleted;
  }
}
