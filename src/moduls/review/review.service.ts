import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { ReviewModel } from "./review.model";
import type { CreateReview, UpdateReview } from "./review.type";

export class ReviewService {
  private model = new ReviewModel();

  private validateTarget(target?: string, targetId?: string) {
    const validTargets = ["menu", "service", "overall"];
    if (target && !validTargets.includes(target)) {
      throw new AppError("Target review tidak valid", 400, "E10");
    }
    if (target === "menu" && !targetId) {
      throw new AppError("targetId wajib diisi untuk review menu", 400, "E10");
    }
  }

  async getAll(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil daftar review");

    const { data, total } = await this.model.getAll(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string) {
    const review = await this.model.getById(id);
    if (!review) throw new AppError(`Review dengan id ${id} tidak ditemukan`, 404, "E30");
    logger.info({ reviewId: id }, "Mengambil review by id");
    return review;
  }

  async getPublished(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil review yang dipublikasikan");

    const { data, total } = await this.model.getPublished(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getByTarget(
    target: string,
    query: PaginationQuery & { targetId?: string },
  ) {
    const validTargets = ["menu", "service", "overall"];
    if (!validTargets.includes(target)) throw new AppError("Target review tidak valid", 400, "E10");

    const { page, limit, skip } = parsePagination(query);
    const targetId = query.targetId;

    logger.info({ target, targetId, page, limit }, "Mengambil review by target");

    const { data, total } = await this.model.getByTarget(target, targetId, skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getAverageRating(query: { target?: string; targetId?: string }) {
    this.validateTarget(query.target, query.targetId);
    logger.info(query, "Mengambil rata-rata rating");
    return await this.model.getAverageRating(query.target, query.targetId);
  }

  async create(data: CreateReview) {
    this.validateTarget(data.target, data.targetId);
    const now = new Date();
    const review = {
      ...data,
      isPublished: false,  // default draft, perlu publish manual
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.model.create(review);
    logger.info(
      { reviewId: result.insertedId, rating: data.rating, target: data.target },
      "Review baru dibuat",
    );
    return result;
  }

  async update(id: string, data: UpdateReview) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Review dengan id ${id} tidak ditemukan`, 404, "E30");

    this.validateTarget(
      data.target ?? (existing as any).target,
      data.targetId ?? (existing as any).targetId,
    );

    const updated = await this.model.update(id, { ...data, updatedAt: new Date() });
    logger.info({ reviewId: id }, "Review diupdate");
    return updated;
  }

  async delete(id: string) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Review dengan id ${id} tidak ditemukan`, 404, "E30");

    const deleted = await this.model.delete(id);
    logger.info({ reviewId: id }, "Review dihapus");
    return deleted;
  }
}
