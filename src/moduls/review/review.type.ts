import type { ObjectId } from "mongodb";

export type ReviewTarget = "menu" | "service" | "overall";

export interface Review {
  _id?: ObjectId;
  orderId?: string;        // referensi ke orders collection (optional)
  customerName: string;
  target: ReviewTarget;
  targetId?: string;       // id menu jika target = "menu"
  rating: number;          // 1-5
  comment?: string;
  isPublished: boolean;
  userId: string;          // Authorative identity dari JWT
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReview {
  orderId?: string;
  customerName: string;
  target: ReviewTarget;
  targetId?: string;
  rating: number;
  comment?: string;
}

export interface UpdateReview {
  customerName?: string;
  target?: ReviewTarget;
  targetId?: string;
  rating?: number;
  comment?: string;
  isPublished?: boolean;
}