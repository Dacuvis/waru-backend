import { ReviewService } from "./review.service";
import type { CreateReview, UpdateReview } from "./review.type";

const service = new ReviewService();

export class ReviewController {
  async getAll({ query }: { query: { page?: string; limit?: string } }) {
    return await service.getAll(query);
  }

  async getById({ params }: { params: { id: string } }) {
    return await service.getById(params.id);
  }

  async getPublished({ query }: { query: { page?: string; limit?: string } }) {
    return await service.getPublished(query);
  }

  async getByTarget({
    params,
    query,
  }: {
    params: { target: string };
    query: { page?: string; limit?: string; targetId?: string };
  }) {
    return await service.getByTarget(params.target, query);
  }

  async getAverageRating({
    query,
  }: {
    query: { target?: string; targetId?: string };
  }) {
    return await service.getAverageRating(query);
  }

  async create({ body, user }: { body: CreateReview; user?: any }) {
    return await service.create(body, user);
  }

  async update({ params, body }: { params: { id: string }; body: UpdateReview }) {
    return await service.update(params.id, body);
  }

  async delete({ params }: { params: { id: string } }) {
    return await service.delete(params.id);
  }
}