import { Elysia } from "elysia";
import { cors } from "@elysia/cors";
import { usersRoute } from "./src/moduls/users/users.route";
import { registerRoute } from "./src/moduls/register/register.route";
import { loginRoute } from "./src/moduls/login/login.route";
import { globalErrorHandler } from "./src/utils/error/error-global-handler";
import { swaggerConfig } from "./src/utils/swagger";
import { logger } from "./src/utils/logger/logger";

const app = new Elysia()
  .use(cors())
  .use(swaggerConfig)

  // ── Request logger ───────────────────────────────────────────────────────
  .onRequest(({ request }) => {
    logger.info(
      { method: request.method, url: new URL(request.url).pathname },
      "→ Request masuk",
    );
  })

  // ── Response logger ──────────────────────────────────────────────────────
  .onAfterHandle(({ request, set }) => {
    logger.info(
      { method: request.method, url: new URL(request.url).pathname, status: set.status ?? 200 },
      "← Response dikirim",
    );
  })

  .onError(({ error, set, code }) => globalErrorHandler({ error, set, code }))

  // ── Public routes (tidak perlu token) ───────────────────────────────────
  .use(registerRoute) // POST /auth/register
  .use(loginRoute)    // POST /auth/login

  // ── Protected routes (wajib JWT token di header atau cookie) ────────────
  .use(usersRoute)    // GET|POST|PUT|DELETE /users

  .listen(3000);

logger.info(`🦊 Waru backend berjalan di http://localhost:${app.server?.port}`);
logger.info(`📚 Dokumentasi API: http://localhost:${app.server?.port}/docs`);
