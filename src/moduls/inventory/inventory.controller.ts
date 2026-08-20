import { InventoryService } from "./inventory.service";
import type { CreateInventoryItem, UpdateInventoryItem, AdjustStock } from "./inventory.type";

const service = new InventoryService();

export class InventoryController {
  async getAll({ query }: { query: { page?: string; limit?: string } }) {
    return await service.getAll(query);
  }

  async getById({ params }: { params: { id: string } }) {
    return await service.getById(params.id);
  }

  async getLowStock({ query }: { query: { page?: string; limit?: string } }) {
    return await service.getLowStock(query);
  }

  async getByCategory({
    params,
    query,
  }: {
    params: { category: string };
    query: { page?: string; limit?: string };
  }) {
    return await service.getByCategory(params.category, query);
  }

  async create({ body }: { body: CreateInventoryItem }) {
    return await service.create(body);
  }

  async update({ params, body }: { params: { id: string }; body: UpdateInventoryItem }) {
    return await service.update(params.id, body);
  }

  async adjustStock({ params, body }: { params: { id: string }; body: AdjustStock }) {
    return await service.adjustStock(params.id, body);
  }

  async delete({ params }: { params: { id: string } }) {
    return await service.delete(params.id);
  }
}
