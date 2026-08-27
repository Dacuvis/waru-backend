import { Elysia } from "elysia";
import { AppError } from "../error/error-global-handler";

export type AllowedRole = "customer" | "cashier" | "kitchen" | "boss";

/**
 * Role Guard Middleware.
 * Mengamankan endpoint berdasarkan role user.
 * HARUS dipanggil setelah \`authMiddleware\` agar \`user\` tersedia di context.
 * 
 * @example
 * .use(requireRole(["boss", "cashier"]))
 */
export const requireRole = (allowedRoles: AllowedRole[]) => (app: Elysia) => {
  return app.onBeforeHandle(({ user }: any) => {
    // 1 & 2: Pastikan user sudah ter-authenticate (ada di context)
    if (!user) {
      throw new AppError("Akses ditolak. User tidak terautentikasi.", 401);
    }

    // 3: Baca user.role
    const userRole = user.role;

    // 7: Role yang undefined/null dianggap tidak memiliki privilege
    if (!userRole) {
      throw new AppError("Akses ditolak. User tidak memiliki role.", 403);
    }

    // 4 & 5 & 6: Bandingkan role, tolak jika tidak ada di whitelist
    if (!allowedRoles.includes(userRole)) {
      throw new AppError("Akses ditolak. Privilege Anda tidak mencukupi.", 403);
    }
  });
};