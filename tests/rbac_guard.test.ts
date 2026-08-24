import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { requireRole, type AllowedRole } from "../src/utils/auth/role.middleware";
import { globalErrorHandler } from "../src/utils/error/error-global-handler";

// Helper function to create an Elysia app with a specific user role injected
const createTestApp = (userRole: string | undefined | null, allowedRoles: AllowedRole[]) => {
  return new Elysia()
    .onError(({ error, set, code }) => globalErrorHandler({ error, set, code }))
    // Inject mock user into context (simulating authMiddleware)
    .derive(() => {
      if (userRole === null) {
        return { user: undefined };
      }
      return {
        user: {
          id: "test-user-id",
          email: "test@example.com",
          role: userRole,
        },
      };
    })
    // Apply role guard
    .use(requireRole(allowedRoles))
    // Protected endpoint
    .get("/protected", () => "SUCCESS");
};

// Helper function to perform request
const makeRequest = async (app: ReturnType<typeof createTestApp>) => {
  return await app.handle(new Request("http://localhost/protected"));
};

describe("RBAC Role Guard Middleware", () => {
  test("Case 1: boss -> requireRole(['boss']) => pass", async () => {
    const app = createTestApp("boss", ["boss"]);
    const res = await makeRequest(app);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("SUCCESS");
  });

  test("Case 2: cashier -> requireRole(['cashier']) => pass", async () => {
    const app = createTestApp("cashier", ["cashier"]);
    const res = await makeRequest(app);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("SUCCESS");
  });

  test("Case 3: cashier -> requireRole(['cashier', 'boss']) => pass", async () => {
    const app = createTestApp("cashier", ["cashier", "boss"]);
    const res = await makeRequest(app);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("SUCCESS");
  });

  test("Case 4: customer -> requireRole(['boss']) => reject", async () => {
    const app = createTestApp("customer", ["boss"]);
    const res = await makeRequest(app);
    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.message).toContain("Privilege Anda tidak mencukupi");
  });

  test("Case 5: kitchen -> requireRole(['cashier']) => reject", async () => {
    const app = createTestApp("kitchen", ["cashier"]);
    const res = await makeRequest(app);
    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.message).toContain("Privilege Anda tidak mencukupi");
  });

  test("Case 6: user tanpa role (undefined) -> requireRole(['boss']) => reject", async () => {
    const app = createTestApp(undefined, ["boss"]);
    const res = await makeRequest(app);
    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.message).toContain("tidak memiliki role");
  });

  test("Case 7: unknown role ('random') -> requireRole(['boss']) => reject", async () => {
    const app = createTestApp("random", ["boss"]);
    const res = await makeRequest(app);
    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.message).toContain("Privilege Anda tidak mencukupi");
  });

  test("Case 8: boss -> requireRole(['boss', 'cashier']) => pass", async () => {
    const app = createTestApp("boss", ["boss", "cashier"]);
    const res = await makeRequest(app);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("SUCCESS");
  });

  test("Extra: tidak ada user sama sekali -> requireRole(['boss']) => reject", async () => {
    const app = createTestApp(null, ["boss"]);
    const res = await makeRequest(app);
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.message).toContain("tidak terautentikasi");
  });
});