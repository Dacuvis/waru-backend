import type { ObjectId } from "mongodb";

export type NotificationType =
  | "order_new"
  | "order_ready"
  | "payment_success"
  | "low_stock"
  | "promo_expiring"
  | "system"
  | "custom";

export type NotificationTarget = "kitchen" | "cashier" | "admin" | "all";

export interface Notification {
  _id?: ObjectId;
  type: NotificationType;
  target: NotificationTarget;
  title: string;
  message: string;
  referenceId?: string;    // id order, inventory, dll
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotification {
  type: NotificationType;
  target: NotificationTarget;
  title: string;
  message: string;
  referenceId?: string;
}

export interface UpdateNotification {
  isRead?: boolean;
  title?: string;
  message?: string;
}
