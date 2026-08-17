import { db } from "../../config/client";

export class LoginModel {
  private col = db.collection("users");

  async findByEmail(email: string) {
    return await this.col.findOne({ email });
  }
}
