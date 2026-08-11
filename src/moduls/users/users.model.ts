import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { CreateUser, UpdateUser } from "./users.type";

export class usersModel {
  private userDb = db.collection("users")

  async create(d: CreateUser) {
    return await this.userDb.insertOne(d)
  }

  async view() {
    return await this.userDb.find().toArray()
  }

  async update(id: string, d: UpdateUser) {
    return await this.userDb.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: d },
      { returnDocument: "after" }
    )
  }

  async delete(id: string) {
    return await this.userDb.findOneAndDelete({ _id: new ObjectId(id) })
  }
}