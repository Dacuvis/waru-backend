import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { CreateUser, UpdateUser } from "./users.type";

export class usersModel {
  private userDb = db.collection("users");

  async create(d: CreateUser) {
    return await this.userDb.insertOne(d);
  }

  async view(skip: number, limit: number) {
    const [data, total] = await Promise.all([
      this.userDb.find({}, { projection: { password: 0 } }).skip(skip).limit(limit).toArray(),
      this.userDb.countDocuments(),
    ]);
    return { data, total };
  }

  async update(id: string, d: UpdateUser) {
    return await this.userDb.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: d },
      { returnDocument: "after", projection: { password: 0 } },
    );
  }

  async delete(id: string) {
    return await this.userDb.findOneAndDelete({ _id: new ObjectId(id) }, { projection: { password: 0 } });
  }
}