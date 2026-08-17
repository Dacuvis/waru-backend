import { Elysia } from "elysia";
import { LoginController } from "./login.controller";
import { loginValidation } from "./login.validation";
import { jwtPlugin } from "../../utils/jwt/jwt.plugin";

const ctrl = new LoginController();

export const loginRoute = new Elysia()
  .use(jwtPlugin)
  .post("/auth/login", (ctx: any) => ctrl.login(ctx), loginValidation);
