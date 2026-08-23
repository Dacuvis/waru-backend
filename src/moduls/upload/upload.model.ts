import { ObjectId } from "mongodb";
import { db } from "../../config/client";
import type { UploadFileRecord, UploadFilter } from "./upload.type";

export class UploadModel {
  private collection = db.collection("uploads");

  async create(fileRecord: UploadFileRecord) {
    return await this.collection.insertOne(fileRecord as any);
  }

  async createMany(fileRecords: UploadFileRecord[]) {
    return await this.collection.insertMany(fileRecords as any[]);
  }

  async getAll(skip: number, limit: number, filter: UploadFilter = {}) {
    const query: Record<string, any> = {};
    if (filter.mimeType) {
      query.mimeType = { $regex: filter.mimeType, $options: "i" };
    }
    if (filter.uploadedBy) {
      query.uploadedBy = filter.uploadedBy;
    }

    const [data, total] = await Promise.all([
      this.collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(query),
    ]);
    return { data, total };
  }

  async getById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async getByFilename(filename: string) {
    return await this.collection.findOne({ filename });
  }

  async delete(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOneAndDelete({ _id: new ObjectId(id) });
  }
}
