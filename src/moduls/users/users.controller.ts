import { usersService } from "./users.service";
import type { CreateUser, UpdateUser } from "./users.type";

export class usersController {
  private userService = new usersService();

  async create({ body }: { body: CreateUser }) {
    return await this.userService.create(body);
  }

  async view({ query }: { query: { page?: string; limit?: string } }) {
    return await this.userService.view(query);
  }

  async update({ params, body }: { params: { id: string }; body: UpdateUser }) {
    return await this.userService.update(params.id, body);
  }

  async delete({ params }: { params: { id: string } }) {
    return await this.userService.delete(params.id);
  }
}
