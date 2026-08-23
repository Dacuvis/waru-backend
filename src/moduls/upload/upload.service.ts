import { mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { UploadModel } from "./upload.model";
import type { UploadFileRecord, UploadFilter, UploadFileResult } from "./upload.type";

const UPLOAD_DIR = "public/uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class UploadService {
  private model = new UploadModel();

  private async ensureUploadDir() {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
  }

  private generateFilename(originalName: string): string {
    const extIndex = originalName.lastIndexOf(".");
    const ext = extIndex !== -1 ? originalName.slice(extIndex).toLowerCase() : "";
    const rawBase = extIndex !== -1 ? originalName.slice(0, extIndex) : originalName;
    const cleanBase = rawBase
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40)
      .toLowerCase();

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}${cleanBase ? `-${cleanBase}` : ""}${ext}`;
  }

  async uploadSingle(file: File, uploadedBy?: string): Promise<UploadFileResult> {
    if (!file || typeof file.arrayBuffer !== "function") {
      throw new AppError("File tidak valid atau tidak ditemukan", 400, "E10");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError("Ukuran file melebihi batas maksimal 10MB", 400, "E10");
    }

    await this.ensureUploadDir();

    const filename = this.generateFilename(file.name || "file");
    const filePath = join(UPLOAD_DIR, filename).replace(/\\/g, "/");
    const publicUrl = `/public/uploads/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    await Bun.write(filePath, arrayBuffer);

    const now = new Date();
    const record: UploadFileRecord = {
      filename,
      originalName: file.name || filename,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      url: publicUrl,
      path: filePath,
      uploadedBy,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.model.create(record);
    logger.info(
      { uploadId: result.insertedId, filename, size: file.size },
      "File berhasil diunggah",
    );

    return {
      id: String(result.insertedId),
      filename,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
      url: record.url,
      path: record.path,
      createdAt: record.createdAt,
    };
  }

  async uploadMultiple(files: File[], uploadedBy?: string): Promise<UploadFileResult[]> {
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new AppError("Minimal 1 file wajib diunggah", 400, "E10");
    }

    const uploadResults: UploadFileResult[] = [];
    for (const file of files) {
      const uploaded = await this.uploadSingle(file, uploadedBy);
      uploadResults.push(uploaded);
    }

    logger.info({ count: uploadResults.length }, "Beberapa file berhasil diunggah");
    return uploadResults;
  }

  async getAll(query: PaginationQuery, filter: UploadFilter = {}) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit, filter }, "Mengambil daftar file upload");

    const { data, total } = await this.model.getAll(skip, limit, filter);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string) {
    const fileRecord = await this.model.getById(id);
    if (!fileRecord) {
      throw new AppError(`File dengan id ${id} tidak ditemukan`, 404, "E30");
    }
    logger.info({ uploadId: id }, "Mengambil info file upload by id");
    return fileRecord;
  }

  async delete(id: string) {
    const fileRecord = await this.model.getById(id);
    if (!fileRecord) {
      throw new AppError(`File dengan id ${id} tidak ditemukan`, 404, "E30");
    }

    const deleted = await this.model.delete(id);

    // Hapus file fisik dari disk jika ada
    if (fileRecord.path && existsSync(fileRecord.path)) {
      try {
        await unlink(fileRecord.path);
      } catch (err) {
        logger.error({ error: err, path: fileRecord.path }, "Gagal menghapus file fisik dari disk");
      }
    }

    logger.info({ uploadId: id, filename: fileRecord.filename }, "File upload berhasil dihapus");
    return deleted;
  }
}
