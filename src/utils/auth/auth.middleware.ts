import { Elysia } from "elysia";
import { jwtPlugin } from "../jwt/jwt.plugin";
import { AppError } from "../error/error-global-handler";
import { TOKEN_COOKIE_NAME } from "../cookies/cookies";

/**
 * Auth Middleware untuk Waru Backend menggunakan @elysia/jwt.
 *
 * Gunakan dengan .use(authMiddleware) SEBELUM mendefinisikan route
 * di dalam instance Elysia yang sama.
 *
 * Middleware ini akan:
 * 1. Ambil token dari header Authorization: Bearer <token>
 * 2. Fallback ke cookie `waru_token` kalau header tidak ada
 * 3. Verifikasi token via @elysia/jwt
 * 4. Inject payload sebagai `user` ke dalam context
 *
 * @example
 * export const usersRoute = new Elysia()
 *   .use(authMiddleware)
 *   .get("/users", ({ user }) => user)  // ← user tersedia di sini
 */
export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, request, cookie }) => {
    // 1. Cek header Authorization: Bearer <token>
    let token: string | undefined;

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    // 2. Fallback: ambil dari cookie
    if (!token) {
      token = cookie[TOKEN_COOKIE_NAME]?.value;
    }

    if (!token) {
      throw new AppError("Akses ditolak. Token tidak ditemukan.", 401);
    }

    // 3. Verifikasi token dengan @elysia/jwt
    const payload = await jwt.verify(token);
    if (!payload) {
      throw new AppError("Token tidak valid atau sudah kadaluarsa.", 401);
    }

    return { user: payload };
  });
