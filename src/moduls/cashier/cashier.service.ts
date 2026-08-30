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
import { PromoService } from "../promo/promo.service";
import { NotificationModel } from "../notification/notification.model";
import { KitchenModel } from "../kitchen/kitchen.model";
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
  private menuModel = new MenuModel();
  private paymentModel = new PaymentModel();
  private promoService = new PromoService();

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
        if (!(menuItem as any).isAvailable) {
          throw new AppError(`Menu '${(menuItem as any).name || item.name}' sedang tidak tersedia`, 400, "E10");
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

    let finalAmount = totalAmount;
    let discountAmount = 0;
    if (data.promoCode) {
      const promoData = await this.promoService.applyPromo({ code: data.promoCode, orderTotal: totalAmount });
      finalAmount = promoData.finalTotal;
      discountAmount = promoData.discountAmount;
    }

    // customerId HARUS berasal dari authenticated user (JWT), bukan request body
    const customerId = user?.id;
    const now = new Date();
    const order = {
      ...data,
      customerId,
      items,
      totalAmount,
      promoCode: data.promoCode,
      discountAmount,
      finalAmount,
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.model.create(order);
    logger.info({ orderId: result.insertedId, totalAmount, finalAmount, customerId }, "Order baru dibuat");

    // Kirim notifikasi order baru ke database
    try {
      const notificationModel = new NotificationModel();
      await notificationModel.create({
        type: "order_new",
        target: "all",
        title: "Pesanan Baru Dibuat",
        message: `Pesanan baru untuk Meja ${data.tableNumber} senilai Rp ${finalAmount.toLocaleString("id-ID")} telah dibuat.`,
        referenceId: result.insertedId.toString(),
        isRead: false,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      // Non-blocking log if it fails
    }

    // Otomatis masukkan ke antrean dapur (Kitchen Queue Pipeline)
    try {
      const kitchenModel = new KitchenModel();
      const existingKitchen = await kitchenModel.getByOrderId(result.insertedId.toString());
      if (!existingKitchen) {
        await kitchenModel.create({
          orderId: result.insertedId.toString(),
          tableNumber: data.tableNumber,
          menuItems: items.map((i: any) => ({
            menuId: i.menuId?.toString() || i._id?.toString() || i.id?.toString(),
            name: i.name,
            quantity: i.quantity,
            notes: data.notes,
          })),
          notes: data.notes,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (kErr) {
      logger.warn({ err: kErr, orderId: result.insertedId }, "Gagal membuat kitchen queue item");
    }

    return result;
  }

  async update(id: string, data: UpdateOrder) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Order dengan id ${id} tidak ditemukan`, 404, "E30");

    const payment = await this.paymentModel.getByOrderId(id);
    if (payment && (payment as any).status === "paid") {
      throw new AppError("Order yang sudah dibayar tidak boleh diubah", 409, "E40");
    }

    let updateData: UpdateOrder & {
      totalAmount?: number;
      discountAmount?: number;
      finalAmount?: number;
      promoCode?: string | null;
      updatedAt: Date;
    } = {
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
          if (!(menuItem as any).isAvailable) {
            throw new AppError(`Menu '${(menuItem as any).name || item.name}' sedang tidak tersedia`, 400, "E10");
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
      const newTotalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
      updateData.totalAmount = newTotalAmount;

      // Hitung ulang promo (atau reset jika tidak valid lagi) agar finalAmount tidak stale (SEC-ORD-002)
      const promoCode = (existing as any).promoCode;
      if (promoCode) {
        try {
          const promoData = await this.promoService.applyPromo({
            code: promoCode,
            orderTotal: newTotalAmount,
          });
          updateData.discountAmount = promoData.discountAmount;
          updateData.finalAmount = promoData.finalTotal;
        } catch (err) {
          // Jika promo sudah tidak memenuhi syarat untuk total baru, reset promo fields
          updateData.promoCode = null as any;
          updateData.discountAmount = 0;
          updateData.finalAmount = newTotalAmount;
        }
      } else {
        updateData.discountAmount = 0;
        updateData.finalAmount = newTotalAmount;
      }
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
  private promoService = new PromoService();

  private async processPromoIfPaid(orderId: string) {
    const order = await this.orderModel.getById(orderId);
    if (!order) return;

    if ((order as any).promoCode) {
      try {
        await this.promoService.consumeUsage((order as any).promoCode);
      } catch (err) {
        logger.error({ err, orderId, promoCode: (order as any).promoCode }, "Gagal mengonsumsi kuota promo saat payment lunas");
      }
    }

    // Kirim notifikasi pembayaran sukses ke database
    try {
      const notificationModel = new NotificationModel();
      const now = new Date();
      const amount = (order as any).finalAmount ?? (order as any).totalAmount;
      const tableNumber = (order as any).tableNumber;
      await notificationModel.create({
        type: "payment_success",
        target: "all",
        title: "Pembayaran Berhasil",
        message: `Pembayaran untuk Meja ${tableNumber} senilai Rp ${amount.toLocaleString("id-ID")} telah lunas.`,
        referenceId: orderId,
        isRead: false,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      // Non-blocking log if it fails
    }
  }

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
    let payment = await this.model.getById(id);
    if (!payment) throw new AppError(`Payment dengan id ${id} tidak ditemukan`, 404, "E30");

    if (user?.role === "customer" && user?.id) {
      const order = await this.orderModel.getById((payment as any).orderId);
      if (!order || (order as any).customerId !== user.id) {
        throw new AppError(`Payment dengan id ${id} tidak ditemukan`, 404, "E30");
      }
    }

    // Auto-sync status dari Midtrans jika status masih pending
    if ((payment as any).status === "pending" && (payment as any).method === "qris") {
      try {
        payment = await this.checkStatus(id);
      } catch (err) {
        logger.warn({ paymentId: id, err }, "Gagal auto-sync status payment dari Midtrans");
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

    let payment = await this.model.getByOrderId(orderId);
    if (!payment) throw new AppError(`Payment untuk order id ${orderId} tidak ditemukan`, 404, "E30");

    // Auto-sync status dari Midtrans jika status masih pending
    if ((payment as any).status === "pending" && (payment as any).method === "qris") {
      try {
        payment = await this.checkStatus((payment as any)._id.toString());
      } catch (err) {
        logger.warn({ orderId, err }, "Gagal auto-sync status payment dari Midtrans");
      }
    }

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

    const totalAmount = ((order as any).finalAmount ?? (order as any).totalAmount) as number;
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
      if (user?.role === "customer") {
        throw new AppError("Akses ditolak. Customer tidak dapat memproses pembayaran tunai secara langsung.", 403, "E20");
      }

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

      let transitionedToPaid = false;

      if (existing) {
        const updated = await this.model.markAsPaidByOrderId(data.orderId, {
          tableNumber,
          totalAmount,
          paidAmount: data.paidAmount,
          changeAmount,
          method: "cash",
          notes: data.notes,
          updatedAt: now,
        });
        if (updated) {
          transitionedToPaid = true;
        } else {
          if ((existing as any).status === "paid") {
            throw new AppError("Order ini sudah lunas dibayar", 409, "E40");
          }
        }
      } else {
        try {
          await this.model.create(paymentRecord);
          transitionedToPaid = true;
        } catch (err: any) {
          if (err?.code === 11000 || err?.message?.includes("E11000") || err?.message?.includes("duplicate key")) {
            const updated = await this.model.markAsPaidByOrderId(data.orderId, {
              tableNumber,
              totalAmount,
              paidAmount: data.paidAmount,
              changeAmount,
              method: "cash",
              notes: data.notes,
              updatedAt: now,
            });
            if (updated) {
              transitionedToPaid = true;
            } else {
              throw new AppError("Order ini sudah lunas dibayar", 409, "E40");
            }
          } else {
            throw err;
          }
        }
      }

      if (transitionedToPaid) {
        // Update status order menjadi completed
        await this.orderModel.update(data.orderId, {
          status: "completed",
          updatedAt: now,
        });

        await this.processPromoIfPaid(data.orderId);
      }

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
      logger.warn({ order_id: payload.order_id }, "Payment tidak ditemukan saat memproses notifikasi Midtrans");
      throw new AppError(`Payment untuk order_id ${payload.order_id} tidak ditemukan`, 404, "E30");
    }

    const paymentId = (payment as any)._id.toString();
    const orderId = (payment as any).orderId;
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;
    const now = new Date();

    // 3. Tentukan target status pembayaran
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

    // 4. Update status payment dan order jika berubah
    if (targetStatus === "paid" && (payment as any).status !== "paid") {
      const paidAmount = parseFloat(payload.gross_amount) || (payment as any).totalAmount;
      const updatedPayment = await this.model.markAsPaidById(paymentId, {
        paidAmount,
        changeAmount: 0,
        settlementTime: payload.settlement_time ? new Date(payload.settlement_time) : now,
        updatedAt: now,
      });

      if (updatedPayment) {
        // Update status order menjadi completed
        await this.orderModel.update(orderId, {
          status: "completed",
          updatedAt: now,
        });

        await this.processPromoIfPaid(orderId);
        logger.info({ paymentId, orderId, transactionStatus }, "QRIS payment berhasil dilunasi via webhook Midtrans");
      }
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
        const updatedPayment = await this.model.markAsPaidById((payment as any)._id.toString(), {
          paidAmount,
          changeAmount: 0,
          settlementTime: statusRes.settlementTime ? new Date(statusRes.settlementTime) : now,
          updatedAt: now,
        });

        if (updatedPayment) {
          await this.orderModel.update((payment as any).orderId, {
            status: "completed",
            updatedAt: now,
          });

          await this.processPromoIfPaid((payment as any).orderId);
        }
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

    let transitionedToPaid = false;
    let updated;

    if (data.status === "paid" && (existing as any).status !== "paid") {
      updated = await this.model.markAsPaidById(id, { ...data, updatedAt: new Date() });
      if (updated) {
        transitionedToPaid = true;
      }
    } else {
      updated = await this.model.update(id, { ...data, updatedAt: new Date() });
    }

    if (transitionedToPaid) {
      await this.orderModel.update((existing as any).orderId, {
        status: "completed",
        updatedAt: new Date(),
      });
      await this.processPromoIfPaid((existing as any).orderId);
    } else if (data.status && data.status !== "paid" && data.status !== (existing as any).status) {
      await this.orderModel.update((existing as any).orderId, {
        status: "pending",
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