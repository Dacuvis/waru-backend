import { t } from "elysia";

export const registerValidation = {
  body: t.Object({
    name: t.String({ minLength: 2, error: "Nama minimal 2 karakter" }),
    email: t.String({ format: "email", error: "Format email tidak valid" }),
    password: t.String({ minLength: 6, error: "Password minimal 6 karakter" }),
  }),
};
