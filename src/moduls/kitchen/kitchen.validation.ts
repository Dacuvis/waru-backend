import { t } from "elysia";

const kitchenMenuItemSchema = t.Object({
  name: t.String({ minLength: 1, error: "Nama menu item wajib diisi" }),
  quantity: t.Number({ minimum: 1, error: "Quantity minimal 1" }),
  notes: t.Optional(t.String()),
});

export const createKitchenValidation = {
  body: t.Object({
    orderId: t.String({ minLength: 1, error: "orderId wajib diisi" }),
    tableNumber: t.Number({ minimum: 1, error: "Nomor meja minimal 1" }),
    menuItems: t.Array(kitchenMenuItemSchema, { minItems: 1, error: "Minimal 1 menu item" }),
    notes: t.Optional(t.String()),
  }),
};

export const updateKitchenValidation = {
  params: t.Object({
    id: t.String({ minLength: 1 }),
  }),
  body: t.Object({
    status: t.Optional(
      t.Union([
        t.Literal("pending"),
        t.Literal("in_progress"),
        t.Literal("done"),
        t.Literal("cancelled"),
      ], { error: "Status tidak valid" }),
    ),
    notes: t.Optional(t.String()),
    menuItems: t.Optional(t.Array(kitchenMenuItemSchema)),
  }),
};

export const deleteKitchenValidation = {
  params: t.Object({
    id: t.String({ minLength: 1 }),
  }),
};

export const getKitchenByIdValidation = {
  params: t.Object({
    id: t.String({ minLength: 1 }),
  }),
};
