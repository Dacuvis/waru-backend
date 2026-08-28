import { t } from "elysia";

// ─── Order Validations ────────────────────────────────────────────────────

const orderItemSchema = t.Object({
  menuId: t.String({ minLength: 1, error: "menuId wajib diisi" }),
  name: t.String({ minLength: 1, error: "Nama item wajib diisi" }),
  quantity: t.Number({ minimum: 1, error: "Quantity minimal 1" }),
  price: t.Number({ minimum: 0, error: "Harga tidak boleh negatif" }),
});

export const createOrderValidation = {
  body: t.Object({
    tableNumber: t.Number({ minimum: 1, error: "Nomor meja minimal 1" }),
    customerName: t.Optional(t.String()),
    items: t.Array(orderItemSchema, { minItems: 1, error: "Minimal 1 item pesanan" }),
    promoCode: t.Optional(t.String()),
    notes: t.Optional(t.String()),
  }),
};

export const updateOrderValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
  body: t.Object({
    tableNumber: t.Optional(t.Number({ minimum: 1 })),
    customerName: t.Optional(t.String()),
    items: t.Optional(t.Array(orderItemSchema, { minItems: 1 })),
    status: t.Optional(
      t.Union([
        t.Literal("pending"),
        t.Literal("processing"),
        t.Literal("completed"),
        t.Literal("cancelled"),
      ], { error: "Status tidak valid" }),
    ),
    notes: t.Optional(t.String()),
  }),
};

export const deleteOrderValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

export const getOrderByIdValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

// ─── Payment Validations ──────────────────────────────────────────────────

export const createPaymentValidation = {
  body: t.Object({
    orderId: t.String({ minLength: 1, error: "orderId wajib diisi" }),
    paidAmount: t.Optional(t.Number({ minimum: 0, error: "Jumlah bayar tidak boleh negatif" })),
    method: t.Union([
      t.Literal("cash"),
      t.Literal("qris"),
    ], { error: "Metode pembayaran tidak valid" }),
    notes: t.Optional(t.String()),
  }),
};

export const updatePaymentValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
  body: t.Object({
    status: t.Optional(
      t.Union([
        t.Literal("pending"),
        t.Literal("paid"),
        t.Literal("failed"),
        t.Literal("refunded"),
      ], { error: "Status pembayaran tidak valid" }),
    ),
    paidAmount: t.Optional(t.Number({ minimum: 0 })),
    notes: t.Optional(t.String()),
  }),
};

export const deletePaymentValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

export const getPaymentByIdValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

export const getPaymentByOrderIdValidation = {
  params: t.Object({ orderId: t.String({ minLength: 1 }) }),
};

export const checkPaymentStatusValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

export const midtransNotificationValidation = {
  body: t.Object({
    order_id: t.String({ minLength: 1, error: "order_id wajib diisi" }),
    status_code: t.String({ minLength: 1, error: "status_code wajib diisi" }),
    gross_amount: t.String({ minLength: 1, error: "gross_amount wajib diisi" }),
    signature_key: t.String({ minLength: 1, error: "signature_key wajib diisi" }),
    transaction_status: t.String({ minLength: 1, error: "transaction_status wajib diisi" }),
  }, { additionalProperties: true }),
};