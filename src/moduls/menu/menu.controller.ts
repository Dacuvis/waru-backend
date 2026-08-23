import { MenuService } from "./menu.service";
import type { Menu, MenuFilter, typefood, UpdateMenu } from "./menu.type";

const service = new MenuService();

export class MenuController {
  async findAll({ query }: { query: { page?: string; limit?: string; category?: typefood; isAvailable?: string } }) {
    const filter: MenuFilter = {
      category: query.category as typefood,
      isAvailable:
        query.isAvailable === "true"
          ? true
          : query.isAvailable === "false"
          ? false
          : undefined,
    }
    return await service.findAll(query,filter);
  }

  async findById({ params }: { params: { id: string } }) {
    return await service.findById(params.id);
  }

  async create({ body }: { body: Menu }) {
    return await service.create(body);
  }

  async update({ params, body }: { params: { id: string }; body: UpdateMenu }) {
    return await service.update(params.id, body);
  }

  async delete({ params }: { params: { id: string } }) {
    return await service.delete(params.id);
  }
}