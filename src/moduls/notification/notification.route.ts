import { Elysia } from "elysia";
import { authMiddleware } from "../../utils/auth/auth.middleware";
import { requireRole } from "../../utils/auth/role.middleware";
import { NotificationController } from "./notification.controller";
import {
  createNotificationValidation,
  updateNotificationValidation,
  deleteNotificationValidation,
  getNotificationByIdValidation,
} from "./notification.validation";
import type { CreateNotification, UpdateNotification } from "./notification.type";

const ctrl = new NotificationController();

export const notificationRoute = new Elysia({ prefix: "/notification" })
  .use(authMiddleware)

  // Customer
  .use(
    new Elysia()
      .use(requireRole(["customer"]))
      // GET /notification?page=1&limit=10
      .get("/", ({ query }: { query: { page?: string; limit?: string } }) => ctrl.getAll({ query }))
      // PATCH /notification/read-all?target=kitchen  ← tandai semua sudah dibaca
      .patch(
        "/read-all",
        ({ query }: { query: { target?: string } }) => ctrl.markAllRead({ query }),
      )
  )

  // Kitchen
  .use(
    new Elysia()
      .use(requireRole(["kitchen"]))
      // GET /notification/unread?target=kitchen&page=1
      .get(
        "/unread",
        ({ query }: { query: { page?: string; limit?: string; target?: string } }) =>
          ctrl.getUnread({ query }),
      )
  )

  // Boss Only
  .use(
    new Elysia()
      .use(requireRole(["boss"]))
      // GET /notification/target/:target
      .get(
        "/target/:target",
        ({
          params,
          query,
        }: {
          params: { target: string };
          query: { page?: string; limit?: string };
        }) => ctrl.getByTarget({ params, query }),
      )
      // GET /notification/:id
      .get(
        "/:id",
        ({ params }: { params: { id: string } }) => ctrl.getById({ params }),
        getNotificationByIdValidation,
      )
      // POST /notification
      .post(
        "/",
        ({ body }: { body: CreateNotification }) => ctrl.create({ body }),
        createNotificationValidation,
      )
      // PUT /notification/:id
      .put(
        "/:id",
        ({ params, body }: { params: { id: string }; body: UpdateNotification }) =>
          ctrl.update({ params, body }),
        updateNotificationValidation,
      )
      // DELETE /notification/:id
      .delete(
        "/:id",
        ({ params }: { params: { id: string } }) => ctrl.delete({ params }),
        deleteNotificationValidation,
      )
  );