import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import { parsePagination, buildPaginationResult, type PaginationQuery } from "../../utils/pagination/pagination";
import { usersModel } from "./users.model";
import type { CreateUser, UpdateUser } from "./users.type";

export class usersService {
  private userModel = new usersModel();

  async create(d: CreateUser) {
    if (!d.name) throw new AppError("Berikan Nama ya... ganteng", 404, "E30");
    if (!d.email) throw new AppError("Berikan Email ya.. ganteng", 404, "E30");
    if (!d.password) throw new AppError("Berikan Password ya... ganteng", 404, "E30");

    const result = await this.userModel.create(d);
    logger.info({ userId: result.insertedId }, "User baru berhasil dibuat");
    return result;
  }

  async view(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);

    logger.info({ page, limit }, "Mengambil daftar users");

    const { data, total } = await this.userModel.view(skip, limit);

    return buildPaginationResult(data, total, page, limit);
  }

  async update(id: string, d: UpdateUser) {
    if (!id) throw new AppError("ID user wajib diisi", 400, "E10");

    const updated = await this.userModel.update(id, d);
    if (!updated) throw new AppError("User tidak ditemukan", 404);

    logger.info({ userId: id }, "User berhasil diupdate");
    return updated;
  }

  async delete(id: string) {
    if (!id) throw new AppError("ID user wajib diisi", 400, "E10");

    const deleted = await this.userModel.delete(id);
    if (!deleted) throw new AppError("User tidak ditemukan", 404);

    logger.info({ userId: id }, "User berhasil dihapus");
    return deleted;
  }
}
