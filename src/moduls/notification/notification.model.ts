import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { Notification, UpdateNotification } from "./notification.type";

export class NotificationModel {
  private collection = db.collection("notification");

  async getAll(skip: number, limit: number, filter: Record<string, any> = {}) {
    const [data, total] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { data, total };
  }

  async getById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async getUnread(target: string | undefined, skip: number, limit: number) {
    const filter: any = { isRead: false };
    if (target && target !== "all") {
      const systemTargets = ["kitchen", "cashier", "admin"];
      if (systemTargets.includes(target)) {
        filter.target = { $in: [target, "all"] };
      } else {
        filter.target = { $in: [target, "all"] };
      }
    }

    const [data, total] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { data, total };
  }

  async getByTarget(target: string, skip: number, limit: number) {
    const filter = { target: { $in: [target, "all"] } };
    const [data, total] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { data, total };
  }

  async create(notification: Notification) {
    return await this.collection.insertOne(notification as any);
  }

  async update(id: string, data: UpdateNotification & { updatedAt: Date }) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: "after" },
    );
  }

  async markAllRead(target?: string) {
    const filter: any = { isRead: false };
    if (target && target !== "all") {
      const systemTargets = ["kitchen", "cashier", "admin"];
      if (systemTargets.includes(target)) {
        filter.target = { $in: [target, "all"] };
      } else {
        // If it's a specific customer ID, only mark their specific notifications as read (not global "all")
        filter.target = target;
      }
    }

    return await this.collection.updateMany(filter, {
      $set: { isRead: true, updatedAt: new Date() },
    });
  }

  async delete(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndDelete({ _id: new ObjectId(id) });
  }
}