import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { BusinessAssistantModel } from "./business_assistant.model";
import { AnalyticsModel } from "../analytics/analytics.model";
import { AIService } from "../../utils/ai/ai.service";
import { buildBusinessContext } from "../../utils/ai/context-builder";
import type {
  CreateSessionRequest,
  SendMessageRequest,
} from "./business_assistant.type";
import type { AuthUser } from "../../utils/auth/auth.middleware";

export class BusinessAssistantService {
  private model = new BusinessAssistantModel();
  private analyticsModel = new AnalyticsModel();
  private aiService: AIService;

  constructor(customAiService?: AIService) {
    this.aiService = customAiService || new AIService();
  }

  async getSessions(query: PaginationQuery, user: AuthUser) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit, userId: user.id }, "Mengambil sesi business assistant");

    const filter: Record<string, any> = { userId: user.id };
    const { data, total } = await this.model.getSessions(skip, limit, filter);
    return buildPaginationResult(data, total, page, limit);
  }

  async getSessionById(id: string, user: AuthUser) {
    const session = await this.model.getSessionById(id);
    if (!session) throw new AppError(`Sesi dengan id ${id} tidak ditemukan`, 404, "E30");
    if (session.userId !== user.id) {
      throw new AppError(`Sesi dengan id ${id} tidak ditemukan`, 404, "E30");
    }
    logger.info({ sessionId: id, userId: user.id }, "Mengambil sesi by id");
    return session;
  }

  async createSession(data: CreateSessionRequest, user: AuthUser) {
    const now = new Date();

    // 1. Build sanitized business analytics context
    const { contextText } = await buildBusinessContext(this.analyticsModel);

    // 2. Process message through provider-agnostic AI Service
    const assistantResponse = await this.aiService.processChat(contextText, [], data.message);

    const session = {
      userId: user.id,
      bossId: user.id,
      title: data.title ?? `Sesi ${now.toLocaleDateString("id-ID")}`,
      messages: [
        { role: "user" as const, content: data.message, timestamp: now },
        {
          role: "assistant" as const,
          content: assistantResponse.message,
          timestamp: new Date(),
          insights: assistantResponse.insights,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.model.createSession(session as any);
    logger.info({ sessionId: result.insertedId, userId: user.id }, "Sesi business assistant dibuat");

    return {
      sessionId: result.insertedId,
      title: session.title,
      response: assistantResponse,
    };
  }

  async sendMessage(id: string, data: SendMessageRequest, user: AuthUser) {
    const session = await this.model.getSessionById(id);
    if (!session) throw new AppError(`Sesi dengan id ${id} tidak ditemukan`, 404, "E30");
    if (session.userId !== user.id) {
      throw new AppError(`Sesi dengan id ${id} tidak ditemukan`, 404, "E30");
    }

    const now = new Date();

    // 1. Save user message to session
    await this.model.addMessage(id, {
      role: "user",
      content: data.message,
      timestamp: now,
    });

    // 2. Build sanitized business analytics context
    const { contextText } = await buildBusinessContext(this.analyticsModel);

    // 3. Extract history messages for context
    const historyMessages = (session.messages || []).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content as string,
    }));

    // 4. Process message through provider-agnostic AI Service
    const assistantResponse = await this.aiService.processChat(contextText, historyMessages, data.message);

    // 5. Save assistant response to session
    await this.model.addMessage(id, {
      role: "assistant",
      content: assistantResponse.message,
      timestamp: new Date(),
      insights: assistantResponse.insights,
    });

    logger.info({ sessionId: id, userId: user.id }, "Pesan dikirim ke business assistant");
    return assistantResponse;
  }

  async deleteSession(id: string, user: AuthUser) {
    const session = await this.model.getSessionById(id);
    if (!session) throw new AppError(`Sesi dengan id ${id} tidak ditemukan`, 404, "E30");
    if (session.userId !== user.id) {
      throw new AppError(`Sesi dengan id ${id} tidak ditemukan`, 404, "E30");
    }

    const deleted = await this.model.deleteSession(id);
    logger.info({ sessionId: id, userId: user.id }, "Sesi business assistant dihapus");
    return deleted;
  }
}