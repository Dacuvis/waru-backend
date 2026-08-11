import { AppError } from "../../utils/error/error-global-handler";
import { usersModel } from "./users.model";
import type { CreateUser, UpdateUser } from "./users.type";

export class usersService {
  private userModel = new usersModel
  
  async create(d: CreateUser) {
    if (!d.name) {
      throw new AppError("Berikan Nama ya... ganteng", 404)
    }

    if (!d.email) {
      throw new AppError("Berikan Email ya.. ganteng", 404)
    }

    if (!d.password) {
      throw new AppError("Berikan Password ya... ganteng", 404)
    }

    return await this.userModel.create(d)
  }

  async view() {
    return await this.userModel.view()
  }

  async update(id: string, d: UpdateUser) {
    if (!id) {
      throw new AppError("ID user wajib diisi", 400)
    }

    const updated = await this.userModel.update(id, d)

    if (!updated) {
      throw new AppError("User tidak ditemukan", 404)
    }

    return updated
  }

  async delete(id: string) {
    if (!id) {
      throw new AppError("ID user wajib diisi", 400)
    }

    const deleted = await this.userModel.delete(id)

    if (!deleted) {
      throw new AppError("User tidak ditemukan", 404)
    }

    return deleted
  }
}