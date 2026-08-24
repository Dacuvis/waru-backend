import type { ObjectId } from "mongodb";

export interface RegisterUser {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  role: "customer";
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}