import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { KitchenModel } from "./kitchen.model";
import type { CreateKitchenItem, UpdateKitchenItem } from "./kitchen.type";

export class KitchenService {
  private model = new KitchenModel();

  async getAll(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil daftar kitchen orders");

    const { data, total } = await this.model.getAll(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string) {
    const item = await this.model.getById(id);
    if (!item) throw new AppError(`Kitchen order dengan id ${id} tidak ditemukan`, 404);
    logger.info({ kitchenId: id }, "Mengambil kitchen order by id");
    return item;
  }

  async getByStatus(status: string, query: PaginationQuery) {
    const validStatuses = ["pending", "in_progress", "done", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new AppError("Status tidak valid", 400);
    }

    const { page, limit, skip } = parsePagination(query);
    logger.info({ status, page, limit }, "Mengambil kitchen orders by status");

    const { data, total } = await this.model.getByStatus(status, skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async create(item: CreateKitchenItem) {
    const now = new Date();
    const newItem = {
      ...item,
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.model.create(newItem);
    logger.info({ kitchenId: result.insertedId }, "Kitchen order baru dibuat");
    return result;
  }

  async update(id: string, data: UpdateKitchenItem) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Kitchen order dengan id ${id} tidak ditemukan`, 404);

    const updated = await this.model.update(id, { ...data, updatedAt: new Date() });
    logger.info({ kitchenId: id, status: data.status }, "Kitchen order diupdate");
    return updated;
  }

  async delete(id: string) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Kitchen order dengan id ${id} tidak ditemukan`, 404);

    const deleted = await this.model.delete(id);
    logger.info({ kitchenId: id }, "Kitchen order dihapus");
    return deleted;
  }
}
