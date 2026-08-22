import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { Order, UpdateOrder, Payment, UpdatePayment } from "./cashier.type";

// ─── Orders Model ──────────────────────────────────────────────────────────

export class OrderModel {
  private collection = db.collection("orders");

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

  async create(order: Order) {
    return await this.collection.insertOne(order as any);
  }

  async update(id: string, data: UpdateOrder & { totalAmount?: number; updatedAt: Date }) {
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

// ─── Payment Model ──────────────────────────────────────────────────────────

export class PaymentModel {
  private collection = db.collection("payment");
  private orderIndexReady = this.collection.createIndex(
    { orderId: 1 },
    { unique: true, name: "payment_order_unique" },
  );

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
    if (!ObjectId.isValid(orderId)) return null
    await this.orderIndexReady;
    return await this.collection.findOne({ orderId });
  }

  async create(payment: Payment) {
    await this.orderIndexReady;
    return await this.collection.insertOne(payment as any);
  }

  async update(id: string, data: UpdatePayment & { updatedAt: Date }) {
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
