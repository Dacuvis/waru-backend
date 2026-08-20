import { PromoService } from "./promo.service";
import type { CreatePromo, UpdatePromo, ApplyPromo } from "./promo.type";

const service = new PromoService();

export class PromoController {
  async getAll({ query }: { query: { page?: string; limit?: string } }) {
    return await service.getAll(query);
  }

  async getById({ params }: { params: { id: string } }) {
    return await service.getById(params.id);
  }

  async getActive({ query }: { query: { page?: string; limit?: string } }) {
    return await service.getActive(query);
  }

  async create({ body }: { body: CreatePromo }) {
    return await service.create(body);
  }

  async update({ params, body }: { params: { id: string }; body: UpdatePromo }) {
    return await service.update(params.id, body);
  }

  async applyPromo({ body }: { body: ApplyPromo }) {
    return await service.applyPromo(body);
  }

  async delete({ params }: { params: { id: string } }) {
    return await service.delete(params.id);
  }
}
