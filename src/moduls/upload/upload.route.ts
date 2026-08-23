import { Elysia } from "elysia";
import { UploadController } from "./upload.controller";
import {
  uploadSingleValidation,
  uploadMultipleValidation,
  getUploadByIdValidation,
  deleteUploadValidation,
  uploadQueryValidation,
} from "./upload.validation";

const ctrl = new UploadController();

export const uploadRoute = new Elysia({ prefix: "/upload" })
  // GET /upload?page=1&limit=10&mimeType=image
  .get(
    "/",
    ({ query }: { query: { page?: string; limit?: string; mimeType?: string } }) =>
      ctrl.getAll({ query }),
    uploadQueryValidation,
  )

  // GET /upload/:id
  .get(
    "/:id",
    ({ params }: { params: { id: string } }) => ctrl.getById({ params }),
    getUploadByIdValidation,
  )

  // POST /upload (Single upload)
  .post(
    "/",
    ({ body }: { body: { file: File } }) => ctrl.uploadSingle({ body }),
    uploadSingleValidation,
  )

  // POST /upload/single (Single upload explicit)
  .post(
    "/single",
    ({ body }: { body: { file: File } }) => ctrl.uploadSingle({ body }),
    uploadSingleValidation,
  )

  // POST /upload/multiple (Multiple upload)
  .post(
    "/multiple",
    ({ body }: { body: { files: File[] } }) => ctrl.uploadMultiple({ body }),
    uploadMultipleValidation,
  )

  // DELETE /upload/:id
  .delete(
    "/:id",
    ({ params }: { params: { id: string } }) => ctrl.delete({ params }),
    deleteUploadValidation,
  );
