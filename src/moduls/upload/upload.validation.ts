import { t } from "elysia";

export const uploadSingleValidation = {
  body: t.Object({
    file: t.File({
      error: "File wajib diunggah",
    }),
  }),
};

export const uploadMultipleValidation = {
  body: t.Object({
    files: t.Files({
      error: "Minimal 1 file wajib diunggah",
    }),
  }),
};

export const getUploadByIdValidation = {
  params: t.Object({
    id: t.String({ minLength: 1, error: "ID upload wajib diisi" }),
  }),
};

export const deleteUploadValidation = {
  params: t.Object({
    id: t.String({ minLength: 1, error: "ID upload wajib diisi" }),
  }),
};

export const uploadQueryValidation = {
  query: t.Object({
    page: t.Optional(t.String()),
    limit: t.Optional(t.String()),
    mimeType: t.Optional(t.String()),
  }),
};
