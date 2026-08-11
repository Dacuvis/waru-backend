import { t } from "elysia"

export const createUserValidation = {
  body: t.Object({
    name: t.String({ minLength: 1, error: "Nama wajib diisi" }),
    email: t.String({ format: "email", error: "Format email tidak valid" }),
    password: t.String({ minLength: 6, error: "Password minimal 6 karakter" }),
    IsActive: t.Boolean(),
  }),
}

export const updateUserValidation = {
  params: t.Object({
    id: t.String({ minLength: 1 }),
  }),
  body: t.Object({
    name: t.Optional(t.String({ minLength: 1, error: "Nama tidak boleh kosong" })),
    email: t.Optional(t.String({ format: "email", error: "Format email tidak valid" })),
    password: t.Optional(t.String({ minLength: 6, error: "Password minimal 6 karakter" })),
    IsActive: t.Optional(t.Boolean()),
  }),
}

export const deleteUserValidation = {
  params: t.Object({
    id: t.String({ minLength: 1 }),
  }),
}
