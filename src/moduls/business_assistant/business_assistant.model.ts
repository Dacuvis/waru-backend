import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { AssistantSession, AssistantMessage } from "./business_assistant.type";

export class BusinessAssistantModel {
  private collection = db.collection("business_assistant");

  async getSessions(skip: number, limit: number, filter: Record<string, any> = {}) {
    const [data, total] = await Promise.all([
      this.collection
        .find(filter, { projection: { messages: 0 } }) // exclude messages untuk list
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { data, total };
  }

  async getSessionById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async createSession(session: AssistantSession) {
    return await this.collection.insertOne(session as any);
  }

  async addMessage(id: string, message: AssistantMessage) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $push: { messages: message as any },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" },
    );
  }

  async deleteSession(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndDelete({ _id: new ObjectId(id) });
  }
}