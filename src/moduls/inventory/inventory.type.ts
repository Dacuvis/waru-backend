import type { ObjectId } from "mongodb";

export type InventoryCategory = "food" | "beverage" | "packaging" | "equipment" | "other";
export type InventoryUnit = "pcs" | "kg" | "liter" | "gram" | "ml" | "box" | "pack";

export interface InventoryItem {
  _id?: ObjectId;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  quantity: number;
  minimumStock: number;   // alert ketika stock <= minimumStock
  costPrice: number;      // harga beli per unit
  supplier?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInventoryItem {
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  quantity: number;
  minimumStock: number;
  costPrice: number;
  supplier?: string;
  notes?: string;
}

export interface UpdateInventoryItem {
  name?: string;
  category?: InventoryCategory;
  unit?: InventoryUnit;
  quantity?: number;
  minimumStock?: number;
  costPrice?: number;
  supplier?: string;
  notes?: string;
}

// Untuk restock / pengurangan stok
export interface AdjustStock {
  amount: number;          // positif = tambah, negatif = kurang
  reason?: string;
}
