import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { Menu, UpdateMenu } from "./menu.type";

export class MenuModel {
  private collection = db.collection("menu")
  
  async create(menu: Menu) {
    return await this.collection.insertOne(menu);
  }

  async findAll(skip: number, limit: number) {
    const [data, total] = await Promise.all([
      this.collection.find().sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(),
    ]);
    return { data, total };
  }

  async findById(id: ObjectId) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOne({ _id: id });
  }

  async update(id: ObjectId, item: UpdateMenu & { updatedAt: Date }) {
    return await this.collection.findOneAndUpdate(
      { _id: id },
      { $set: item },
      { returnDocument: "after" },
    );
  }

  async delete(id: ObjectId) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.deleteOne({ _id: id });
  }
}