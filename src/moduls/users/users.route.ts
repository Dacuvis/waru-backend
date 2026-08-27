import { Elysia } from "elysia";
import { usersController } from "./users.controller";
import { authMiddleware } from "../../utils/auth/auth.middleware";
import { requireRole } from "../../utils/auth/role.middleware";
import {
  createUserValidation,
  updateUserValidation,
  deleteUserValidation,
} from "./users.validation";
import type { CreateUser, UpdateUser } from "./users.type";

const userControl = new usersController();

export const usersRoute = new Elysia()
  .use(authMiddleware)
  .use(requireRole(["boss"]))
  .post(
    "/users",
    ({ body }: { body: CreateUser }) => userControl.create({ body }),
    createUserValidation,
  )
  .get(
    "/users",
    ({ query }: { query: { page?: string; limit?: string } }) => userControl.view({ query }),
  )
  .put(
    "/users/:id",
    ({ params, body }: { params: { id: string }; body: UpdateUser }) =>
      userControl.update({ params, body }),
    updateUserValidation,
  )
  .delete(
    "/users/:id",
    ({ params }: { params: { id: string } }) => userControl.delete({ params }),
    deleteUserValidation,
  );