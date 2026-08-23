import crypto from "node:crypto";
import { getMidtransConfig } from "../../config/midtrans";
import { AppError } from "../error/error-global-handler";
import { logger } from "../logger/logger";

export interface MidtransItemDetail {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface MidtransQrisChargeRequest {
  orderId: string;
  grossAmount: number;
  customerName?: string;
  items?: MidtransItemDetail[];
}

export interface MidtransAction {
  name: string;
  method: string;
  url: string;
}

export interface MidtransQrisChargeResponse {
  statusCode: string;
  statusMessage: string;
  transactionId: string;
  orderId: string;
  grossAmount: number;
  currency: string;
  paymentType: string;
  transactionTime: string;
  transactionStatus: string;
  fraudStatus?: string;
  qrString?: string;
  qrUrl?: string;
  expiryTime?: string;
  actions?: MidtransAction[];
  raw: Record<string, any>;
}

export interface MidtransStatusResponse {
  statusCode: string;
  statusMessage: string;
  transactionId: string;
  orderId: string;
  grossAmount: string;
  paymentType: string;
  transactionTime: string;
  transactionStatus: string;
  fraudStatus?: string;
  signatureKey?: string;
  settlementTime?: string;
  raw: Record<string, any>;
}

export class MidtransService {
  private getAuthHeader(): string {
    const config = getMidtransConfig();
    if (!config.serverKey) {
      throw new AppError("MIDTRANS_SERVER_KEY belum dikonfigurasi di .env", 500, "E50");
    }
    const token = Buffer.from(`${config.serverKey}:`).toString("base64");
    return `Basic ${token}`;
  }

  /**
   * Membuat transaksi QRIS melalui Midtrans Core API
   */
  async createQrisCharge(data: MidtransQrisChargeRequest): Promise<MidtransQrisChargeResponse> {
    const config = getMidtransConfig();
    const url = `${config.baseUrl}/charge`;

    const body: Record<string, any> = {
      payment_type: "qris",
      transaction_details: {
        order_id: data.orderId,
        gross_amount: Math.round(data.grossAmount),
      },
      qris: {
        acquirer: "gopay",
      },
    };

    if (data.items && data.items.length > 0) {
      body.item_details = data.items.map((item) => ({
        id: item.id.slice(0, 50),
        name: item.name.slice(0, 50),
        price: Math.round(item.price),
        quantity: item.quantity,
      }));
    }

    if (data.customerName) {
      body.customer_details = {
        first_name: data.customerName.slice(0, 50),
      };
    }

    logger.info({ url, orderId: data.orderId, amount: data.grossAmount }, "Membuat charge QRIS Midtrans");

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      logger.error({ error }, "Gagal menghubungi Midtrans API");
      throw new AppError("Gagal menghubungi layanan Midtrans", 502, "E99");
    }

    const json = (await response.json()) as Record<string, any>;

    if (!response.ok || (json.status_code && !["200", "201"].includes(json.status_code))) {
      logger.error({ status: response.status, json }, "Error response dari Midtrans charge");
      const errorMessage = json.status_message || "Gagal membuat transaksi QRIS di Midtrans";
      throw new AppError(`Midtrans Error: ${errorMessage}`, 400, "E10");
    }

    // Ekstrak QR Code URL dan QR String
    const actions: MidtransAction[] = json.actions || [];
    const qrAction = actions.find((a) => a.name === "generate-qr-code");
    const qrUrl = qrAction?.url;
    const qrString = json.qr_string || undefined;

    return {
      statusCode: json.status_code,
      statusMessage: json.status_message,
      transactionId: json.transaction_id,
      orderId: json.order_id,
      grossAmount: parseFloat(json.gross_amount) || data.grossAmount,
      currency: json.currency || "IDR",
      paymentType: json.payment_type || "qris",
      transactionTime: json.transaction_time,
      transactionStatus: json.transaction_status,
      fraudStatus: json.fraud_status,
      qrString,
      qrUrl,
      expiryTime: json.expiry_time,
      actions,
      raw: json,
    };
  }

  /**
   * Cek status transaksi langsung ke Midtrans API
   */
  async getTransactionStatus(orderIdOrTransactionId: string): Promise<MidtransStatusResponse> {
    const config = getMidtransConfig();
    const url = `${config.baseUrl}/${orderIdOrTransactionId}/status`;

    logger.info({ orderIdOrTransactionId }, "Memeriksa status transaksi Midtrans");

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: this.getAuthHeader(),
        },
      });
    } catch (error) {
      logger.error({ error }, "Gagal menghubungi Midtrans status API");
      throw new AppError("Gagal memeriksa status ke Midtrans", 502, "E99");
    }

    const json = (await response.json()) as Record<string, any>;

    if (!response.ok && response.status !== 200) {
      logger.warn({ status: response.status, json }, "Gagal cek status transaksi Midtrans");
      throw new AppError(json.status_message || "Transaksi tidak ditemukan di Midtrans", 404, "E30");
    }

    return {
      statusCode: json.status_code,
      statusMessage: json.status_message,
      transactionId: json.transaction_id,
      orderId: json.order_id,
      grossAmount: json.gross_amount,
      paymentType: json.payment_type,
      transactionTime: json.transaction_time,
      transactionStatus: json.transaction_status,
      fraudStatus: json.fraud_status,
      signatureKey: json.signature_key,
      settlementTime: json.settlement_time,
      raw: json,
    };
  }

  /**
   * Membatalkan transaksi di Midtrans
   */
  async cancelTransaction(orderIdOrTransactionId: string): Promise<Record<string, any>> {
    const config = getMidtransConfig();
    const url = `${config.baseUrl}/${orderIdOrTransactionId}/cancel`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: this.getAuthHeader(),
        },
      });
    } catch (error) {
      logger.error({ error }, "Gagal membatalkan transaksi Midtrans");
      throw new AppError("Gagal membatalkan transaksi di Midtrans", 502, "E99");
    }

    return (await response.json()) as Record<string, any>;
  }

  /**
   * Verifikasi signature key webhook/notifikasi dari Midtrans
   * Rumus: SHA512(order_id + status_code + gross_amount + ServerKey)
   */
  verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string,
  ): boolean {
    const config = getMidtransConfig();
    if (!config.serverKey) return false;

    const payload = `${orderId}${statusCode}${grossAmount}${config.serverKey}`;
    const calculatedHash = crypto.createHash("sha512").update(payload).digest("hex");

    return calculatedHash.toLowerCase() === signatureKey.toLowerCase();
  }
}

export const midtransService = new MidtransService();
