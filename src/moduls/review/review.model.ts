import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { Review, UpdateReview } from "./review.type";

export class ReviewModel {
  private collection = db.collection("review");

  async getAll(skip: number, limit: number) {
    const [data, total] = await Promise.all([
      this.collection.find().sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(),
    ]);
    return { data, total };
  }

  async getById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async getPublished(skip: number, limit: number) {
    const filter = { isPublished: true };
    const [data, total] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { data, total };
  }

  async getByTarget(target: string, targetId: string | undefined, skip: number, limit: number) {
    const filter: any = { target };
    if (targetId) filter.targetId = targetId;

    const [data, total] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { data, total };
  }

  async getAverageRating(target?: string, targetId?: string) {
    const match: any = {};
    if (target) match.target = target;
    if (targetId) match.targetId = targetId;

    const result = await this.collection
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ])
      .toArray();

    return result[0] ?? { averageRating: 0, totalReviews: 0 };
  }

  async create(review: Review) {
    return await this.collection.insertOne(review as any);
  }

  async update(id: string, data: UpdateReview & { updatedAt: Date }) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: "after" },
    );
  }

  async delete(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndDelete({ _id: new ObjectId(id) });
  }
}
