import { t } from "elysia";

export const createSessionValidation = {
  body: t.Object({
    title: t.Optional(t.String()),
    message: t.String({ minLength: 1, error: "Pesan tidak boleh kosong" }),
  }),
};

export const sendMessageValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
  body: t.Object({
    message: t.String({ minLength: 1, error: "Pesan tidak boleh kosong" }),
  }),
};

export const deleteSessionValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

export const getSessionByIdValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};
