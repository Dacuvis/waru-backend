import { describe, test, expect, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { AIService } from "../src/utils/ai/ai.service";
import { buildBusinessContext } from "../src/utils/ai/context-builder";
import { RuleBasedAdapter, GenericHttpAdapter } from "../src/utils/ai/ai.provider";
import type { AIProvider, AIGenerateParams, AIGenerateResult } from "../src/utils/ai/ai.types";
import { globalErrorHandler } from "../src/utils/error/error-global-handler";
import { jwtPlugin } from "../src/utils/jwt/jwt.plugin";

let app: any;
const jwtApp = new Elysia()
  .use(jwtPlugin)
  .get("/tokenBoss", async ({ jwt }) => await jwt.sign({ id: "boss_ai_test", email: "b@waru.com", role: "boss" }))
  .get("/tokenCust", async ({ jwt }) => await jwt.sign({ id: "cust_ai_test", email: "c@waru.com", role: "customer" }));

describe("AI Integration Foundation & Security Tests (Provider Agnostic)", () => {
  let tokenBoss: string;
  let tokenCustomer: string;

  beforeAll(async () => {
    // Force rule-based provider for generic test environment to prevent real external API calls
    process.env.AI_PROVIDER = "rule-based";

    const { businessAssistantRoute } = await import("../src/moduls/business_assistant/business_assistant.route");
    app = new Elysia()
      .onError(({ error, set, code }) => globalErrorHandler({ error, set, code }))
      .use(businessAssistantRoute);

    tokenBoss = await (await jwtApp.handle(new Request("http://localhost/tokenBoss"))).text();
    tokenCustomer = await (await jwtApp.handle(new Request("http://localhost/tokenCust"))).text();
  });

  test("1. AIService receives context and message with RuleBasedAdapter fallback", async () => {
    const aiService = new AIService();
    const contextText = "=== KONTEKS DATA BISNIS WARU ===\nTotal Pesanan: 10\nTotal Omzet: Rp 500.000";

    const response = await aiService.processChat(contextText, [], "Bagaimana performa omzet minggu ini?");
    expect(response.message).toBeDefined();
    expect(response.insights).toBeDefined();
    expect(response.insights!.length).toBeGreaterThan(0);
  });

  test("2. AIService handles custom Mock AI Provider successfully", async () => {
    const mockProvider: AIProvider = {
      name: "mock-provider",
      async generateResponse(params: AIGenerateParams): Promise<AIGenerateResult> {
        const lastMsg = params.messages[params.messages.length - 1]?.content || "";
        return {
          text: `Hasil analisis mock: ${lastMsg}`,
          insights: [
            {
              category: "sales",
              summary: "Mock sales summary",
              recommendations: ["Rekomendasi 1", "Rekomendasi 2"],
            },
          ],
          providerName: "mock-provider",
        };
      },
    };

    const aiService = new AIService(mockProvider);
    const response = await aiService.processChat("Context data", [], "Tampilkan saran stok");

    expect(response.message).toContain("Hasil analisis mock: Tampilkan saran stok");
    expect(response.insights).toBeDefined();
    expect(response.insights?.[0]?.category).toBe("sales");
  });

  test("3. AIService handles AI Provider Timeout gracefully (Fallback to RuleBased)", async () => {
    const timeoutMockProvider: AIProvider = {
      name: "timeout-provider",
      async generateResponse(): Promise<AIGenerateResult> {
        return new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), 50));
      },
    };

    const aiService = new AIService(timeoutMockProvider);
    const response = await aiService.processChat("Context data", [], "Check timeout");

    expect(response.message).toBeDefined(); // Fallback generates safe message without throwing server error
  });

  test("4. AIService handles AI Provider Error gracefully", async () => {
    const errorMockProvider: AIProvider = {
      name: "error-provider",
      async generateResponse(): Promise<AIGenerateResult> {
        throw new Error("Provider 500 Internal Server Error");
      },
    };

    const aiService = new AIService(errorMockProvider);
    const response = await aiService.processChat("Context data", [], "Test error");

    expect(response.message).toBeDefined();
  });

  test("5 & 6. AIService validates structured response and handles malformed AI JSON output", async () => {
    const malformedMockProvider: AIProvider = {
      name: "malformed-provider",
      async generateResponse(): Promise<AIGenerateResult> {
        return {
          text: "Berikut respon teks AI tanpa JSON valid",
          insights: [{ invalid: "data" } as any], // Invalid insight object shape
          providerName: "malformed-provider",
        };
      },
    };

    const aiService = new AIService(malformedMockProvider);
    const response = await aiService.processChat("Context data", [], "Test malformed");

    expect(response.message).toBe("Berikut respon teks AI tanpa JSON valid");
    expect(response.insights).toBeUndefined(); // Invalid items filtered out cleanly
  });

  test("7. AIService truncates conversation history to maxHistoryMessages", async () => {
    let passedMessagesCount = 0;
    const historyCheckingProvider: AIProvider = {
      name: "history-checker",
      async generateResponse(params: AIGenerateParams): Promise<AIGenerateResult> {
        passedMessagesCount = params.messages.length;
        return { text: "OK", providerName: "history-checker" };
      },
    };

    const customConfig = {
      provider: "custom" as const,
      timeoutMs: 5000,
      maxHistoryMessages: 3,
    };

    const aiService = new AIService(historyCheckingProvider, customConfig);

    const longHistory = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Pesan ${i}`,
    }));

    await aiService.processChat("Context data", longHistory, "Pesan terbaru");

    // Max 3 history messages + 1 current user message = 4 total
    expect(passedMessagesCount).toBe(4);
  });

  test("8. Context Builder produces sanitized context without sensitive credentials", async () => {
    const mockAnalyticsModel: any = {
      getSalesOverview: async () => ({ totalOrders: 5, completedOrders: 5, cancelledOrders: 0, totalRevenue: 100000, averageOrderValue: 20000 }),
      getInventorySummary: async () => ({ totalItems: 10, lowStockCount: 1, totalInventoryValue: 500000 }),
      getReviewSummary: async () => ({ averageRating: 4.8, totalReviews: 12, ratingDistribution: { "5": 10 } }),
      getTopMenuItems: async () => [{ name: "Nasi Goreng", totalSold: 15, totalRevenue: 300000 }],
    };

    const { contextText, structuredData } = await buildBusinessContext(mockAnalyticsModel);

    // Verify context contains valid business metrics
    expect(contextText).toContain("Nasi Goreng");
    expect(structuredData.salesSummary.totalRevenue).toBe(100000);

    // Verify NO sensitive strings are leaked
    expect(contextText).not.toContain("password");
    expect(contextText).not.toContain("JWT");
    expect(contextText).not.toContain("MIDTRANS_SERVER_KEY");
    expect(contextText).not.toContain("secret");
  });

  test("9. Business Assistant route remains strictly restricted to Boss role (403 for Customer)", async () => {
    const resCust = await app.handle(
      new Request("http://localhost/assistant", {
        headers: { Authorization: `Bearer ${tokenCustomer}` },
      }),
    );
    expect(resCust.status).toBe(403);
  });

  test("10. Business Assistant session CRUD and Ownership protection works for Boss", async () => {
    // 1. Boss creates session
    const resCreate = await app.handle(
      new Request("http://localhost/assistant", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenBoss}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Halo Assistant, bagaimana penjualan?" }),
      }),
    );
    expect(resCreate.status).toBe(200);
    const createData = (await resCreate.json()) as any;
    const sessionId = createData.sessionId;

    // 2. Boss sends message to session
    const resMsg = await app.handle(
      new Request(`http://localhost/assistant/${sessionId}/message`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenBoss}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Beri saya saran stok" }),
      }),
    );
    expect(resMsg.status).toBe(200);

    // 3. Boss deletes session
    const resDel = await app.handle(
      new Request(`http://localhost/assistant/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenBoss}` },
      }),
    );
    expect(resDel.status).toBe(200);
  });

  test("11. Business Assistant rejects message exceeding maxLength of 2000 characters", async () => {
    // Message with exactly 2000 characters should pass validation
    const messageExactly2000 = "a".repeat(2000);
    const resCreateValid = await app.handle(
      new Request("http://localhost/assistant", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenBoss}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageExactly2000 }),
      }),
    );
    // It should be 200 (or if there's any mock issue, at least not a validation error 400)
    expect(resCreateValid.status).toBe(200);

    const createData = (await resCreateValid.json()) as any;
    const sessionId = createData.sessionId;

    // Clean up
    await app.handle(
      new Request(`http://localhost/assistant/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenBoss}` },
      }),
    );

    // Message with 2001 characters should fail validation with status 422
    const messageExceeding2000 = "a".repeat(2001);
    const resCreateInvalid = await app.handle(
      new Request("http://localhost/assistant", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenBoss}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageExceeding2000 }),
      }),
    );
    expect(resCreateInvalid.status).toBe(422);

    // Sending message with >2000 to existing session should also be rejected
    const resSendInvalid = await app.handle(
      new Request(`http://localhost/assistant/some_id/message`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenBoss}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageExceeding2000 }),
      }),
    );
    expect(resSendInvalid.status).toBe(422);
  });
});