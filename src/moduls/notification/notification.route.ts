import { Elysia } from "elysia";
import { authMiddleware, type AuthUser } from "../../utils/auth/auth.middleware";
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
      .get("/", ({ query, user }: { query: { page?: string; limit?: string }; user?: AuthUser }) => ctrl.getAll({ query, user }))
      // PATCH /notification/read-all?target=kitchen  ← tandai semua sudah dibaca
      .patch(
        "/read-all",
        ({ query, user }: { query: { target?: string }; user?: AuthUser }) => ctrl.markAllRead({ query, user }),
      )
  )

  // Kitchen
  .use(
    new Elysia()
      .use(requireRole(["kitchen"]))
      // GET /notification/unread?target=kitchen&page=1
      .get(
        "/unread",
        ({ query, user }: { query: { page?: string; limit?: string; target?: string }; user?: AuthUser }) =>
          ctrl.getUnread({ query, user }),
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
          user,
        }: {
          params: { target: string };
          query: { page?: string; limit?: string };
          user?: AuthUser;
        }) => ctrl.getByTarget({ params, query, user }),
      )
      // GET /notification/:id
      .get(
        "/:id",
        ({ params, user }: { params: { id: string }; user?: AuthUser }) => ctrl.getById({ params, user }),
        getNotificationByIdValidation,
      )
      // POST /notification
      .post(
        "/",
        ({ body, user }: { body: CreateNotification; user?: AuthUser }) => ctrl.create({ body, user }),
        createNotificationValidation,
      )
      // PUT /notification/:id
      .put(
        "/:id",
        ({ params, body, user }: { params: { id: string }; body: UpdateNotification; user?: AuthUser }) =>
          ctrl.update({ params, body, user }),
        updateNotificationValidation,
      )
      // DELETE /notification/:id
      .delete(
        "/:id",
        ({ params, user }: { params: { id: string }; user?: AuthUser }) => ctrl.delete({ params, user }),
        deleteNotificationValidation,
      )
  );