import type { ObjectId } from "mongodb";

export type typefood = "Heavy Food" | "Light Food";

export interface Menu {
  _id?: ObjectId;
  name: string;
  description: string;
  price: number;
  category: typefood;
  isAvailable: boolean;
  isRecommended: boolean;
  imageUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: ObjectId;
}

export type CreateMenu = Omit<Menu, "_id" | "createdAt" | "updatedAt" | "createdBy">;

export type UpdateMenu = Partial<CreateMenu>;