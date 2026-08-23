import { Elysia } from "elysia";
import { authMiddleware } from "../../utils/auth/auth.middleware";
import { OrderController, PaymentController } from "./cashier.controller";
import {
  createOrderValidation,
  updateOrderValidation,
  deleteOrderValidation,
  getOrderByIdValidation,
  createPaymentValidation,
  updatePaymentValidation,
  deletePaymentValidation,
  getPaymentByIdValidation,
  getPaymentByOrderIdValidation,
  checkPaymentStatusValidation,
  midtransNotificationValidation,
} from "./cashier.validation";
import type {
  CreateOrder,
  UpdateOrder,
  CreatePayment,
  UpdatePayment,
  MidtransNotificationPayload,
} from "./cashier.type";

const orderCtrl = new OrderController();
const paymentCtrl = new PaymentController();

// ─── Orders Route : /orders ───────────────────────────────────────────────

export const ordersRoute = new Elysia({ prefix: "/orders" })
  .use(authMiddleware)

  // GET /orders?page=1&limit=10
  .get("/", ({ query }: { query: { page?: string; limit?: string } }) =>
    orderCtrl.getAll({ query }),
  )

  // GET /orders/:id
  .get(
    "/:id",
    ({ params }: { params: { id: string } }) => orderCtrl.getById({ params }),
    getOrderByIdValidation,
  )

  // GET /orders/status/:status
  .get(
    "/status/:status",
    ({
      params,
      query,
    }: {
      params: { status: string };
      query: { page?: string; limit?: string };
    }) => orderCtrl.getByStatus({ params, query }),
  )

  // POST /orders
  .post(
    "/",
    ({ body }: { body: CreateOrder }) => orderCtrl.create({ body }),
    createOrderValidation,
  )

  // PUT /orders/:id
  .put(
    "/:id",
    ({ params, body }: { params: { id: string }; body: UpdateOrder }) =>
      orderCtrl.update({ params, body }),
    updateOrderValidation,
  )

  // DELETE /orders/:id
  .delete(
    "/:id",
    ({ params }: { params: { id: string } }) => orderCtrl.delete({ params }),
    deleteOrderValidation,
  );

// ─── Payment Route : /payment ─────────────────────────────────────────────

export const paymentRoute = new Elysia({ prefix: "/payment" })
  // ─── Public Endpoints (Midtrans Webhook - Tidak butuh token JWT) ─────────
  .post(
    "/notification",
    ({ body }: { body: MidtransNotificationPayload }) =>
      paymentCtrl.handleNotification({ body }),
    midtransNotificationValidation,
  )
  .post(
    "/midtrans-webhook",
    ({ body }: { body: MidtransNotificationPayload }) =>
      paymentCtrl.handleNotification({ body }),
    midtransNotificationValidation,
  )

  // ─── Protected Cashier Endpoints (Wajib token JWT) ────────────────────────
  .guard((app) =>
    app
      .use(authMiddleware)

      // GET /payment?page=1&limit=10
      .get("/", ({ query }: { query: { page?: string; limit?: string } }) =>
        paymentCtrl.getAll({ query }),
      )

      // GET /payment/order/:orderId
      .get(
        "/order/:orderId",
        ({ params }: { params: { orderId: string } }) =>
          paymentCtrl.getByOrderId({ params }),
        getPaymentByOrderIdValidation,
      )

      // GET /payment/:id/status (Cek status transaksi ke Midtrans)
      .get(
        "/:id/status",
        ({ params }: { params: { id: string } }) =>
          paymentCtrl.checkStatus({ params }),
        checkPaymentStatusValidation,
      )

      // GET /payment/:id
      .get(
        "/:id",
        ({ params }: { params: { id: string } }) =>
          paymentCtrl.getById({ params }),
        getPaymentByIdValidation,
      )

      // POST /payment (Buat pembayaran Cash / QRIS Midtrans)
      .post(
        "/",
        ({ body }: { body: CreatePayment }) => paymentCtrl.create({ body }),
        createPaymentValidation,
      )

      // PUT /payment/:id
      .put(
        "/:id",
        ({ params, body }: { params: { id: string }; body: UpdatePayment }) =>
          paymentCtrl.update({ params, body }),
        updatePaymentValidation,
      )

      // DELETE /payment/:id
      .delete(
        "/:id",
        ({ params }: { params: { id: string } }) =>
          paymentCtrl.delete({ params }),
        deletePaymentValidation,
      ),
  );
