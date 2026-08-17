import { db } from "../../config/client";
import type { RegisterUser } from "./register.type";

export class RegisterModel {
  private col = db.collection("users");

  async findByEmail(email: string) {
    return await this.col.findOne({ email });
  }

  async create(data: RegisterUser) {
    return await this.col.insertOne(data);
  }
}
