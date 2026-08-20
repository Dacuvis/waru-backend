import { t } from "elysia";

const notificationTypeEnum = t.Union([
  t.Literal("order_new"),
  t.Literal("order_ready"),
  t.Literal("payment_success"),
  t.Literal("low_stock"),
  t.Literal("promo_expiring"),
  t.Literal("system"),
  t.Literal("custom"),
], { error: "Tipe notifikasi tidak valid" });

const notificationTargetEnum = t.Union([
  t.Literal("kitchen"),
  t.Literal("cashier"),
  t.Literal("admin"),
  t.Literal("all"),
], { error: "Target notifikasi tidak valid" });

export const createNotificationValidation = {
  body: t.Object({
    type: notificationTypeEnum,
    target: notificationTargetEnum,
    title: t.String({ minLength: 1, error: "Judul notifikasi wajib diisi" }),
    message: t.String({ minLength: 1, error: "Pesan notifikasi wajib diisi" }),
    referenceId: t.Optional(t.String()),
  }),
};

export const updateNotificationValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
  body: t.Object({
    isRead: t.Optional(t.Boolean()),
    title: t.Optional(t.String({ minLength: 1 })),
    message: t.Optional(t.String({ minLength: 1 })),
  }),
};

export const deleteNotificationValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};

export const getNotificationByIdValidation = {
  params: t.Object({ id: t.String({ minLength: 1 }) }),
};
