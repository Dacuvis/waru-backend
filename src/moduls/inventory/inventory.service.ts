import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { InventoryModel } from "./inventory.model";
import type { CreateInventoryItem, UpdateInventoryItem, AdjustStock } from "./inventory.type";

export class InventoryService {
  private model = new InventoryModel();

  async getAll(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil daftar inventory");

    const { data, total } = await this.model.getAll(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string) {
    const item = await this.model.getById(id);
    if (!item) throw new AppError(`Item inventory dengan id ${id} tidak ditemukan`, 404, "E30");
    logger.info({ inventoryId: id }, "Mengambil inventory by id");
    return item;
  }

  async getLowStock(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil item inventory dengan stok rendah");

    const { data, total } = await this.model.getLowStock(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getByCategory(category: string, query: PaginationQuery) {
    const validCategories = ["food", "beverage", "packaging", "equipment", "other"];
    if (!validCategories.includes(category)) throw new AppError("Kategori tidak valid", 400, "E10");

    const { page, limit, skip } = parsePagination(query);
    logger.info({ category, page, limit }, "Mengambil inventory by category");

    const { data, total } = await this.model.getByCategory(category, skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async create(data: CreateInventoryItem) {
    const now = new Date();
    const item = { ...data, createdAt: now, updatedAt: now };

    const result = await this.model.create(item);
    logger.info({ inventoryId: result.insertedId, name: data.name }, "Item inventory baru dibuat");
    return result;
  }

  async update(id: string, data: UpdateInventoryItem) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Item inventory dengan id ${id} tidak ditemukan`, 404, "E30");

    const updated = await this.model.update(id, { ...data, updatedAt: new Date() });
    logger.info({ inventoryId: id }, "Item inventory diupdate");
    return updated;
  }

  async adjustStock(id: string, data: AdjustStock) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Item inventory dengan id ${id} tidak ditemukan`, 404, "E30");

    const currentQty = (existing as any).quantity as number;
    const newQty = currentQty + data.amount;
    if (newQty < 0) {
      throw new AppError(
        `Stok tidak cukup. Stok saat ini: ${currentQty}, pengurangan: ${Math.abs(data.amount)}`,
        400,
        "E10",
      );
    }

    const updated = await this.model.adjustStock(id, data.amount, new Date());
    if (!updated) {
      throw new AppError("Stok berubah saat diproses dan jumlahnya tidak lagi mencukupi", 409);
    }
    logger.info({ inventoryId: id, amount: data.amount, newQty }, "Stok inventory disesuaikan");
    return updated;
  }

  async delete(id: string) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Item inventory dengan id ${id} tidak ditemukan`, 404, "E30");

    const deleted = await this.model.delete(id);
    logger.info({ inventoryId: id }, "Item inventory dihapus");
    return deleted;
  }
}
