import { Elysia } from "elysia";
import { authMiddleware } from "../../utils/auth/auth.middleware";
import { requireRole } from "../../utils/auth/role.middleware";
import { PromoController } from "./promo.controller";
import {
  createPromoValidation,
  updatePromoValidation,
  applyPromoValidation,
  deletePromoValidation,
  getPromoByIdValidation,
} from "./promo.validation";
import type { CreatePromo, UpdatePromo, ApplyPromo } from "./promo.type";

const ctrl = new PromoController();

export const promoRoute = new Elysia({ prefix: "/promo" })
  // GET /promo/active (Public)
  .get(
    "/active",
    ({ query }: { query: { page?: string; limit?: string } }) => ctrl.getActive({ query }),
  )

  // Protected
  .use(
    new Elysia()
      .use(authMiddleware)
      // Customer
      .use(
        new Elysia()
          .use(requireRole(["customer"]))
          // POST /promo/apply  ← cek & hitung diskon
          .post(
            "/apply",
            ({ body }: { body: ApplyPromo }) => ctrl.applyPromo({ body }),
            applyPromoValidation,
          )
      )
      // Boss Only
      .use(
        new Elysia()
          .use(requireRole(["boss"]))
          // GET /promo?page=1&limit=10
          .get("/", ({ query }: { query: { page?: string; limit?: string } }) => ctrl.getAll({ query }))
          // GET /promo/:id
          .get(
            "/:id",
            ({ params }: { params: { id: string } }) => ctrl.getById({ params }),
            getPromoByIdValidation,
          )
          // POST /promo
          .post(
            "/",
            ({ body }: { body: CreatePromo }) => ctrl.create({ body }),
            createPromoValidation,
          )
          // PUT /promo/:id
          .put(
            "/:id",
            ({ params, body }: { params: { id: string }; body: UpdatePromo }) =>
              ctrl.update({ params, body }),
            updatePromoValidation,
          )
          // DELETE /promo/:id
          .delete(
            "/:id",
            ({ params }: { params: { id: string } }) => ctrl.delete({ params }),
            deletePromoValidation,
          )
      )
  );