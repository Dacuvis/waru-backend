import type { ObjectId } from "mongodb";

export interface UploadFileRecord {
  _id?: ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
  uploadedBy?: string | ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadFilter {
  mimeType?: string;
  uploadedBy?: string;
}

export interface UploadFileResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
  createdAt: Date;
}
