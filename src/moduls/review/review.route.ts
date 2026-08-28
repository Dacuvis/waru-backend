import { Elysia } from "elysia";
import { authMiddleware } from "../../utils/auth/auth.middleware";
import { requireRole } from "../../utils/auth/role.middleware";
import { ReviewController } from "./review.controller";
import {
  createReviewValidation,
  updateReviewValidation,
  deleteReviewValidation,
  getReviewByIdValidation,
} from "./review.validation";
import type { CreateReview, UpdateReview } from "./review.type";

const ctrl = new ReviewController();

export const reviewRoute = new Elysia({ prefix: "/review" })
  // Public
  // GET /review/published
  .get(
    "/published",
    ({ query }: { query: { page?: string; limit?: string } }) => ctrl.getPublished({ query }),
  )
  // GET /review/rating?target=menu&targetId=xxx
  .get(
    "/rating",
    ({ query }: { query: { target?: string; targetId?: string } }) =>
      ctrl.getAverageRating({ query }),
  )
  // GET /review/target/:target?page=1&targetId=xxx
  .get(
    "/target/:target",
    ({
      params,
      query,
    }: {
      params: { target: string };
      query: { page?: string; limit?: string; targetId?: string };
    }) => ctrl.getByTarget({ params, query }),
  )

  // Protected
  .use(
    new Elysia()
      .use(authMiddleware)
      // Customer
      .use(
        new Elysia()
          .use(requireRole(["customer"]))
          // POST /review
          .post(
            "/",
            ({ body, user }: { body: CreateReview; user?: any }) => ctrl.create({ body, user }),
            createReviewValidation,
          )
      )
      // Boss Only
      .use(
        new Elysia()
          .use(requireRole(["boss"]))
          // GET /review?page=1&limit=10
          .get("/", ({ query }: { query: { page?: string; limit?: string } }) => ctrl.getAll({ query }))
          // GET /review/:id
          .get(
            "/:id",
            ({ params }: { params: { id: string } }) => ctrl.getById({ params }),
            getReviewByIdValidation,
          )
          // PUT /review/:id
          .put(
            "/:id",
            ({ params, body }: { params: { id: string }; body: UpdateReview }) =>
              ctrl.update({ params, body }),
            updateReviewValidation,
          )
          // DELETE /review/:id
          .delete(
            "/:id",
            ({ params }: { params: { id: string } }) => ctrl.delete({ params }),
            deleteReviewValidation,
          )
      )
  );