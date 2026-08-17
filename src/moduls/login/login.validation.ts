import { t } from "elysia";

export const loginValidation = {
  body: t.Object({
    email: t.String({ format: "email", error: "Format email tidak valid" }),
    password: t.String({ minLength: 6, error: "Password minimal 6 karakter" }),
  }),
};
