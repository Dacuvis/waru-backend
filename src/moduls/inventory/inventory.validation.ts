import { t } from "elysia";

const categoryEnum = t.Union([
  t.Literal("food"),
  t.Literal("beverage"),
  t.Literal("packaging"),
  t.Literal("equipment"),
  t.Literal("other"),
], { error: "Kategori tidak valid" });

const unitEnum = t.Union([
  t.Literal("pcs"),
  t.Literal("kg"),
  t.Literal("liter"),
  t.Literal("gram"),
  t.Literal("ml"),
  t.Literal("box"),
  t.Literal("pack"),
], { error: "Unit tidak valid" });

export const createInventoryValidation = {
  body: t.Object({
    name: t.String({ minLength: 1, error: "Nama item wajib diisi" }),
    category: categoryEnum,
    unit: unitEnum,
    quantity: t.Number({ minimum: 0, error: "Quantity tidak boleh negatif" }),
    minimumStock: t.Number({ minimum: 0, error: "Minimum stock tidak boleh negatif" }),
    costPrice: t.Number({ minimum: 0, error: "Harga beli tidak boleh negatif" }),
    supplier: t.Optional(t.String()),
    notes: t.Optional(t.String()),
  }),
};

export const updateInventoryValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
  body: t.Object({
    name: t.Optional(t.String({ minLength: 1 })),
    category: t.Optional(categoryEnum),
    unit: t.Optional(unitEnum),
    quantity: t.Optional(t.Number({ minimum: 0 })),
    minimumStock: t.Optional(t.Number({ minimum: 0 })),
    costPrice: t.Optional(t.Number({ minimum: 0 })),
    supplier: t.Optional(t.String()),
    notes: t.Optional(t.String()),
  }),
};

export const adjustStockValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
  body: t.Object({
    amount: t.Number({ error: "Amount wajib diisi (positif = tambah, negatif = kurang)" }),
    reason: t.Optional(t.String()),
  }),
};

export const deleteInventoryValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

export const getInventoryByIdValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};
