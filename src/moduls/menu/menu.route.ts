import { Elysia } from "elysia";
import { authMiddleware } from "../../utils/auth/auth.middleware";
import { requireRole } from "../../utils/auth/role.middleware";
import { MenuController } from "./menu.controller";
import {
  createMenuSchema,
  updateMenuSchema,
  menuIdParamSchema,
  menuQuerySchema,
} from "./menu.validation";

const controller = new MenuController();

export const menuRoutes = new Elysia({ prefix: "/menu" })
  // Public
  .get("/", ({ query }) => controller.findAll({ query }), {
    query: menuQuerySchema,
  })
  .get("/:id", ({ params }) => controller.findById({ params }), {
    params: menuIdParamSchema,
  })

  // Boss Only
  .use(
    new Elysia()
      .use(authMiddleware)
      .use(requireRole(["boss"]))
      .post("/", ({ body }) => controller.create({ body }), {
        body: createMenuSchema,
      })
      .put("/:id", ({ params, body }) => controller.update({ params, body }), {
        params: menuIdParamSchema,
        body: updateMenuSchema,
      })
      .delete("/:id", ({ params }) => controller.delete({ params }), {
        params: menuIdParamSchema,
      })
  );