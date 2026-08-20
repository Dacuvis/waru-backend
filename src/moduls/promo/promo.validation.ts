import { t } from "elysia";

const promoTypeEnum = t.Union([
  t.Literal("percentage"),
  t.Literal("fixed"),
  t.Literal("buy_x_get_y"),
  t.Literal("free_item"),
], { error: "Tipe promo tidak valid" });

const promoStatusEnum = t.Union([
  t.Literal("active"),
  t.Literal("inactive"),
  t.Literal("expired"),
], { error: "Status promo tidak valid" });

export const createPromoValidation = {
  body: t.Object({
    code: t.String({ minLength: 1, error: "Kode promo wajib diisi" }),
    name: t.String({ minLength: 1, error: "Nama promo wajib diisi" }),
    description: t.Optional(t.String()),
    type: promoTypeEnum,
    discountValue: t.Number({ minimum: 0, error: "Nilai diskon tidak boleh negatif" }),
    minimumOrder: t.Optional(t.Number({ minimum: 0 })),
    maxDiscount: t.Optional(t.Number({ minimum: 0 })),
    usageLimit: t.Optional(t.Number({ minimum: 1 })),
    startDate: t.String({ minLength: 1, error: "Tanggal mulai wajib diisi" }),
    endDate: t.String({ minLength: 1, error: "Tanggal berakhir wajib diisi" }),
  }),
};

export const updatePromoValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
  body: t.Object({
    name: t.Optional(t.String({ minLength: 1 })),
    description: t.Optional(t.String()),
    type: t.Optional(promoTypeEnum),
    discountValue: t.Optional(t.Number({ minimum: 0 })),
    minimumOrder: t.Optional(t.Number({ minimum: 0 })),
    maxDiscount: t.Optional(t.Number({ minimum: 0 })),
    usageLimit: t.Optional(t.Number({ minimum: 1 })),
    startDate: t.Optional(t.String()),
    endDate: t.Optional(t.String()),
    status: t.Optional(promoStatusEnum),
  }),
};

export const applyPromoValidation = {
  body: t.Object({
    code: t.String({ minLength: 1, error: "Kode promo wajib diisi" }),
    orderTotal: t.Number({ minimum: 0, error: "Total order tidak boleh negatif" }),
  }),
};

export const deletePromoValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

export const getPromoByIdValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};
