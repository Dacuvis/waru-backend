import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import { midtransService } from "../../utils/midtrans/midtrans.service";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { OrderModel, PaymentModel } from "./cashier.model";
import { MenuModel } from "../menu/menu.model";
import type { AuthUser } from "../../utils/auth/auth.middleware";
import type {
  CreateOrder,
  UpdateOrder,
  CreatePayment,
  UpdatePayment,
  Payment,
  MidtransNotificationPayload,
  PaymentStatus,
} from "./cashier.type";

// ─── Order Service ──────────────────────────────────────────────────────────

export class OrderService {
  private model = new OrderModel();
  private paymentModel = new PaymentModel();
  private menuModel = new MenuModel();

  async getAll(query: PaginationQuery, user?: AuthUser) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil daftar orders");

    const filter: Record<string, any> = {};
    if (user?.role === "customer" && user?.id) {
      filter.customerId = user.id;
    }

    const { data, total } = await this.model.getAll(skip, limit, filter);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string, user?: AuthUser) {
    const order = await this.model.getById(id);
    if (!order) throw new AppError(`Order dengan id ${id} tidak ditemukan`, 404, "E30");
    if (user?.role === "customer" && user?.id && (order as any).customerId !== user.id) {
      throw new AppError(`Order dengan id ${id} tidak ditemukan`, 404, "E30");
    }
    logger.info({ orderId: id }, "Mengambil order by id");
    return order;
  }

  async getByStatus(status: string, query: PaginationQuery) {
    const validStatuses = ["pending", "processing", "completed", "cancelled"];
    if (!validStatuses.includes(status)) throw new AppError("Status order tidak valid", 400, "E10");

    const { page, limit, skip } = parsePagination(query);
    logger.info({ status, page, limit }, "Mengambil orders by status");

    const { data, total } = await this.model.getByStatus(status, skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async create(data: CreateOrder, user?: AuthUser) {
    // Ambil harga resmi tiap menu dari DB menu (SEC-CRIT-002)
    const items = await Promise.all(
      data.items.map(async (item) => {
        const menuItem = await this.menuModel.findById(item.menuId);
        if (!menuItem) {
          throw new AppError(`Menu dengan id '${item.menuId}' tidak ditemukan`, 404, "E30");
        }
        const price = (menuItem as any).price;
        const subtotal = price * item.quantity;
        return {
          menuId: item.menuId,
          name: (menuItem as any).name || item.name,
          quantity: item.quantity,
          price,
          subtotal,
        };
      }),
    );
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    // customerId HARUS berasal dari authenticated user (JWT), bukan request body
    const customerId = user?.id;
    const now = new Date();
    const order = {
      ...data,
      customerId,
      items,
      totalAmount,
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.model.create(order);
    logger.info({ orderId: result.insertedId, totalAmount, customerId }, "Order baru dibuat");
    return result;
  }

  async update(id: string, data: UpdateOrder) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Order dengan id ${id} tidak ditemukan`, 404, "E30");

    let updateData: UpdateOrder & { totalAmount?: number; updatedAt: Date } = {
      ...data,
      updatedAt: new Date(),
    };

    // Recalculate total dari database harga jika items diubah
    if (data.items) {
      const items = await Promise.all(
        data.items.map(async (item) => {
          const menuItem = await this.menuModel.findById(item.menuId);
          if (!menuItem) {
            throw new AppError(`Menu dengan id '${item.menuId}' tidak ditemukan`, 404, "E30");
          }
          const price = (menuItem as any).price;
          const subtotal = price * item.quantity;
          return {
            menuId: item.menuId,
            name: (menuItem as any).name || item.name,
            quantity: item.quantity,
            price,
            subtotal,
          };
        }),
      );
      updateData.items = items;
      updateData.totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    }

    const updated = await this.model.update(id, updateData);
    logger.info({ orderId: id }, "Order diupdate");
    return updated;
  }

  async delete(id: string) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Order dengan id ${id} tidak ditemukan`, 404, "E30");

    const payment = await this.paymentModel.getByOrderId(id);
    if (payment && (payment as any).status === "paid") {
      throw new AppError("Order yang sudah dibayar tidak boleh dihapus", 409, "E40");
    }

    // Jika ada payment pending/failed terkait, hapus juga paymentnya
    if (payment) {
      await this.paymentModel.delete((payment as any)._id.toString());
    }

    const deleted = await this.model.delete(id);
    logger.info({ orderId: id }, "Order dihapus");
    return deleted;
  }
}

// ─── Payment Service ──────────────────────────────────────────────────────

export class PaymentService {
  private model = new PaymentModel();
  private orderModel = new OrderModel();

  async getAll(query: PaginationQuery, user?: AuthUser) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil daftar payments");

    let filter: Record<string, any> = {};
    if (user?.role === "customer" && user?.id) {
      const userOrderIds = await this.orderModel.getAllUserOrderIds(user.id);
      filter = { orderId: { $in: userOrderIds } };
    }

    const { data, total } = await this.model.getAll(skip, limit, filter);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string, user?: AuthUser) {
    const payment = await this.model.getById(id);
    if (!payment) throw new AppError(`Payment dengan id ${id} tidak ditemukan`, 404, "E30");

    if (user?.role === "customer" && user?.id) {
      const order = await this.orderModel.getById((payment as any).orderId);
      if (!order || (order as any).customerId !== user.id) {
        throw new AppError(`Payment dengan id ${id} tidak ditemukan`, 404, "E30");
      }
    }

    logger.info({ paymentId: id }, "Mengambil payment by id");
    return payment;
  }

  async getByOrderId(orderId: string, user?: AuthUser) {
    if (user?.role === "customer" && user?.id) {
      const order = await this.orderModel.getById(orderId);
      if (!order || (order as any).customerId !== user.id) {
        throw new AppError(`Payment untuk order id ${orderId} tidak ditemukan`, 404, "E30");
      }
    }

    const payment = await this.model.getByOrderId(orderId);
    if (!payment) throw new AppError(`Payment untuk order id ${orderId} tidak ditemukan`, 404, "E30");
    return payment;
  }

  /**
   * Membuat transaksi pembayaran (Cash / QRIS via Midtrans)
   */
  async create(data: CreatePayment, user?: AuthUser) {
    // 1. Validasi keberadaan order
    const order = await this.orderModel.getById(data.orderId);
    if (!order) {
      throw new AppError(`Order dengan id ${data.orderId} tidak ditemukan`, 404, "E30");
    }

    if (user?.role === "customer" && user?.id && (order as any).customerId !== user.id) {
      throw new AppError(`Order dengan id ${data.orderId} tidak ditemukan`, 404, "E30");
    }

    const totalAmount = (order as any).totalAmount as number;
    const tableNumber = (order as any).tableNumber as number;
    const customerName = (order as any).customerName as string | undefined;

    // 2. Cek apakah order sudah lunas
    const existing = await this.model.getByOrderId(data.orderId);
    if (existing && (existing as any).status === "paid") {
      throw new AppError("Order ini sudah lunas dibayar", 409, "E40");
    }

    const now = new Date();

    // ─── Case 1: Metode Pembayaran Cash ────────────────────────────────────
    if (data.method === "cash") {
      if (data.paidAmount === undefined || data.paidAmount === null) {
        throw new AppError("Jumlah bayar (paidAmount) wajib diisi untuk metode cash", 400, "E10");
      }

      if (data.paidAmount < totalAmount) {
        throw new AppError(
          `Jumlah bayar (${data.paidAmount}) kurang dari total tagihan (${totalAmount})`,
          400,
          "E10",
        );
      }

      const changeAmount = data.paidAmount - totalAmount;
      const paymentRecord: Payment = {
        orderId: data.orderId,
        tableNumber,
        totalAmount,
        paidAmount: data.paidAmount,
        changeAmount,
        method: "cash",
        status: "paid",
        notes: data.notes,
        createdAt: existing ? (existing as any).createdAt : now,
        updatedAt: now,
      };

      if (existing) {
        await this.model.update((existing as any)._id.toString(), {
          ...paymentRecord,
          updatedAt: now,
        });
      } else {
        await this.model.create(paymentRecord);
      }

      // Update status order menjadi completed
      await this.orderModel.update(data.orderId, {
        status: "completed",
        updatedAt: now,
      });

      logger.info(
        { orderId: data.orderId, method: "cash", totalAmount, paidAmount: data.paidAmount },
        "Pembayaran cash berhasil diselesaikan",
      );

      return await this.model.getByOrderId(data.orderId);
    }

    // ─── Case 2: Metode Pembayaran QRIS (Midtrans) ─────────────────────────
    if (data.method === "qris") {
      const midtransOrderId = `ORDER-${data.orderId}-${Date.now()}`;

      const items = ((order as any).items || []).map((item: any) => ({
        id: item.menuId || item.name,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      // Panggil Midtrans API untuk membuat QRIS charge
      const midtransRes = await midtransService.createQrisCharge({
        orderId: midtransOrderId,
        grossAmount: totalAmount,
        customerName: customerName || `Table ${tableNumber}`,
        items,
      });

      const paymentRecord: Payment = {
        orderId: data.orderId,
        tableNumber,
        totalAmount,
        paidAmount: 0,
        changeAmount: 0,
        method: "qris",
        status: "pending",
        transactionId: midtransRes.transactionId,
        midtransOrderId,
        qrString: midtransRes.qrString,
        qrUrl: midtransRes.qrUrl,
        expiryTime: midtransRes.expiryTime ? new Date(midtransRes.expiryTime) : undefined,
        notes: data.notes,
        createdAt: existing ? (existing as any).createdAt : now,
        updatedAt: now,
      };

      if (existing) {
        await this.model.update((existing as any)._id.toString(), {
          ...paymentRecord,
          updatedAt: now,
        });
      } else {
        await this.model.create(paymentRecord);
      }

      logger.info(
        {
          orderId: data.orderId,
          midtransOrderId,
          transactionId: midtransRes.transactionId,
          qrUrl: midtransRes.qrUrl,
        },
        "QRIS Midtrans charge berhasil dibuat",
      );

      return await this.model.getByOrderId(data.orderId);
    }

    throw new AppError("Metode pembayaran tidak didukung", 400, "E10");
  }

  /**
   * Menangani webhook / HTTP notification dari Midtrans
   */
  async handleNotification(payload: MidtransNotificationPayload) {
    logger.info({ order_id: payload.order_id, status: payload.transaction_status }, "Menerima notifikasi Midtrans");

    // 1. Verifikasi signature key
    const isSignatureValid = midtransService.verifySignature(
      payload.order_id,
      payload.status_code,
      payload.gross_amount,
      payload.signature_key,
    );

    if (!isSignatureValid) {
      logger.error({ order_id: payload.order_id }, "Signature Midtrans tidak valid");
      throw new AppError("Signature key Midtrans tidak valid", 400, "E10");
    }

    // 2. Cari data payment di DB berdasarkan midtransOrderId, transactionId, atau orderId
    let payment = await this.model.getByMidtransOrderId(payload.order_id);
    if (!payment && payload.transaction_id) {
      payment = await this.model.getByTransactionId(payload.transaction_id);
    }
    if (!payment && payload.order_id.startsWith("ORDER-")) {
      const parts = payload.order_id.split("-");
      const extractedOrderId = parts[1];
      if (extractedOrderId) {
        payment = await this.model.getByOrderId(extractedOrderId);
      }
    }

    if (!payment) {
      logger.warn({ order_id: payload.order_id }, "Payment tidak ditemukan untuk webhook Midtrans");
      return { status: "ignored", message: "Payment tidak ditemukan" };
    }

    const paymentId = (payment as any)._id.toString();
    const orderId = (payment as any).orderId;
    const now = new Date();
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    let targetStatus: PaymentStatus = (payment as any).status;

    if (transactionStatus === "capture") {
      if (fraudStatus === "accept") {
        targetStatus = "paid";
      }
    } else if (transactionStatus === "settlement") {
      targetStatus = "paid";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      targetStatus = "failed";
    } else if (transactionStatus === "refund" || transactionStatus === "partial_refund") {
      targetStatus = "refunded";
    } else if (transactionStatus === "pending") {
      targetStatus = "pending";
    }

    if (targetStatus === "paid") {
      const paidAmount = parseFloat(payload.gross_amount) || (payment as any).totalAmount;
      await this.model.update(paymentId, {
        status: "paid",
        paidAmount,
        changeAmount: 0,
        settlementTime: payload.settlement_time ? new Date(payload.settlement_time) : now,
        updatedAt: now,
      });

      // Update status order menjadi completed
      await this.orderModel.update(orderId, {
        status: "completed",
        updatedAt: now,
      });

      logger.info({ paymentId, orderId, transactionStatus }, "QRIS payment berhasil dilunasi via webhook Midtrans");
    } else if (targetStatus === "failed") {
      await this.model.update(paymentId, {
        status: "failed",
        updatedAt: now,
      });
      logger.warn({ paymentId, orderId, transactionStatus }, "QRIS payment gagal/kadaluarsa via webhook Midtrans");
    }

    return {
      status: "success",
      message: `Status transaksi Midtrans '${transactionStatus}' berhasil diproses`,
      paymentStatus: targetStatus,
    };
  }

  /**
   * Cek dan sinkronisasi status transaksi dari Midtrans secara manual / on-demand
   */
  async checkStatus(idOrOrderId: string) {
    let payment = await this.model.getById(idOrOrderId);
    if (!payment) {
      payment = await this.model.getByOrderId(idOrOrderId);
    }
    if (!payment) {
      payment = await this.model.getByMidtransOrderId(idOrOrderId);
    }

    if (!payment) {
      throw new AppError(`Payment dengan id atau orderId '${idOrOrderId}' tidak ditemukan`, 404, "E30");
    }

    // Jika payment method QRIS dan belum paid, query ke Midtrans
    const midtransOrderId = (payment as any).midtransOrderId;
    const isQris = (payment as any).method === "qris";

    if (isQris && midtransOrderId && (payment as any).status !== "paid") {
      const statusRes = await midtransService.getTransactionStatus(midtransOrderId);
      const now = new Date();
      const transactionStatus = statusRes.transactionStatus;
      const fraudStatus = statusRes.fraudStatus;

      let targetStatus: PaymentStatus = (payment as any).status;

      if (
        transactionStatus === "settlement" ||
        (transactionStatus === "capture" && fraudStatus === "accept")
      ) {
        targetStatus = "paid";
      } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
        targetStatus = "failed";
      } else if (["refund", "partial_refund"].includes(transactionStatus)) {
        targetStatus = "refunded";
      }

      if (targetStatus === "paid") {
        const paidAmount = parseFloat(statusRes.grossAmount) || (payment as any).totalAmount;
        await this.model.update((payment as any)._id.toString(), {
          status: "paid",
          paidAmount,
          changeAmount: 0,
          settlementTime: statusRes.settlementTime ? new Date(statusRes.settlementTime) : now,
          updatedAt: now,
        });

        await this.orderModel.update((payment as any).orderId, {
          status: "completed",
          updatedAt: now,
        });
      } else if (targetStatus === "failed") {
        await this.model.update((payment as any)._id.toString(), {
          status: "failed",
          updatedAt: now,
        });
      }

      return await this.model.getById((payment as any)._id.toString());
    }

    return payment;
  }

  async update(id: string, data: UpdatePayment) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Payment dengan id ${id} tidak ditemukan`, 404, "E30");

    const updated = await this.model.update(id, { ...data, updatedAt: new Date() });
    if (data.status && data.status !== (existing as any).status) {
      await this.orderModel.update((existing as any).orderId, {
        status: data.status === "paid" ? "completed" : "pending",
        updatedAt: new Date(),
      });
    }
    logger.info({ paymentId: id, status: data.status }, "Payment diupdate");
    return updated;
  }

  async delete(id: string) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Payment dengan id ${id} tidak ditemukan`, 404, "E30");

    const deleted = await this.model.delete(id);
    if ((existing as any).status === "paid") {
      await this.orderModel.update((existing as any).orderId, {
        status: "pending",
        updatedAt: new Date(),
      });
    }
    logger.info({ paymentId: id }, "Payment dihapus");
    return deleted;
  }
}