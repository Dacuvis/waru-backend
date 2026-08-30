import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { Menu, UpdateMenu, MenuFilter } from "./menu.type";

export class MenuModel {
  private collection = db.collection("menu")
  
  async create(menu: Menu) {
    return await this.collection.insertOne(menu);
  }

  async findAll(skip: number, limit: number, filter: MenuFilter = {}) {
    const [data, total] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: ObjectId | string) {
    if (typeof id === "string") {
      if (ObjectId.isValid(id)) {
        const found = await this.collection.findOne({ _id: new ObjectId(id) });
        if (found) return found;
      }
      return await this.collection.findOne({ _id: id as any });
    }
    return await this.collection.findOne({ _id: id });
  }

  async findByName(name: string) {
    return await this.collection.findOne({ name });
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