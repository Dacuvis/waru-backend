/**
 * Cookie utility untuk Waru Backend
 *
 * Konfigurasi terpusat dan helper set/get/clear cookie JWT.
 * Menggunakan Elysia native cookie API (ctx.cookie[name].set / .remove)
 */

// ─── Konfigurasi ────────────────────────────────────────────────────────────

/** Nama cookie JWT */
export const TOKEN_COOKIE_NAME = "waru_token";

function getTokenCookieMaxAge(): number {
  const expiry = Bun.env.JWT_EXPIRES_IN ?? "7d";
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60 * 24 * 7;

  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return Number(match[1]) * multipliers[match[2] as keyof typeof multipliers];
}

/** Durasi cookie disamakan dengan masa berlaku JWT. */
export const TOKEN_COOKIE_MAX_AGE = getTokenCookieMaxAge();

export interface CookieConfig {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  path?: string;
}

export const defaultCookieConfig: Required<CookieConfig> = {
  maxAge: TOKEN_COOKIE_MAX_AGE,
  httpOnly: true,
  secure: Bun.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// ─── Tipe context Elysia dengan cookie ──────────────────────────────────────

export interface ElysiaContext {
  cookie: Record<
    string,
    {
      value: string;
      set: (options: { value: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: string; path?: string }) => void;
      remove: () => void;
    }
  >;
}

// ─── Helper functions ───────────────────────────────────────────────────────

/**
 * Set cookie JWT token menggunakan Elysia native cookie API.
 *
 * @example
 * setCookieToken(ctx, token);
 */
export function setCookieToken(ctx: ElysiaContext, token: string, config: CookieConfig = {}): void {
  const opts = { ...defaultCookieConfig, ...config };
  const cookie = ctx.cookie[TOKEN_COOKIE_NAME];
  if (!cookie) return;

  cookie.set({
    value: token,
    maxAge: opts.maxAge,
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
  });
}

/**
 * Ambil nilai cookie JWT dari request.
 * Mengembalikan string token atau null kalau tidak ada.
 */
export function getCookieToken(ctx: ElysiaContext): string | null {
  const cookie = ctx.cookie[TOKEN_COOKIE_NAME];
  if (!cookie || !cookie.value) return null;
  return cookie.value;
}

/**
 * Hapus cookie JWT (logout).
 */
export function clearCookieToken(ctx: ElysiaContext): void {
  const cookie = ctx.cookie[TOKEN_COOKIE_NAME];
  if (!cookie) return;
  cookie.remove();
}
