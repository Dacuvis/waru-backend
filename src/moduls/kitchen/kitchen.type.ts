import type { ObjectId } from "mongodb";

export type KitchenStatus = "pending" | "in_progress" | "done" | "cancelled";

export interface KitchenItem {
  _id?: ObjectId;
  orderId: string;       // referensi ke orders collection
  tableNumber: number;
  menuItems: KitchenMenuItem[];
  status: KitchenStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KitchenMenuItem {
  menuId?: string;
  name: string;
  quantity: number;
  notes?: string;
}

export interface CreateKitchenItem {
  orderId: string;
  tableNumber: number;
  menuItems: KitchenMenuItem[];
  notes?: string;
}

export interface UpdateKitchenItem {
  status?: KitchenStatus;
  notes?: string;
  menuItems?: KitchenMenuItem[];
}