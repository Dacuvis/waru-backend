import { Elysia } from "elysia";
import { MenuController } from "./menu.controller";
import {
  createMenuSchema,
  updateMenuSchema,
  menuIdParamSchema,
  menuQuerySchema,
} from "./menu.validation";

const controller = new MenuController();

export const menuRoutes = new Elysia({ prefix: "/menu" })
  .get("/", ({ query }) => controller.findAll({ query }), {
    query: menuQuerySchema,
  })
  .get("/:id", ({ params }) => controller.findById({ params }), {
    params: menuIdParamSchema,
  })
  .post("/", ({ body }) => controller.create({ body }), {
    body: createMenuSchema,
  })
  .put("/:id", ({ params, body }) => controller.update({ params, body }), {
    params: menuIdParamSchema,
    body: updateMenuSchema,
  })
  .delete("/:id", ({ params }) => controller.delete({ params }), {
    params: menuIdParamSchema,
  });