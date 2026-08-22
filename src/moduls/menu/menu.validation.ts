import { t } from "elysia";

export const menuCategoryEnum = t.Union([t.Literal("Heavy Food"), t.Literal("Light Food")]);

export const createMenuSchema = t.Object({
  name: t.String({ minLength: 1, error: "Name is required" }),
  description: t.String({ minLength: 1, error: "Description is required" }),
  price: t.Number({ minimum: 0, error: "Price must be a positive number" }),
  category: menuCategoryEnum,
  isAvailable: t.Boolean(),
  isRecommended: t.Boolean(),
  imageUrl: t.String({ minLength: 1, error: "Image URL is required" }),
});

export const updateMenuSchema = t.Partial(createMenuSchema);

export const menuIdParamSchema = t.Object({
  id: t.String({ minLength: 1, error: "Menu id is required" }),
});

export const menuQuerySchema = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});