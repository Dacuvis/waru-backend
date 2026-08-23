import { OrderService, PaymentService } from "./cashier.service";
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
  async getAll({ query }: { query: { page?: string; limit?: string } }) {
    return await orderService.getAll(query);
  }

  async getById({ params }: { params: { id: string } }) {
    return await orderService.getById(params.id);
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

  async create({ body }: { body: CreateOrder }) {
    return await orderService.create(body);
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
  async getAll({ query }: { query: { page?: string; limit?: string } }) {
    return await paymentService.getAll(query);
  }

  async getById({ params }: { params: { id: string } }) {
    return await paymentService.getById(params.id);
  }

  async getByOrderId({ params }: { params: { orderId: string } }) {
    return await paymentService.getByOrderId(params.orderId);
  }

  async create({ body }: { body: CreatePayment }) {
    return await paymentService.create(body);
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
