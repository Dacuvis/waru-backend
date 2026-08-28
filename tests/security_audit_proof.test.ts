import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { globalErrorHandler, buildErrorResponse } from "../src/utils/error/error-global-handler";
import { registerRoute } from "../src/moduls/register/register.route";
import { loginRoute } from "../src/moduls/login/login.route";
import { usersRoute } from "../src/moduls/users/users.route";
import { ordersRoute, paymentRoute } from "../src/moduls/cashier/cashier.route";
import { notificationRoute } from "../src/moduls/notification/notification.route";
import { businessAssistantRoute } from "../src/moduls/business_assistant/business_assistant.route";
import { uploadRoute } from "../src/moduls/upload/upload.route";
import { jwtPlugin } from "../src/utils/jwt/jwt.plugin";
import { serveSafeStaticFile } from "./safe-static-file";

const app = new Elysia()
  .onError(({ error, set, code }) => globalErrorHandler({ error, set, code }))
  .get("/public/*", ({ params, set }) => serveSafeStaticFile("public", params["*"], set))
  .get("/uploads/*", ({ params, set }) => serveSafeStaticFile("public/uploads", params["*"], set))
  .use(registerRoute)
  .use(loginRoute)
  .use(usersRoute)
  .use(ordersRoute)
  .use(paymentRoute)
  .use(notificationRoute)
  .use(businessAssistantRoute)
  .use(uploadRoute);

describe("Comprehensive Backend Security Audit Suite", () => {
  // --- AUTH & RBAC TESTS ---
  test("Auth: Request without token returns 401", async () => {
    const response = await app.handle(new Request("http://localhost/users"));
    expect(response.status).toBe(401);
  });

  test("Auth: Invalid JWT token returns 401", async () => {
    const response = await app.handle(
      new Request("http://localhost/users", {
        headers: { Authorization: "Bearer invalid.jwt.token" },
      }),
    );
    expect(response.status).toBe(401);
  });

  test("RBAC: Customer token cannot access Boss endpoint (/users)", async () => {
    // Generate valid customer token
    const jwtApp = new Elysia().use(jwtPlugin);
    let token = "";
    jwtApp.get("/token", async ({ jwt }) => {
      token = await jwt.sign({ id: "cust123", email: "cust@waru.com", role: "customer" });
      return token;
    });
    await jwtApp.handle(new Request("http://localhost/token"));

    const response = await app.handle(
      new Request("http://localhost/users", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(response.status).toBe(403);
  });

  test("RBAC: Cashier token cannot access Boss endpoint (/users)", async () => {
    const jwtApp = new Elysia().use(jwtPlugin);
    let token = "";
    jwtApp.get("/token", async ({ jwt }) => {
      token = await jwt.sign({ id: "cashier123", email: "cashier@waru.com", role: "cashier" });
      return token;
    });
    await jwtApp.handle(new Request("http://localhost/token"));

    const response = await app.handle(
      new Request("http://localhost/users", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(response.status).toBe(403);
  });

  test("RBAC: Kitchen token cannot access Boss endpoint (/users)", async () => {
    const jwtApp = new Elysia().use(jwtPlugin);
    let token = "";
    jwtApp.get("/token", async ({ jwt }) => {
      token = await jwt.sign({ id: "kitchen123", email: "kitchen@waru.com", role: "kitchen" });
      return token;
    });
    await jwtApp.handle(new Request("http://localhost/token"));

    const response = await app.handle(
      new Request("http://localhost/users", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(response.status).toBe(403);
  });

  // --- REMEDIATED SECURITY REGRESSION TESTS ---
  test("SEC-CRIT-001: Path Traversal on /uploads/* and /public/* is blocked", async () => {
    const res = await app.handle(new Request("http://localhost/uploads/../../.env"));
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).not.toContain("JWT_SECRET=");

    const resPublic = await app.handle(new Request("http://localhost/public/../.env"));
    expect(resPublic.status).toBe(404);
    const textPublic = await resPublic.text();
    expect(textPublic).not.toContain("JWT_SECRET=");

    // Legitimate static upload file is accessible
    const testFilePath = "public/uploads/test-legit.txt";
    await Bun.write(testFilePath, "legit content");
    try {
      const legitRes = await app.handle(new Request("http://localhost/uploads/test-legit.txt"));
      expect(legitRes.status).toBe(200);
      expect(await legitRes.text()).toBe("legit content");
    } finally {
      const { existsSync } = await import("node:fs");
      const { unlink } = await import("node:fs/promises");
      if (existsSync(testFilePath)) await unlink(testFilePath);
    }
  });

  test("SEC-CRIT-002: Server overrides untrusted client price with database price", async () => {
    const { db } = await import("../src/config/client");
    const { ObjectId } = await import("mongodb");

    // Seed menu item with official price 200,000
    const menuId = new ObjectId().toString();
    await db.collection("menu").insertOne({
      _id: new ObjectId(menuId) as any,
      name: "Premium Steak",
      price: 200000,
      category: "Heavy Food",
      isAvailable: true,
      isRecommended: true,
      imageUrl: "http://example.com/steak.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      const orderService = new (await import("../src/moduls/cashier/cashier.service")).OrderService();
      const result = await orderService.create({
        tableNumber: 1,
        items: [
          { menuId, name: "Tampered Steak", quantity: 2, price: 1 }, // Client sends price = 1
        ],
      });

      expect(result.insertedId).toBeDefined();

      // Verify stored order has database price (200000) and calculated total (400000)
      const storedOrder = await db.collection("orders").findOne({ _id: result.insertedId });
      expect(storedOrder).not.toBeNull();
      expect(storedOrder!.items[0].price).toBe(200000);
      expect(storedOrder!.items[0].subtotal).toBe(400000);
      expect(storedOrder!.totalAmount).toBe(400000);

      // Verify update order also recalculates price from DB and overrides tampered client price
      await orderService.update(result.insertedId.toString(), {
        items: [{ menuId, name: "Tampered Steak Update", quantity: 3, price: 1 }],
      });
      const updatedOrder = await db.collection("orders").findOne({ _id: result.insertedId });
      expect(updatedOrder!.items[0].price).toBe(200000);
      expect(updatedOrder!.items[0].subtotal).toBe(600000);
      expect(updatedOrder!.totalAmount).toBe(600000);
    } finally {
      await db.collection("menu").deleteOne({ _id: new ObjectId(menuId) as any });
      await db.collection("orders").deleteMany({ "items.menuId": menuId });
    }
  });

  test("SEC-CRIT-003: Customer A cannot access Customer B's order", async () => {
    const { db } = await import("../src/config/client");
    const { ObjectId } = await import("mongodb");
    const { jwtPlugin } = await import("../src/utils/jwt/jwt.plugin");

    const jwtApp = new Elysia().use(jwtPlugin);
    let tokenA = "";
    let tokenCashier = "";
    jwtApp.get("/tokenA", async ({ jwt }) => await jwt.sign({ id: "cust_A", email: "a@waru.com", role: "customer" }));
    jwtApp.get("/tokenCashier", async ({ jwt }) => await jwt.sign({ id: "cashier_1", email: "c@waru.com", role: "cashier" }));

    const resA = await jwtApp.handle(new Request("http://localhost/tokenA"));
    tokenA = await resA.text();
    const resC = await jwtApp.handle(new Request("http://localhost/tokenCashier"));
    tokenCashier = await resC.text();

    // Seed order for Customer B
    const orderBId = new ObjectId().toString();
    await db.collection("orders").insertOne({
      _id: new ObjectId(orderBId) as any,
      customerId: "cust_B",
      tableNumber: 2,
      items: [{ menuId: "itemB", name: "Item B", quantity: 1, price: 50000, subtotal: 50000 }],
      totalAmount: 50000,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      // Customer A GET /orders/:id for Customer B's order -> 404
      const resGetSingle = await app.handle(
        new Request(`http://localhost/orders/${orderBId}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        }),
      );
      expect(resGetSingle.status).toBe(404);

      // Customer A GET /orders -> should not list Customer B's order
      const resGetAll = await app.handle(
        new Request("http://localhost/orders", {
          headers: { Authorization: `Bearer ${tokenA}` },
        }),
      );
      expect(resGetAll.status).toBe(200);
      const jsonAll = (await resGetAll.json()) as any;
      const foundB = jsonAll.data.find((o: any) => o._id === orderBId);
      expect(foundB).toBeUndefined();

      // Cashier GET /orders/:id for Customer B's order -> PASS (200)
      const resCashierGet = await app.handle(
        new Request(`http://localhost/orders/${orderBId}`, {
          headers: { Authorization: `Bearer ${tokenCashier}` },
        }),
      );
      expect(resCashierGet.status).toBe(200);
    } finally {
      await db.collection("orders").deleteOne({ _id: new ObjectId(orderBId) as any });
    }
  });

  test("SEC-CRIT-004: Customer A cannot access Customer B's payment", async () => {
    const { db } = await import("../src/config/client");
    const { ObjectId } = await import("mongodb");
    const { jwtPlugin } = await import("../src/utils/jwt/jwt.plugin");

    const jwtApp = new Elysia().use(jwtPlugin);
    let tokenA = "";
    let tokenCashier = "";
    jwtApp.get("/tokenA", async ({ jwt }) => await jwt.sign({ id: "cust_A", email: "a@waru.com", role: "customer" }));
    jwtApp.get("/tokenCashier", async ({ jwt }) => await jwt.sign({ id: "cashier_1", email: "c@waru.com", role: "cashier" }));

    tokenA = await (await jwtApp.handle(new Request("http://localhost/tokenA"))).text();
    tokenCashier = await (await jwtApp.handle(new Request("http://localhost/tokenCashier"))).text();

    // Seed order for Customer B & payment for Customer B
    const orderBId = new ObjectId().toString();
    const paymentBId = new ObjectId().toString();

    await db.collection("orders").insertOne({
      _id: new ObjectId(orderBId) as any,
      customerId: "cust_B",
      tableNumber: 3,
      items: [],
      totalAmount: 30000,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection("payment").insertOne({
      _id: new ObjectId(paymentBId) as any,
      orderId: orderBId,
      tableNumber: 3,
      totalAmount: 30000,
      paidAmount: 30000,
      changeAmount: 0,
      method: "cash",
      status: "paid",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      // Customer A GET /payment/:id -> 404
      const resById = await app.handle(
        new Request(`http://localhost/payment/${paymentBId}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        }),
      );
      expect(resById.status).toBe(404);

      // Customer A GET /payment/order/:orderId -> 404
      const resByOrder = await app.handle(
        new Request(`http://localhost/payment/order/${orderBId}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        }),
      );
      expect(resByOrder.status).toBe(404);

      // Customer A GET /payment -> does not contain Payment B
      const resList = await app.handle(
        new Request("http://localhost/payment", {
          headers: { Authorization: `Bearer ${tokenA}` },
        }),
      );
      expect(resList.status).toBe(200);
      const jsonList = (await resList.json()) as any;
      const foundPaymentB = jsonList.data.find((p: any) => p._id === paymentBId);
      expect(foundPaymentB).toBeUndefined();

      // Customer A POST /payment for Customer B's order -> 404
      const resCreatePayment = await app.handle(
        new Request("http://localhost/payment", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenA}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderBId,
            tableNumber: 3,
            totalAmount: 30000,
            method: "cash",
            paidAmount: 30000,
            changeAmount: 0,
          }),
        }),
      );
      expect(resCreatePayment.status).toBe(404);

      // Cashier GET /payment/:id -> 200
      const resCashier = await app.handle(
        new Request(`http://localhost/payment/${paymentBId}`, {
          headers: { Authorization: `Bearer ${tokenCashier}` },
        }),
      );
      expect(resCashier.status).toBe(200);
    } finally {
      await db.collection("orders").deleteOne({ _id: new ObjectId(orderBId) as any });
      await db.collection("payment").deleteOne({ _id: new ObjectId(paymentBId) as any });
    }
  });

  test("High Vulnerability: Notification Exposure & Manipulation by Customer", async () => {
    const jwtApp = new Elysia().use(jwtPlugin);
    let token = "";
    jwtApp.get("/token", async ({ jwt }) => {
      token = await jwt.sign({ id: "cust123", email: "cust@waru.com", role: "customer" });
      return token;
    });
    await jwtApp.handle(new Request("http://localhost/token"));

    // GET /notification allows customer
    const getRes = await app.handle(
      new Request("http://localhost/notification", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(getRes.status).not.toBe(403);

    // PATCH /notification/read-all allows customer
    const patchRes = await app.handle(
      new Request("http://localhost/notification/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(patchRes.status).not.toBe(403);
  });

  test("Business Assistant Session Security - BOLA & Ownership Protection", async () => {
    const { db } = await import("../src/config/client");
    const { ObjectId } = await import("mongodb");
    const { jwtPlugin } = await import("../src/utils/jwt/jwt.plugin");

    const jwtApp = new Elysia().use(jwtPlugin);
    jwtApp.get("/tokenBossA", async ({ jwt }) => await jwt.sign({ id: "boss_A", email: "a@waru.com", role: "boss" }));
    jwtApp.get("/tokenBossB", async ({ jwt }) => await jwt.sign({ id: "boss_B", email: "b@waru.com", role: "boss" }));

    const tokenA = await (await jwtApp.handle(new Request("http://localhost/tokenBossA"))).text();
    const tokenB = await (await jwtApp.handle(new Request("http://localhost/tokenBossB"))).text();

    // Scenario F: User A membuat session sambil mengirim ownerId/userId milik User B -> server tetap menyimpan ownership berdasarkan JWT User A
    const resCreate = await app.handle(
      new Request("http://localhost/assistant", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Session Boss A",
          message: "Analisis penjualan minggu ini",
          userId: "boss_B", // Tampered ownership field
          bossId: "boss_B",
          ownerId: "boss_B",
        }),
      }),
    );
    expect(resCreate.status).toBe(200);
    const createData = (await resCreate.json()) as any;
    const sessionId = createData.sessionId;

    // Verify stored session in DB has correct userId and bossId set to boss_A (not boss_B)
    const storedSession = await db.collection("business_assistant").findOne({ _id: new ObjectId(sessionId) });
    expect(storedSession).not.toBeNull();
    expect(storedSession!.userId).toBe("boss_A");
    expect(storedSession!.bossId).toBe("boss_A");

    try {
      // Scenario A: User A bisa GET session tersebut
      const resGetA = await app.handle(
        new Request(`http://localhost/assistant/${sessionId}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        }),
      );
      expect(resGetA.status).toBe(200);

      // Scenario B: User B mencoba GET session milik User A -> 404
      const resGetB = await app.handle(
        new Request(`http://localhost/assistant/${sessionId}`, {
          headers: { Authorization: `Bearer ${tokenB}` },
        }),
      );
      expect(resGetB.status).toBe(404);

      // Scenario C: User B mencoba UPDATE (kirim message) ke session milik User A -> 404
      const resSendMessageB = await app.handle(
        new Request(`http://localhost/assistant/${sessionId}/message`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenB}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Tampilkan omzet hari ini",
          }),
        }),
      );
      expect(resSendMessageB.status).toBe(404);

      // Scenario E: User B melakukan LIST -> tidak boleh menerima session milik User A
      const resListB = await app.handle(
        new Request("http://localhost/assistant", {
          headers: { Authorization: `Bearer ${tokenB}` },
        }),
      );
      expect(resListB.status).toBe(200);
      const listDataB = (await resListB.json()) as any;
      const foundSession = listDataB.data.find((s: any) => s._id === sessionId);
      expect(foundSession).toBeUndefined();

      // Scenario D: User B mencoba DELETE session milik User A -> 404
      const resDeleteB = await app.handle(
        new Request(`http://localhost/assistant/${sessionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${tokenB}` },
        }),
      );
      expect(resDeleteB.status).toBe(404);

      // Scenario D (Owner): User A delete session miliknya -> 200
      const resDeleteA = await app.handle(
        new Request(`http://localhost/assistant/${sessionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${tokenA}` },
        }),
      );
      expect(resDeleteA.status).toBe(200);

    } finally {
      await db.collection("business_assistant").deleteOne({ _id: new ObjectId(sessionId) });
    }
  });

  test("Business Assistant Session Security - Legacy Session Fail-Closed", async () => {
    const { db } = await import("../src/config/client");
    const { ObjectId } = await import("mongodb");
    const { jwtPlugin } = await import("../src/utils/jwt/jwt.plugin");

    const jwtApp = new Elysia().use(jwtPlugin);
    jwtApp.get("/tokenBossX", async ({ jwt }) => await jwt.sign({ id: "boss_X", email: "x@waru.com", role: "boss" }));
    const tokenX = await (await jwtApp.handle(new Request("http://localhost/tokenBossX"))).text();

    // Create a legacy session directly in DB (without userId/bossId)
    const legacySessionId = new ObjectId();
    await db.collection("business_assistant").insertOne({
      _id: legacySessionId,
      title: "Legacy Session",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    try {
      // 1. GET /assistant/:id -> should fail closed (404)
      const resGet = await app.handle(
        new Request(`http://localhost/assistant/${legacySessionId.toString()}`, {
          headers: { Authorization: `Bearer ${tokenX}` },
        }),
      );
      expect(resGet.status).toBe(404);

      // 2. POST /assistant/:id/message -> should fail closed (404)
      const resSendMessage = await app.handle(
        new Request(`http://localhost/assistant/${legacySessionId.toString()}/message`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenX}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: "Hello legacy" }),
        }),
      );
      expect(resSendMessage.status).toBe(404);

      // 3. DELETE /assistant/:id -> should fail closed (404)
      const resDelete = await app.handle(
        new Request(`http://localhost/assistant/${legacySessionId.toString()}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${tokenX}` },
        }),
      );
      expect(resDelete.status).toBe(404);
    } finally {
      await db.collection("business_assistant").deleteOne({ _id: legacySessionId });
    }
  });
});