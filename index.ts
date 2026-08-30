import { Elysia } from "elysia";
import { cors } from "@elysia/cors";

import { serveSafeStaticFile } from "./tests/safe-static-file";

// ── Utils ────────────────────────────────────────────────────────────────────
import { globalErrorHandler, buildErrorResponse } from "./src/utils/error/error-global-handler";
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
import { menuRoutes } from "./src/moduls/menu/menu.route";

// ── Upload ───────────────────────────────────────────────────────────────────
import { uploadRoute } from "./src/moduls/upload/upload.route";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const frontendUrl = process.env.FRONTEND_URL || "https://waruu.vercel.app";

const app = new Elysia()
  .use(
    cors({
      origin: (request) => {
        const origin = request.headers.get("origin");
        if (!origin) return true;
        const allowedOrigins = [
          "https://waruu.vercel.app",
          frontendUrl,
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:5173",
        ];
        if (
          allowedOrigins.includes(origin) ||
          /^http:\/\/localhost:\d+$/.test(origin) ||
          /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
        ) {
          return true;
        }
        return false;
      },
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    })
  )
  .use(swaggerConfig)

  // ── Health Check ─────────────────────────────────────────────────────────
  .get("/health", () => ({ status: "ok" }))

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

  // ── Static Files (Public Assets) ──────────────────────────────────────────
  .get("/public/*", ({ params, set }) => serveSafeStaticFile("public", params["*"], set))
  .get("/uploads/*", ({ params, set }) => serveSafeStaticFile("public/uploads", params["*"], set))

  // ── Public routes (tidak perlu token) ───────────────────────────────────
  .use(registerRoute)   // POST /auth/register
  .use(loginRoute)      // POST /auth/login
  .use(uploadRoute)     // GET|POST|DELETE /upload

  // ── Protected routes (wajib JWT token di header atau cookie) ────────────
  .use(usersRoute)      // GET|POST|PUT|DELETE /users

  // Cashier
  .use(ordersRoute)     // GET|POST|PUT|DELETE /orders
  .use(paymentRoute)    // GET|POST|PUT|DELETE /payment

  // Kitchen
  .use(kitchenRoute)    // GET|POST|PUT|DELETE /kitchen
  .use(menuRoutes)

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

  .listen(port);

logger.info(`🦊 Waru backend berjalan di port ${app.server?.port}`);
logger.info(`📚 Dokumentasi API: http://localhost:${app.server?.port}/docs`);