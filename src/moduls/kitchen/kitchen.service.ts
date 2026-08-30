import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { KitchenModel } from "./kitchen.model";
import { OrderModel } from "../cashier/cashier.model";
import type { CreateKitchenItem, UpdateKitchenItem } from "./kitchen.type";

import { MenuModel } from "../menu/menu.model";
import { InventoryModel } from "../inventory/inventory.model";

export class KitchenService {
  private model = new KitchenModel();
  private orderModel = new OrderModel();
  private menuModel = new MenuModel();
  private inventoryModel = new InventoryModel();

  private async syncMissingOrdersToKitchen() {
    try {
      const { data: allOrders } = await this.orderModel.getAll(0, 100);
      for (const order of allOrders) {
        const orderIdStr = (order as any)._id?.toString();
        if (!orderIdStr) continue;

        const existing = await this.model.getByOrderId(orderIdStr);
        if (!existing) {
          const menuItems = Array.isArray((order as any).items)
            ? (order as any).items.map((item: any) => ({
                menuId: item.menuId?.toString() || item._id?.toString() || item.id?.toString(),
                name: item.name || "Item Menu",
                quantity: item.quantity || 1,
                notes: (order as any).notes,
              }))
            : [];

          await this.model.create({
            orderId: orderIdStr,
            tableNumber: (order as any).tableNumber || 1,
            menuItems,
            notes: (order as any).notes,
            status: "pending",
            createdAt: (order as any).createdAt || new Date(),
            updatedAt: new Date(),
          });
        }
      }
    } catch (err) {
      logger.warn({ err }, "Auto-sync orders to kitchen queue failed");
    }
  }

  async getAll(query: PaginationQuery) {
    await this.syncMissingOrdersToKitchen();
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil daftar kitchen orders");

    const { data, total } = await this.model.getAll(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string) {
    const item = await this.model.getById(id);
    if (!item) throw new AppError(`Kitchen order dengan id ${id} tidak ditemukan`, 404, "E30");
    logger.info({ kitchenId: id }, "Mengambil kitchen order by id");
    return item;
  }

  async getByStatus(status: string, query: PaginationQuery) {
    const validStatuses = ["pending", "in_progress", "done", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new AppError("Status tidak valid", 400, "E10");
    }

    await this.syncMissingOrdersToKitchen();
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
    if (!existing) throw new AppError(`Kitchen order dengan id ${id} tidak ditemukan`, 404, "E30");

    // Automatic Inventory Deduction upon kitchen completion (Idempotent & Stock Safe)
    if (data.status === "done" && !(existing as any).inventoryDeducted) {
      // ATOMIC CONCURRENCY LOCK: Prevent double deduction under race conditions/duplicate requests
      const lockAcquired = await this.model.markDeductionLock(id);
      if (!lockAcquired) {
        // Deduction already processed or being processed concurrently by another request
        const currentUpdated = await this.model.getById(id);
        return currentUpdated || existing;
      }

      try {
        const requiredConsumption = new Map<string, { inventoryId: string; requiredQty: number }>();
        const kitchenMenuItems = (existing as any).menuItems || [];

        for (const item of kitchenMenuItems) {
          // 1. Primary lookup by menuId directly on kitchen item
          let menuDoc = (item as any).menuId ? await this.menuModel.findById((item as any).menuId) : null;

          // 2. Secondary lookup via parent Order document if menuId missing on kitchen item
          if (!menuDoc && (existing as any).orderId) {
            try {
              const parentOrder = await this.orderModel.getById((existing as any).orderId);
              if (parentOrder && Array.isArray((parentOrder as any).items)) {
                const matchedOrderItem = (parentOrder as any).items.find(
                  (oi: any) => oi.name === item.name || oi.menuId
                );
                if (matchedOrderItem && matchedOrderItem.menuId) {
                  menuDoc = await this.menuModel.findById(matchedOrderItem.menuId);
                }
              }
            } catch (err) {
              // Ignore lookup error
            }
          }

          // 3. Tertiary fallback by exact/trimmed name lookup
          if (!menuDoc && item.name) {
            menuDoc = await this.menuModel.findByName(item.name.trim());
          }

          logger.info(
            { itemName: item.name, menuId: (item as any).menuId, found: !!menuDoc, ingredientsCount: (menuDoc as any)?.ingredients?.length },
            "Kitchen completion menu lookup"
          );

          if (menuDoc && Array.isArray((menuDoc as any).ingredients) && (menuDoc as any).ingredients.length > 0) {
            for (const ing of (menuDoc as any).ingredients) {
              const invIdStr = String(ing.inventoryId);
              const totalIngQty = Number(ing.quantity || 0) * Number(item.quantity || 1);
              if (totalIngQty > 0) {
                const currentRec = requiredConsumption.get(invIdStr);
                if (currentRec) {
                  currentRec.requiredQty += totalIngQty;
                } else {
                  requiredConsumption.set(invIdStr, { inventoryId: invIdStr, requiredQty: totalIngQty });
                }
              }
            }
          }
        }

        // STRICT ATOMICITY: Validate stock availability for ALL ingredients BEFORE deducting ANY stock
        for (const [, { inventoryId, requiredQty }] of requiredConsumption) {
          const invItem = await this.inventoryModel.getById(inventoryId);
          if (!invItem) {
            throw new AppError(`Item inventaris (ID: ${inventoryId}) tidak ditemukan`, 404, "E30");
          }
          const availableQty = Number((invItem as any).quantity || 0);
          if (availableQty < requiredQty) {
            throw new AppError(
              `Stok inventaris '${(invItem as any).name}' tidak mencukupi untuk menyelesaikan pesanan (Dibutuhkan: ${requiredQty}, Stok Tersedia: ${availableQty})`,
              400,
              "E10"
            );
          }
        }

        // Batch deduct all ingredients
        const now = new Date();
        for (const [, { inventoryId, requiredQty }] of requiredConsumption) {
          await this.inventoryModel.adjustStock(inventoryId, -requiredQty, now);
        }

        // Ensure flags remain set
        (data as any).inventoryDeducted = true;
        (data as any).inventoryDeductedAt = now;
      } catch (err) {
        // Release lock if stock check or deduction failed so user can retry after restocking
        await this.model.releaseDeductionLock(id);
        throw err;
      }
    }

    const updated = await this.model.update(id, { ...data, updatedAt: new Date() });
    logger.info({ kitchenId: id, status: data.status }, "Kitchen order diupdate");
    return updated;
  }

  async delete(id: string) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Kitchen order dengan id ${id} tidak ditemukan`, 404, "E30");

    const deleted = await this.model.delete(id);
    logger.info({ kitchenId: id }, "Kitchen order dihapus");
    return deleted;
  }
}