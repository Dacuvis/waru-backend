import { MenuService } from "./menu.service";
import type { Menu, UpdateMenu } from "./menu.type";

const service = new MenuService();

export class MenuController {
  async findAll({ query }: { query: { page?: string; limit?: string } }) {
    return await service.findAll(query);
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