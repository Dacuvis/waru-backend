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
} from "./cashier.validation";
import type { CreateOrder, UpdateOrder, CreatePayment, UpdatePayment } from "./cashier.type";

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
  .use(authMiddleware)

  // GET /payment?page=1&limit=10
  .get("/", ({ query }: { query: { page?: string; limit?: string } }) =>
    paymentCtrl.getAll({ query }),
  )

  // GET /payment/:id
  .get(
    "/:id",
    ({ params }: { params: { id: string } }) => paymentCtrl.getById({ params }),
    getPaymentByIdValidation,
  )

  // POST /payment
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
    ({ params }: { params: { id: string } }) => paymentCtrl.delete({ params }),
    deletePaymentValidation,
  );
