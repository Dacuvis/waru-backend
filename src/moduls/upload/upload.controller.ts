import { UploadService } from "./upload.service";
import type { UploadFilter } from "./upload.type";

const service = new UploadService();

export class UploadController {
  async uploadSingle({ body, user }: { body: { file: File }; user?: any }) {
    return await service.uploadSingle(body.file, user?.id);
  }

  async uploadMultiple({ body, user }: { body: { files: File[] }; user?: any }) {
    return await service.uploadMultiple(body.files, user?.id);
  }

  async getAll({ query }: { query: { page?: string; limit?: string; mimeType?: string } }) {
    const filter: UploadFilter = {};
    if (query.mimeType) {
      filter.mimeType = query.mimeType;
    }
    return await service.getAll(query, filter);
  }

  async getById({ params }: { params: { id: string } }) {
    return await service.getById(params.id);
  }

  async delete({ params }: { params: { id: string } }) {
    return await service.delete(params.id);
  }
}
