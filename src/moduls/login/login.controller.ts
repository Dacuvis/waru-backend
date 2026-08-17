import { LoginService } from "./login.service";
import type { ElysiaContext } from "../../utils/cookies/cookies";

export class LoginController {
  private service = new LoginService();

  async login(ctx: {
    body: { email: string; password: string };
    jwt: { sign: (payload: Record<string, unknown>) => Promise<string> };
  } & ElysiaContext) {
    return await this.service.login(
      ctx.body.email,
      ctx.body.password,
      ctx.jwt.sign,
      ctx,
    );
  }
}
