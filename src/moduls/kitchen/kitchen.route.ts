import { Elysia } from "elysia";
import { authMiddleware } from "../../utils/auth/auth.middleware";
import { KitchenController } from "./kitchen.controller";
import {
  createKitchenValidation,
  updateKitchenValidation,
  deleteKitchenValidation,
  getKitchenByIdValidation,
} from "./kitchen.validation";
import type { CreateKitchenItem, UpdateKitchenItem } from "./kitchen.type";

const ctrl = new KitchenController();

export const kitchenRoute = new Elysia({ prefix: "/kitchen" })
  .use(authMiddleware)

  // GET /kitchen?page=1&limit=10
  .get("/", ({ query }: { query: { page?: string; limit?: string } }) => ctrl.getAll({ query }))

  // GET /kitchen/:id
  .get(
    "/:id",
    ({ params }: { params: { id: string } }) => ctrl.getById({ params }),
    getKitchenByIdValidation,
  )

  // GET /kitchen/status/:status?page=1&limit=10
  .get(
    "/status/:status",
    ({
      params,
      query,
    }: {
      params: { status: string };
      query: { page?: string; limit?: string };
    }) => ctrl.getByStatus({ params, query }),
  )

  // POST /kitchen
  .post(
    "/",
    ({ body }: { body: CreateKitchenItem }) => ctrl.create({ body }),
    createKitchenValidation,
  )

  // PUT /kitchen/:id
  .put(
    "/:id",
    ({ params, body }: { params: { id: string }; body: UpdateKitchenItem }) =>
      ctrl.update({ params, body }),
    updateKitchenValidation,
  )

  // DELETE /kitchen/:id
  .delete(
    "/:id",
    ({ params }: { params: { id: string } }) => ctrl.delete({ params }),
    deleteKitchenValidation,
  );
