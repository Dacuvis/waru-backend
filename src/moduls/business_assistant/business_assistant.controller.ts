import { BusinessAssistantService } from "./business_assistant.service";
import type { CreateSessionRequest, SendMessageRequest } from "./business_assistant.type";
import type { AuthUser } from "../../utils/auth/auth.middleware";
import { AppError } from "../../utils/error/error-global-handler";

const service = new BusinessAssistantService();

export class BusinessAssistantController {
  async getSessions({ query, user }: { query: { page?: string; limit?: string }; user?: AuthUser }) {
    if (!user) throw new AppError("Akses ditolak. User tidak terautentikasi.", 401);
    return await service.getSessions(query, user);
  }

  async getSessionById({ params, user }: { params: { id: string }; user?: AuthUser }) {
    if (!user) throw new AppError("Akses ditolak. User tidak terautentikasi.", 401);
    return await service.getSessionById(params.id, user);
  }

  async createSession({ body, user }: { body: CreateSessionRequest; user?: AuthUser }) {
    if (!user) throw new AppError("Akses ditolak. User tidak terautentikasi.", 401);
    return await service.createSession(body, user);
  }

  async sendMessage({
    params,
    body,
    user,
  }: {
    params: { id: string };
    body: SendMessageRequest;
    user?: AuthUser;
  }) {
    if (!user) throw new AppError("Akses ditolak. User tidak terautentikasi.", 401);
    return await service.sendMessage(params.id, body, user);
  }

  async deleteSession({ params, user }: { params: { id: string }; user?: AuthUser }) {
    if (!user) throw new AppError("Akses ditolak. User tidak terautentikasi.", 401);
    return await service.deleteSession(params.id, user);
  }
}