import { t } from "elysia";

export const createSessionValidation = {
  body: t.Object({
    title: t.Optional(t.String()),
    message: t.String({ minLength: 1, maxLength: 2000, error: "Pesan minimal 1 karakter dan maksimal 2000 karakter" }),
  }),
};

export const sendMessageValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
  body: t.Object({
    message: t.String({ minLength: 1, maxLength: 2000, error: "Pesan minimal 1 karakter dan maksimal 2000 karakter" }),
  }),
};

export const deleteSessionValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

export const getSessionByIdValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};