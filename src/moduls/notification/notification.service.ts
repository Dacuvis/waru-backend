import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { NotificationModel } from "./notification.model";
import type { CreateNotification, UpdateNotification } from "./notification.type";

export class NotificationService {
  private model = new NotificationModel();

  private validateTarget(target?: string) {
    const validTargets = ["kitchen", "cashier", "admin", "all"];
    if (target && !validTargets.includes(target)) {
      throw new AppError("Target notifikasi tidak valid", 400, "E10");
    }
  }

  async getAll(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil semua notifikasi");

    const { data, total } = await this.model.getAll(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string) {
    const notif = await this.model.getById(id);
    if (!notif) throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");
    logger.info({ notifId: id }, "Mengambil notifikasi by id");
    return notif;
  }

  async getUnread(query: PaginationQuery & { target?: string }) {
    this.validateTarget(query.target);
    const { page, limit, skip } = parsePagination(query);
    logger.info({ target: query.target, page, limit }, "Mengambil notifikasi belum dibaca");

    const { data, total } = await this.model.getUnread(query.target, skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getByTarget(target: string, query: PaginationQuery) {
    this.validateTarget(target);

    const { page, limit, skip } = parsePagination(query);
    logger.info({ target, page, limit }, "Mengambil notifikasi by target");

    const { data, total } = await this.model.getByTarget(target, skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async create(data: CreateNotification) {
    const now = new Date();
    const notif = { ...data, isRead: false, createdAt: now, updatedAt: now };

    const result = await this.model.create(notif);
    logger.info(
      { notifId: result.insertedId, type: data.type, target: data.target },
      "Notifikasi baru dibuat",
    );
    return result;
  }

  async update(id: string, data: UpdateNotification) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");

    const updated = await this.model.update(id, { ...data, updatedAt: new Date() });
    logger.info({ notifId: id }, "Notifikasi diupdate");
    return updated;
  }

  async markAllRead(target?: string) {
    this.validateTarget(target);
    const result = await this.model.markAllRead(target);
    logger.info({ target, modifiedCount: result.modifiedCount }, "Semua notifikasi ditandai dibaca");
    return { modifiedCount: result.modifiedCount };
  }

  async delete(id: string) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Notifikasi dengan id ${id} tidak ditemukan`, 404, "E30");

    const deleted = await this.model.delete(id);
    logger.info({ notifId: id }, "Notifikasi dihapus");
    return deleted;
  }
}
