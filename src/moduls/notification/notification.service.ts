import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { NotificationModel } from "./notification.model";
import type { CreateNotification, UpdateNotification } from "./notification.type";
import type { AuthUser } from "../../utils/auth/auth.middleware";

export class NotificationService {
  private model = new NotificationModel();

  private validateTarget(target?: string) {
    const validTargets = ["kitchen", "cashier", "admin", "all"];
    if (target && !validTargets.includes(target)) {
      // Allow custom user IDs (alphanumeric, underscores, hyphens, colons)
      const isValidUserId = /^[a-zA-Z0-9_:-]+$/.test(target);
      if (!isValidUserId) {
        throw new AppError("Target notifikasi tidak valid", 400, "E10");
      }
    }
  }

  async getAll(query: PaginationQuery, user?: AuthUser) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil semua notifikasi");

    const filter: Record<string, any> = {};
    if (user?.role === "customer" && user?.id) {
      filter.target = { $in: [user.id, "all"] };
    }

    const { data, total } = await this.model.getAll(skip, limit, filter);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string, user?: AuthUser) {
    const notif = await this.model.getById(id);
    if (!notif) throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");

    if (user?.role === "customer" && user?.id) {
      if (notif.target !== user.id && notif.target !== "all") {
        throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");
      }
    } else if (user?.role === "kitchen") {
      if (notif.target !== "kitchen" && notif.target !== "all") {
        throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");
      }
    } else if (user?.role === "cashier") {
      if (notif.target !== "cashier" && notif.target !== "all") {
        throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");
      }
    }

    logger.info({ notifId: id }, "Mengambil notifikasi by id");
    return notif;
  }

  async getUnread(query: PaginationQuery & { target?: string }, user?: AuthUser) {
    let target = query.target;
    if (user?.role === "customer" && user?.id) {
      target = user.id;
    } else if (user?.role === "kitchen") {
      target = "kitchen";
    } else if (user?.role === "cashier") {
      target = "cashier";
    }

    this.validateTarget(target);
    const { page, limit, skip } = parsePagination(query);
    logger.info({ target, page, limit }, "Mengambil notifikasi belum dibaca");

    const { data, total } = await this.model.getUnread(target, skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getByTarget(target: string, query: PaginationQuery, user?: AuthUser) {
    let resolvedTarget = target;
    if (user?.role === "customer" && user?.id) {
      resolvedTarget = user.id;
    } else if (user?.role === "kitchen") {
      resolvedTarget = "kitchen";
    } else if (user?.role === "cashier") {
      resolvedTarget = "cashier";
    }

    this.validateTarget(resolvedTarget);

    const { page, limit, skip } = parsePagination(query);
    logger.info({ target: resolvedTarget, page, limit }, "Mengambil notifikasi by target");

    const { data, total } = await this.model.getByTarget(resolvedTarget, skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async create(data: CreateNotification, user?: AuthUser) {
    const now = new Date();
    const notif = { ...data, isRead: false, createdAt: now, updatedAt: now };

    const result = await this.model.create(notif);
    logger.info(
      { notifId: result.insertedId, type: data.type, target: data.target },
      "Notifikasi baru dibuat",
    );
    return result;
  }

  async update(id: string, data: UpdateNotification, user?: AuthUser) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");

    if (user?.role === "customer" && user?.id) {
      if (existing.target !== user.id) {
        throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");
      }
    } else if (user && user.role !== "boss" && user.role !== "admin") {
      if (existing.target !== user.role) {
        throw new AppError("Akses ditolak", 403, "E40");
      }
    }

    const updated = await this.model.update(id, { ...data, updatedAt: new Date() });
    logger.info({ notifId: id }, "Notifikasi diupdate");
    return updated;
  }

  async markAllRead(target?: string, user?: AuthUser) {
    let resolvedTarget = target;
    if (user?.role === "customer" && user?.id) {
      resolvedTarget = user.id;
    } else if (user?.role === "kitchen") {
      resolvedTarget = "kitchen";
    } else if (user?.role === "cashier") {
      resolvedTarget = "cashier";
    }

    this.validateTarget(resolvedTarget);
    const result = await this.model.markAllRead(resolvedTarget);
    logger.info({ target: resolvedTarget, modifiedCount: result.modifiedCount }, "Semua notifikasi ditandai dibaca");
    return { modifiedCount: result.modifiedCount };
  }

  async delete(id: string, user?: AuthUser) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");

    if (user?.role === "customer" && user?.id) {
      if (existing.target !== user.id) {
        throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");
      }
    } else if (user && user.role !== "boss" && user.role !== "admin") {
      if (existing.target !== user.role) {
        throw new AppError("Akses ditolak", 403, "E40");
      }
    }

    const deleted = await this.model.delete(id);
    logger.info({ notifId: id }, "Notifikasi dihapus");
    return deleted;
  }
}