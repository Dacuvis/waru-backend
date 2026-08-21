import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { InventoryItem, UpdateInventoryItem } from "./inventory.type";

export class InventoryModel {
  private collection = db.collection("inventory");

  async getAll(skip: number, limit: number) {
    const [data, total] = await Promise.all([
      this.collection.find().sort({ name: 1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(),
    ]);
    return { data, total };
  }

  async getById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async getLowStock(skip: number, limit: number) {
    // Item dengan quantity <= minimumStock
    const filter = { $expr: { $lte: ["$quantity", "$minimumStock"] } };
    const [data, total] = await Promise.all([
      this.collection.find(filter).sort({ quantity: 1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { data, total };
  }

  async getByCategory(category: string, skip: number, limit: number) {
    const [data, total] = await Promise.all([
      this.collection.find({ category }).sort({ name: 1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments({ category }),
    ]);
    return { data, total };
  }

  async create(item: InventoryItem) {
    return await this.collection.insertOne(item as any);
  }

  async update(id: string, data: UpdateInventoryItem & { updatedAt: Date }) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: "after" },
    );
  }

  async adjustStock(id: string, amount: number, updatedAt: Date) {
    if (!ObjectId.isValid(id)) return null;
    const filter: Record<string, unknown> = { _id: new ObjectId(id) };
    if (amount < 0) filter.quantity = { $gte: Math.abs(amount) };
    return await this.collection.findOneAndUpdate(
      filter,
      { $inc: { quantity: amount }, $set: { updatedAt } },
      { returnDocument: "after" },
    );
  }

  async delete(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndDelete({ _id: new ObjectId(id) });
  }
}
