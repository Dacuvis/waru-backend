import { t } from "elysia";

const targetEnum = t.Union([
  t.Literal("menu"),
  t.Literal("service"),
  t.Literal("overall"),
], { error: "Target review tidak valid (menu/service/overall)" });

export const createReviewValidation = {
  body: t.Object({
    orderId: t.Optional(t.String()),
    customerName: t.String({ minLength: 1, error: "Nama customer wajib diisi" }),
    target: targetEnum,
    targetId: t.Optional(t.String()),
    rating: t.Number({
      minimum: 1,
      maximum: 5,
      error: "Rating harus antara 1-5",
    }),
    comment: t.Optional(t.String()),
  }),
};

export const updateReviewValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
  body: t.Object({
    customerName: t.Optional(t.String({ minLength: 1 })),
    target: t.Optional(targetEnum),
    targetId: t.Optional(t.String()),
    rating: t.Optional(t.Number({ minimum: 1, maximum: 5 })),
    comment: t.Optional(t.String()),
    isPublished: t.Optional(t.Boolean()),
  }),
};

export const deleteReviewValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

export const getReviewByIdValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};
