import { beforeAll, describe, expect, test } from "bun:test";

let signJwt: typeof import("../src/utils/jwt/jwt").signJwt;
let verifyJwt: typeof import("../src/utils/jwt/jwt").verifyJwt;

beforeAll(async () => {
  Bun.env.JWT_SECRET ??= "test-secret-at-least-32-characters";
  Bun.env.JWT_EXPIRES_IN = "1h";
  ({ signJwt, verifyJwt } = await import("../src/utils/jwt/jwt"));
});

describe("AI-written JWT utility", () => {
  test("signs and verifies a token", async () => {
    const token = await signJwt({ id: "user-1", email: "user@example.com" });
    const payload = await verifyJwt(token);

    expect(payload.id).toBe("user-1");
    expect(payload.email).toBe("user@example.com");
    expect(payload.exp).toBeGreaterThan(payload.iat ?? 0);
  });

  test("rejects a malformed token", async () => {
    await expect(verifyJwt("not-a-jwt")).rejects.toMatchObject({ statusCode: 401 });
    await expect(verifyJwt("aaa.bbb.ccc")).rejects.toMatchObject({ statusCode: 401 });
  });

  test("preserves UTF-8 payload values", async () => {
    const token = await signJwt({ id: "pengguna-1", email: "tést@example.com" });
    const payload = await verifyJwt(token);

    expect(payload.email).toBe("tést@example.com");
  });

  test("rejects a tampered payload", async () => {
    const token = await signJwt({ id: "user-1", email: "user@example.com" });
    const [header, body, signature] = token.split(".");
    const tamperedBody = `${body?.slice(0, -1)}${body?.endsWith("a") ? "b" : "a"}`;

    await expect(verifyJwt(`${header}.${tamperedBody}.${signature}`)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
