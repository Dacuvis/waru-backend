import { Elysia } from "elysia";
import { RegisterController } from "./register.controller";
import { registerValidation } from "./register.validation";
import { jwtPlugin } from "../../utils/jwt/jwt.plugin";

const ctrl = new RegisterController();

export const registerRoute = new Elysia()
  .use(jwtPlugin)
  .post("/auth/register", (ctx: any) => ctrl.register(ctx), registerValidation);
