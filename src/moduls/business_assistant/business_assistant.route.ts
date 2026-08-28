import { Elysia } from "elysia";
import { authMiddleware, type AuthUser } from "../../utils/auth/auth.middleware";
import { requireRole } from "../../utils/auth/role.middleware";
import { BusinessAssistantController } from "./business_assistant.controller";
import {
  createSessionValidation,
  sendMessageValidation,
  deleteSessionValidation,
  getSessionByIdValidation,
} from "./business_assistant.validation";
import type { CreateSessionRequest, SendMessageRequest } from "./business_assistant.type";

const ctrl = new BusinessAssistantController();

export const businessAssistantRoute = new Elysia({ prefix: "/assistant" })
  .use(authMiddleware)
  .use(requireRole(["boss"]))

  // GET /assistant?page=1&limit=10  ← list semua sesi
  .get(
    "/",
    ({ query, user }: { query: { page?: string; limit?: string }; user?: AuthUser }) => ctrl.getSessions({ query, user }),
  )

  // GET /assistant/:id  ← detail sesi + seluruh riwayat chat
  .get(
    "/:id",
    ({ params, user }: { params: { id: string }; user?: AuthUser }) => ctrl.getSessionById({ params, user }),
    getSessionByIdValidation,
  )

  // POST /assistant  ← buat sesi baru + pesan pertama
  .post(
    "/",
    ({ body, user }: { body: CreateSessionRequest; user?: AuthUser }) => ctrl.createSession({ body, user }),
    createSessionValidation,
  )

  // POST /assistant/:id/message  ← kirim pesan ke sesi yang ada
  .post(
    "/:id/message",
    ({ params, body, user }: { params: { id: string }; body: SendMessageRequest; user?: AuthUser }) =>
      ctrl.sendMessage({ params, body, user }),
    sendMessageValidation,
  )

  // DELETE /assistant/:id
  .delete(
    "/:id",
    ({ params, user }: { params: { id: string }; user?: AuthUser }) => ctrl.deleteSession({ params, user }),
    deleteSessionValidation,
  );