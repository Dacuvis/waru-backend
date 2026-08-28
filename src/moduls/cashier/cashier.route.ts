import { Elysia } from "elysia";
import { authMiddleware, type AuthUser } from "../../utils/auth/auth.middleware";
import { requireRole } from "../../utils/auth/role.middleware";
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

  // Customer & Cashier
  .use(
    new Elysia()
      .use(requireRole(["customer", "cashier"]))

      // GET /orders?page=1&limit=10
      .get("/", ({ query, user }: { query: { page?: string; limit?: string }; user?: AuthUser }) =>
        orderCtrl.getAll({ query, user }),
      )

      // GET /orders/:id
      .get(
        "/:id",
        ({ params, user }: { params: { id: string }; user?: AuthUser }) =>
          orderCtrl.getById({ params, user }),
        getOrderByIdValidation,
      )

      // POST /orders
      .post(
        "/",
        ({ body, user }: { body: CreateOrder; user?: AuthUser }) =>
          orderCtrl.create({ body, user }),
        createOrderValidation,
      ),
  )

  // Cashier Only
  .use(
    new Elysia()
      .use(requireRole(["cashier"]))

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

      // PUT /orders/:id
      .put(
        "/:id",
        ({ params, body }: { params: { id: string }; body: UpdateOrder }) =>
          orderCtrl.update({ params, body }),
        updateOrderValidation,
      ),
  )

  // Boss Only
  .use(
    new Elysia()
      .use(requireRole(["boss"]))

      // DELETE /orders/:id
      .delete(
        "/:id",
        ({ params }: { params: { id: string } }) => orderCtrl.delete({ params }),
        deleteOrderValidation,
      ),
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

  // ─── Customer & Cashier ──────────────────────────────────────────────────
  .use(
    new Elysia()
      .use(authMiddleware)
      .use(requireRole(["customer", "cashier"]))

      // GET /payment?page=1&limit=10
      .get("/", ({ query, user }: { query: { page?: string; limit?: string }; user?: AuthUser }) =>
        paymentCtrl.getAll({ query, user }),
      )

      // GET /payment/order/:orderId
      .get(
        "/order/:orderId",
        ({ params, user }: { params: { orderId: string }; user?: AuthUser }) =>
          paymentCtrl.getByOrderId({ params, user }),
        getPaymentByOrderIdValidation,
      )

      // GET /payment/:id
      .get(
        "/:id",
        ({ params, user }: { params: { id: string }; user?: AuthUser }) =>
          paymentCtrl.getById({ params, user }),
        getPaymentByIdValidation,
      )

      // POST /payment
      .post(
        "/",
        ({ body, user }: { body: CreatePayment; user?: AuthUser }) =>
          paymentCtrl.create({ body, user }),
        createPaymentValidation,
      ),
  )

  // ─── Cashier Only ─────────────────────────────────────────────────────────
  .use(
    new Elysia()
      .use(authMiddleware)
      .use(requireRole(["cashier"]))

      // GET /payment/:id/status
      .get(
        "/:id/status",
        ({ params }: { params: { id: string } }) =>
          paymentCtrl.checkStatus({ params }),
        checkPaymentStatusValidation,
      )

      // PUT /payment/:id
      .put(
        "/:id",
        ({ params, body }: { params: { id: string }; body: UpdatePayment }) =>
          paymentCtrl.update({ params, body }),
        updatePaymentValidation,
      ),
  )

  // ─── Boss Only ────────────────────────────────────────────────────────────
  .use(
    new Elysia()
      .use(authMiddleware)
      .use(requireRole(["boss"]))

      // DELETE /payment/:id
      .delete(
        "/:id",
        ({ params }: { params: { id: string } }) =>
          paymentCtrl.delete({ params }),
        deletePaymentValidation,
      ),
  );