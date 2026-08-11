import type { ObjectId } from "mongodb"

export interface CreateUser {
  _id?: ObjectId
  name: string
  email: string
  password: string
  IsActive: boolean
}

export interface UpdateUser {
  name?: string
  email?: string
  password?: string
  IsActive?: boolean
}