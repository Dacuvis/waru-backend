import type { ObjectId } from "mongodb";

export type PromoType = "percentage" | "fixed" | "buy_x_get_y" | "free_item";
export type PromoStatus = "active" | "inactive" | "expired";

export interface Promo {
  _id?: ObjectId;
  code: string;             // kode unik, e.g. "DISC20"
  name: string;
  description?: string;
  type: PromoType;
  discountValue: number;    // persentase (0-100) atau nominal
  minimumOrder?: number;    // minimum total order untuk bisa pakai promo
  maxDiscount?: number;     // batas maksimal diskon (untuk percentage)
  usageLimit?: number;      // maksimal penggunaan total
  usageCount: number;       // sudah dipakai berapa kali
  startDate: Date;
  endDate: Date;
  status: PromoStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromo {
  code: string;
  name: string;
  description?: string;
  type: PromoType;
  discountValue: number;
  minimumOrder?: number;
  maxDiscount?: number;
  usageLimit?: number;
  startDate: string;  // ISO date string dari client
  endDate: string;
}

export interface UpdatePromo {
  name?: string;
  description?: string;
  type?: PromoType;
  discountValue?: number;
  minimumOrder?: number;
  maxDiscount?: number;
  usageLimit?: number;
  startDate?: string;
  endDate?: string;
  status?: PromoStatus;
}

// Untuk validasi & hitung diskon
export interface ApplyPromo {
  code: string;
  orderTotal: number;
}
