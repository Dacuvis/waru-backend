import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { RegisterUser } from "./register.type";

export class RegisterModel {
  private col = db.collection("users");
  private emailIndexReady = this.col.createIndex(
    { email: 1 },
    { unique: true, name: "users_email_unique", collation: { locale: "en", strength: 2 } },
  );

  async findByEmail(email: string) {
    await this.emailIndexReady;
    return await this.col.findOne(
      { email },
      { collation: { locale: "en", strength: 2 } },
    );
  }

  async create(data: RegisterUser) {
    await this.emailIndexReady;
    return await this.col.insertOne(data);
  }

  async deleteById(id: ObjectId) {
    return await this.col.deleteOne({ _id: id });
  }
}
