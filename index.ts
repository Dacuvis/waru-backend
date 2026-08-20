import { Elysia } from "elysia";
import { cors } from "@elysia/cors";

// ── Utils ────────────────────────────────────────────────────────────────────
import { globalErrorHandler } from "./src/utils/error/error-global-handler";
import { swaggerConfig } from "./src/utils/swagger";
import { logger } from "./src/utils/logger/logger";

// ── Auth & Users ─────────────────────────────────────────────────────────────
import { registerRoute } from "./src/moduls/register/register.route";
import { loginRoute } from "./src/moduls/login/login.route";
import { usersRoute } from "./src/moduls/users/users.route";

// ── Cashier (2 collections: orders + payment) ────────────────────────────────
import { ordersRoute, paymentRoute } from "./src/moduls/cashier/cashier.route";

// ── Kitchen ──────────────────────────────────────────────────────────────────
import { kitchenRoute } from "./src/moduls/kitchen/kitchen.route";

// ── Inventory ────────────────────────────────────────────────────────────────
import { inventoryRoute } from "./src/moduls/inventory/inventory.route";

// ── Promo ────────────────────────────────────────────────────────────────────
import { promoRoute } from "./src/moduls/promo/promo.route";

// ── Review ───────────────────────────────────────────────────────────────────
import { reviewRoute } from "./src/moduls/review/review.route";

// ── Notification ─────────────────────────────────────────────────────────────
import { notificationRoute } from "./src/moduls/notification/notification.route";

// ── Analytics ────────────────────────────────────────────────────────────────
import { analyticsRoute } from "./src/moduls/analytics/analytics.route";

// ── Business Assistant ───────────────────────────────────────────────────────
import { businessAssistantRoute } from "./src/moduls/business_assistant/business_assistant.route";

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
  .use(registerRoute)   // POST /auth/register
  .use(loginRoute)      // POST /auth/login

  // ── Protected routes (wajib JWT token di header atau cookie) ────────────
  .use(usersRoute)      // GET|POST|PUT|DELETE /users

  // Cashier
  .use(ordersRoute)     // GET|POST|PUT|DELETE /orders
  .use(paymentRoute)    // GET|POST|PUT|DELETE /payment

  // Kitchen
  .use(kitchenRoute)    // GET|POST|PUT|DELETE /kitchen

  // Inventory
  .use(inventoryRoute)  // GET|POST|PUT|DELETE|PATCH /inventory

  // Promo
  .use(promoRoute)      // GET|POST|PUT|DELETE /promo

  // Review
  .use(reviewRoute)     // GET|POST|PUT|DELETE /review

  // Notification
  .use(notificationRoute) // GET|POST|PUT|DELETE|PATCH /notification

  // Analytics
  .use(analyticsRoute)  // GET /analytics/*

  // Business Assistant
  .use(businessAssistantRoute) // GET|POST|DELETE /assistant

  .listen(3000);

logger.info(`🦊 Waru backend berjalan di http://localhost:${app.server?.port}`);
logger.info(`📚 Dokumentasi API: http://localhost:${app.server?.port}/docs`);
