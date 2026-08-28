import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { Promo, UpdatePromo } from "./promo.type";

export class PromoModel {
  private collection = db.collection("promo");

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

  async getByCode(code: string) {
    return await this.collection.findOne({ code: code.toUpperCase() });
  }

  async getActive(skip: number, limit: number) {
    const now = new Date();
    const filter = {
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    };
    const [data, total] = await Promise.all([
      this.collection.find(filter).sort({ endDate: 1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { data, total };
  }

  async create(promo: Promo) {
    return await this.collection.insertOne(promo as any);
  }

  async update(id: string, data: Partial<Promo> & { updatedAt: Date }) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: "after" },
    );
  }

  async consumeUsageByCode(code: string, now: Date) {
    return await this.collection.findOneAndUpdate(
      {
        code: code.toUpperCase(),
        status: "active",
        startDate: { $lte: now },
        endDate: { $gte: now },
        $or: [
          { usageLimit: { $exists: false } },
          { usageLimit: null },
          { $expr: { $lt: [{ $ifNull: ["$usageCount", 0] }, "$usageLimit"] } },
        ],
      },
      { $inc: { usageCount: 1 }, $set: { updatedAt: now } },
      { returnDocument: "after" },
    );
  }

  async delete(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndDelete({ _id: new ObjectId(id) });
  }
}