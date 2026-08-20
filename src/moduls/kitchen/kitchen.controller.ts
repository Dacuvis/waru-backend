import { KitchenService } from "./kitchen.service";
import type { CreateKitchenItem, UpdateKitchenItem } from "./kitchen.type";

const service = new KitchenService();

export class KitchenController {
  async getAll({ query }: { query: { page?: string; limit?: string } }) {
    return await service.getAll(query);
  }

  async getById({ params }: { params: { id: string } }) {
    return await service.getById(params.id);
  }

  async getByStatus({
    params,
    query,
  }: {
    params: { status: string };
    query: { page?: string; limit?: string };
  }) {
    return await service.getByStatus(params.status, query);
  }

  async create({ body }: { body: CreateKitchenItem }) {
    return await service.create(body);
  }

  async update({ params, body }: { params: { id: string }; body: UpdateKitchenItem }) {
    return await service.update(params.id, body);
  }

  async delete({ params }: { params: { id: string } }) {
    return await service.delete(params.id);
  }
}
