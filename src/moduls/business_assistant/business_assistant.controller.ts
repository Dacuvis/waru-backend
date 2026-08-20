import { BusinessAssistantService } from "./business_assistant.service";
import type { CreateSessionRequest, SendMessageRequest } from "./business_assistant.type";

const service = new BusinessAssistantService();

export class BusinessAssistantController {
  async getSessions({ query }: { query: { page?: string; limit?: string } }) {
    return await service.getSessions(query);
  }

  async getSessionById({ params }: { params: { id: string } }) {
    return await service.getSessionById(params.id);
  }

  async createSession({ body }: { body: CreateSessionRequest }) {
    return await service.createSession(body);
  }

  async sendMessage({
    params,
    body,
  }: {
    params: { id: string };
    body: SendMessageRequest;
  }) {
    return await service.sendMessage(params.id, body);
  }

  async deleteSession({ params }: { params: { id: string } }) {
    return await service.deleteSession(params.id);
  }
}
