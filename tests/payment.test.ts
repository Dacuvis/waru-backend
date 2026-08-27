import { describe, expect, test, mock, beforeEach } from "bun:test";
import crypto from "node:crypto";
import { MidtransService } from "../src/utils/midtrans/midtrans.service";
import { getMidtransConfig } from "../src/config/midtrans";
import { Elysia } from "elysia";
import {
  createPaymentValidation,
  midtransNotificationValidation,
} from "../src/moduls/cashier/cashier.validation";

describe("Midtrans QRIS Integration", () => {
  beforeEach(() => {
    Bun.env.MIDTRANS_SERVER_KEY = "test-midtrans-server-key-12345";
    Bun.env.MIDTRANS_CLIENT_KEY = "test-midtrans-client-key-12345";
    Bun.env.MIDTRANS_MERCHANT_ID = "M-TEST-123";
    Bun.env.MIDTRANS_IS_PRODUCTION = "false";
  });

  test("loads configuration correctly from environment", () => {
    const config = getMidtransConfig();
    expect(config.serverKey).toBe("test-midtrans-server-key-12345");
    expect(config.clientKey).toBe("test-midtrans-client-key-12345");
    expect(config.merchantId).toBe("M-TEST-123");
    expect(config.isProduction).toBe(false);
    expect(config.baseUrl).toBe("https://api.sandbox.midtrans.com/v2");
  });

  test("correctly calculates and verifies Midtrans SHA512 signature key", () => {
    const service = new MidtransService();
    const orderId = "ORDER-65e123-1720000000";
    const statusCode = "200";
    const grossAmount = "75000.00";
    const serverKey = Bun.env.MIDTRANS_SERVER_KEY!;

    const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    const expectedSignature = crypto.createHash("sha512").update(payload).digest("hex");

    const isValid = service.verifySignature(orderId, statusCode, grossAmount, expectedSignature);
    expect(isValid).toBe(true);

    const isInvalid = service.verifySignature(orderId, statusCode, grossAmount, "wrong-signature-key");
    expect(isInvalid).toBe(false);
  });

  test("generates QRIS charge via Midtrans API mock", async () => {
    const service = new MidtransService();

    const mockResponseData = {
      status_code: "201",
      status_message: "QRIS transaction is created",
      transaction_id: "tx-test-uuid-9999",
      order_id: "ORDER-65e123-1720000000",
      gross_amount: "50000.00",
      currency: "IDR",
      payment_type: "qris",
      transaction_time: "2026-08-23 18:00:00",
      transaction_status: "pending",
      fraud_status: "accept",
      actions: [
        {
          name: "generate-qr-code",
          method: "GET",
          url: "https://api.sandbox.midtrans.com/v2/qris/tx-test-uuid-9999/qr-code",
        },
      ],
      qr_string: "00020101021226590014ID.LINKAJA.WWW0118936009110022361665021500000",
      expiry_time: "2026-08-23 18:15:00",
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      expect(url.toString()).toContain("/charge");
      const body = JSON.parse(init?.body as string);
      expect(body.payment_type).toBe("qris");
      expect(body.transaction_details.gross_amount).toBe(50000);
      expect(body.qris.acquirer).toBe("gopay");

      return new Response(JSON.stringify(mockResponseData), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    try {
      const result = await service.createQrisCharge({
        orderId: "ORDER-65e123-1720000000",
        grossAmount: 50000,
        customerName: "Rayyan",
        items: [
          { id: "item-1", name: "Nasi Goreng Spesial", price: 25000, quantity: 2 },
        ],
      });

      expect(result.statusCode).toBe("201");
      expect(result.transactionId).toBe("tx-test-uuid-9999");
      expect(result.qrString).toBe(mockResponseData.qr_string);
      expect(result.qrUrl).toBe("https://api.sandbox.midtrans.com/v2/qris/tx-test-uuid-9999/qr-code");
      expect(result.transactionStatus).toBe("pending");
      expect(result.grossAmount).toBe(50000);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("handles Midtrans status check API mock", async () => {
    const service = new MidtransService();

    const mockStatusData = {
      status_code: "200",
      status_message: "Midtrans payment notification",
      transaction_id: "tx-test-uuid-9999",
      order_id: "ORDER-65e123-1720000000",
      gross_amount: "50000.00",
      payment_type: "qris",
      transaction_time: "2026-08-23 18:00:00",
      transaction_status: "settlement",
      fraud_status: "accept",
      settlement_time: "2026-08-23 18:05:00",
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (url: string | URL | Request) => {
      expect(url.toString()).toContain("/ORDER-65e123-1720000000/status");
      return new Response(JSON.stringify(mockStatusData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    try {
      const status = await service.getTransactionStatus("ORDER-65e123-1720000000");
      expect(status.transactionStatus).toBe("settlement");
      expect(status.fraudStatus).toBe("accept");
      expect(status.grossAmount).toBe("50000.00");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("validates create payment schema for QRIS without requiring paidAmount", async () => {
    const app = new Elysia().post(
      "/payment",
      ({ body }) => {
        return { success: true, body };
      },
      createPaymentValidation,
    );

    // QRIS request without paidAmount
    const qrisResponse = await app.handle(
      new Request("http://localhost/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "65e1234567890abcdef12345",
          method: "qris",
        }),
      }),
    );

    expect(qrisResponse.status).toBe(200);
    const qrisJson = (await qrisResponse.json()) as any;
    expect(qrisJson.body.method).toBe("qris");
    expect(qrisJson.body.orderId).toBe("65e1234567890abcdef12345");

    // Invalid method rejection
    const invalidMethodResponse = await app.handle(
      new Request("http://localhost/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "65e1234567890abcdef12345",
          method: "bitcoin",
        }),
      }),
    );

    expect(invalidMethodResponse.status).toBe(422);
  });

  test("validates Midtrans webhook notification payload schema", async () => {
    const app = new Elysia().post(
      "/payment/notification",
      ({ body }) => {
        return { received: true, orderId: body.order_id };
      },
      midtransNotificationValidation,
    );

    const validPayload = {
      order_id: "ORDER-65e123-1720000000",
      status_code: "200",
      gross_amount: "50000.00",
      signature_key: "valid-signature-key-hex-hash",
      transaction_status: "settlement",
      fraud_status: "accept",
      transaction_id: "tx-test-123",
      payment_type: "qris",
    };

    const response = await app.handle(
      new Request("http://localhost/payment/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.received).toBe(true);
    expect(json.orderId).toBe("ORDER-65e123-1720000000");

    // Missing required signature_key
    const invalidPayload = {
      order_id: "ORDER-65e123-1720000000",
      status_code: "200",
    };

    const badResponse = await app.handle(
      new Request("http://localhost/payment/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPayload),
      }),
    );

    expect(badResponse.status).toBe(422);
  });
});