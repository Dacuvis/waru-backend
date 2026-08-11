import { Elysia } from "elysia"
import { usersController } from "./users.controller"
import {
  createUserValidation,
  updateUserValidation,
  deleteUserValidation,
} from "./users.validation"

const userControl = new usersController

export const usersRoute = new Elysia()

  .post('/users', (ctx: any) => userControl.create(ctx), createUserValidation)
  .get('/users', () => userControl.view())
  .put('/users/:id', (ctx: any) => userControl.update(ctx), updateUserValidation)
  .delete('/users/:id', (ctx: any) => userControl.delete(ctx), deleteUserValidation)
