import { RegisterService } from "./register.service";
import type { ElysiaContext } from "../../utils/cookies/cookies";

export class RegisterController {
  private service = new RegisterService();

  async register(ctx: {
    body: { name: string; email: string; password: string };
    jwt: { sign: (payload: Record<string, unknown>) => Promise<string> };
  } & ElysiaContext) {
    return await this.service.register(
      ctx.body.name,
      ctx.body.email,
      ctx.body.password,
      ctx.jwt.sign,
      ctx,
    );
  }
}
