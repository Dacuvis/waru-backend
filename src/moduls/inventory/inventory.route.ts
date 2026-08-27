import { Elysia } from "elysia";
import { authMiddleware } from "../../utils/auth/auth.middleware";
import { requireRole } from "../../utils/auth/role.middleware";
import { InventoryController } from "./inventory.controller";
import {
  createInventoryValidation,
  updateInventoryValidation,
  adjustStockValidation,
  deleteInventoryValidation,
  getInventoryByIdValidation,
} from "./inventory.validation";
import type { CreateInventoryItem, UpdateInventoryItem, AdjustStock } from "./inventory.type";

const ctrl = new InventoryController();

export const inventoryRoute = new Elysia({ prefix: "/inventory" })
  .use(authMiddleware)

  // Kitchen & Boss
  .use(
    new Elysia()
      .use(requireRole(["kitchen", "boss"]))
      // GET /inventory?page=1&limit=10
      .get("/", ({ query }: { query: { page?: string; limit?: string } }) => ctrl.getAll({ query }))
      // GET /inventory/low-stock
      .get(
        "/low-stock",
        ({ query }: { query: { page?: string; limit?: string } }) => ctrl.getLowStock({ query }),
      )
      // GET /inventory/category/:category
      .get(
        "/category/:category",
        ({
          params,
          query,
        }: {
          params: { category: string };
          query: { page?: string; limit?: string };
        }) => ctrl.getByCategory({ params, query }),
      )
      // GET /inventory/:id
      .get(
        "/:id",
        ({ params }: { params: { id: string } }) => ctrl.getById({ params }),
        getInventoryByIdValidation,
      )
      // PATCH /inventory/:id/stock  ← adjust stok (tambah/kurang)
      .patch(
        "/:id/stock",
        ({ params, body }: { params: { id: string }; body: AdjustStock }) =>
          ctrl.adjustStock({ params, body }),
        adjustStockValidation,
      )
  )

  // Boss Only
  .use(
    new Elysia()
      .use(requireRole(["boss"]))
      // POST /inventory
      .post(
        "/",
        ({ body }: { body: CreateInventoryItem }) => ctrl.create({ body }),
        createInventoryValidation,
      )
      // PUT /inventory/:id
      .put(
        "/:id",
        ({ params, body }: { params: { id: string }; body: UpdateInventoryItem }) =>
          ctrl.update({ params, body }),
        updateInventoryValidation,
      )
      // DELETE /inventory/:id
      .delete(
        "/:id",
        ({ params }: { params: { id: string } }) => ctrl.delete({ params }),
        deleteInventoryValidation,
      )
  );