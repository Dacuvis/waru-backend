import { NotificationService } from "./notification.service";
import type { CreateNotification, UpdateNotification } from "./notification.type";
import type { AuthUser } from "../../utils/auth/auth.middleware";

const service = new NotificationService();

export class NotificationController {
  async getAll({ query, user }: { query: { page?: string; limit?: string }; user?: AuthUser }) {
    return await service.getAll(query, user);
  }

  async getById({ params, user }: { params: { id: string }; user?: AuthUser }) {
    return await service.getById(params.id, user);
  }

  async getUnread({
    query,
    user,
  }: {
    query: { page?: string; limit?: string; target?: string };
    user?: AuthUser;
  }) {
    return await service.getUnread(query, user);
  }

  async getByTarget({
    params,
    query,
    user,
  }: {
    params: { target: string };
    query: { page?: string; limit?: string };
    user?: AuthUser;
  }) {
    return await service.getByTarget(params.target, query, user);
  }

  async create({ body, user }: { body: CreateNotification; user?: AuthUser }) {
    return await service.create(body, user);
  }

  async update({ params, body, user }: { params: { id: string }; body: UpdateNotification; user?: AuthUser }) {
    return await service.update(params.id, body, user);
  }

  async markAllRead({ query, user }: { query: { target?: string }; user?: AuthUser }) {
    return await service.markAllRead(query.target, user);
  }

  async delete({ params, user }: { params: { id: string }; user?: AuthUser }) {
    return await service.delete(params.id, user);
  }
}