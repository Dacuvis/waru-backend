import { Elysia } from "elysia";
import { authMiddleware } from "../../utils/auth/auth.middleware";
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

  // GET /assistant?page=1&limit=10  ← list semua sesi
  .get(
    "/",
    ({ query }: { query: { page?: string; limit?: string } }) => ctrl.getSessions({ query }),
  )

  // GET /assistant/:id  ← detail sesi + seluruh riwayat chat
  .get(
    "/:id",
    ({ params }: { params: { id: string } }) => ctrl.getSessionById({ params }),
    getSessionByIdValidation,
  )

  // POST /assistant  ← buat sesi baru + pesan pertama
  .post(
    "/",
    ({ body }: { body: CreateSessionRequest }) => ctrl.createSession({ body }),
    createSessionValidation,
  )

  // POST /assistant/:id/message  ← kirim pesan ke sesi yang ada
  .post(
    "/:id/message",
    ({ params, body }: { params: { id: string }; body: SendMessageRequest }) =>
      ctrl.sendMessage({ params, body }),
    sendMessageValidation,
  )

  // DELETE /assistant/:id
  .delete(
    "/:id",
    ({ params }: { params: { id: string } }) => ctrl.deleteSession({ params }),
    deleteSessionValidation,
  );
