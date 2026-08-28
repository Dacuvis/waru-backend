import { OrderService, PaymentService } from "./cashier.service";
import type { AuthUser } from "../../utils/auth/auth.middleware";
import type {
  CreateOrder,
  UpdateOrder,
  CreatePayment,
  UpdatePayment,
  MidtransNotificationPayload,
} from "./cashier.type";

const orderService = new OrderService();
const paymentService = new PaymentService();

// ─── Order Controller ──────────────────────────────────────────────────────

export class OrderController {
  async getAll({ query, user }: { query: { page?: string; limit?: string }; user?: AuthUser }) {
    return await orderService.getAll(query, user);
  }

  async getById({ params, user }: { params: { id: string }; user?: AuthUser }) {
    return await orderService.getById(params.id, user);
  }

  async getByStatus({
    params,
    query,
  }: {
    params: { status: string };
    query: { page?: string; limit?: string };
  }) {
    return await orderService.getByStatus(params.status, query);
  }

  async create({ body, user }: { body: CreateOrder; user?: AuthUser }) {
    return await orderService.create(body, user);
  }

  async update({ params, body }: { params: { id: string }; body: UpdateOrder }) {
    return await orderService.update(params.id, body);
  }

  async delete({ params }: { params: { id: string } }) {
    return await orderService.delete(params.id);
  }
}

// ─── Payment Controller ───────────────────────────────────────────────────

export class PaymentController {
  async getAll({ query, user }: { query: { page?: string; limit?: string }; user?: AuthUser }) {
    return await paymentService.getAll(query, user);
  }

  async getById({ params, user }: { params: { id: string }; user?: AuthUser }) {
    return await paymentService.getById(params.id, user);
  }

  async getByOrderId({ params, user }: { params: { orderId: string }; user?: AuthUser }) {
    return await paymentService.getByOrderId(params.orderId, user);
  }

  async create({ body, user }: { body: CreatePayment; user?: AuthUser }) {
    return await paymentService.create(body, user);
  }

  async update({ params, body }: { params: { id: string }; body: UpdatePayment }) {
    return await paymentService.update(params.id, body);
  }

  async delete({ params }: { params: { id: string } }) {
    return await paymentService.delete(params.id);
  }

  async checkStatus({ params }: { params: { id: string } }) {
    return await paymentService.checkStatus(params.id);
  }

  async handleNotification({ body }: { body: MidtransNotificationPayload }) {
    return await paymentService.handleNotification(body);
  }
}