import { NotificationService } from "./notification.service";
import type { CreateNotification, UpdateNotification } from "./notification.type";

const service = new NotificationService();

export class NotificationController {
  async getAll({ query }: { query: { page?: string; limit?: string } }) {
    return await service.getAll(query);
  }

  async getById({ params }: { params: { id: string } }) {
    return await service.getById(params.id);
  }

  async getUnread({
    query,
  }: {
    query: { page?: string; limit?: string; target?: string };
  }) {
    return await service.getUnread(query);
  }

  async getByTarget({
    params,
    query,
  }: {
    params: { target: string };
    query: { page?: string; limit?: string };
  }) {
    return await service.getByTarget(params.target, query);
  }

  async create({ body }: { body: CreateNotification }) {
    return await service.create(body);
  }

  async update({ params, body }: { params: { id: string }; body: UpdateNotification }) {
    return await service.update(params.id, body);
  }

  async markAllRead({ query }: { query: { target?: string } }) {
    return await service.markAllRead(query.target);
  }

  async delete({ params }: { params: { id: string } }) {
    return await service.delete(params.id);
  }
}
