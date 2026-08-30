import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { KitchenItem, CreateKitchenItem, UpdateKitchenItem } from "./kitchen.type";

export class KitchenModel {
  private collection = db.collection("kitchen");

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

  async getByOrderId(orderId: string) {
    return await this.collection.findOne({ orderId });
  }

  async getByStatus(status: string, skip: number, limit: number) {
    const [data, total] = await Promise.all([
      this.collection
        .find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({ status }),
    ]);
    return { data, total };
  }

  async create(item: KitchenItem) {
    return await this.collection.insertOne(item as any);
  }

  async update(id: string, item: UpdateKitchenItem & { updatedAt: Date }) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: item },
      { returnDocument: "after" },
    );
  }

  async markDeductionLock(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const res = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id), inventoryDeducted: { $ne: true } },
      { $set: { inventoryDeducted: true, inventoryDeductedAt: new Date() } },
      { returnDocument: "after" }
    );
    return !!res;
  }

  async releaseDeductionLock(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $unset: { inventoryDeducted: "", inventoryDeductedAt: "" } }
    );
  }

  async delete(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndDelete({ _id: new ObjectId(id) });
  }
}