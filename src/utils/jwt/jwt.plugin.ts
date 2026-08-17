import { Elysia } from "elysia";
import { jwt } from "@elysia/jwt";

if (!Bun.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}

/**
 * JWT Plugin untuk Waru Backend menggunakan @elysia/jwt.
 *
 * Menyediakan `jwt.sign()` dan `jwt.verify()` di ctx setiap route
 * yang meng-use plugin ini.
 *
 * @example
 * app.use(jwtPlugin).get("/protected", async ({ jwt, request }) => {
 *   const payload = await jwt.verify(token);
 * });
 */
export const jwtPlugin = new Elysia({ name: "jwt-plugin" }).use(
  jwt({
    name: "jwt",
    secret: Bun.env.JWT_SECRET,
    exp: Bun.env.JWT_EXPIRES_IN ?? "7d",
  }),
);
