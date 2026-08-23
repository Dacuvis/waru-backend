import type { ObjectId } from "mongodb";

// ─── Orders ─────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export interface OrderItem {
  menuId: string;
  name: string;
  quantity: number;
  price: number;       // harga satuan
  subtotal: number;    // price * quantity
}

export interface Order {
  _id?: ObjectId;
  tableNumber: number;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrder {
  tableNumber: number;
  customerName?: string;
  items: Omit<OrderItem, "subtotal">[];
  notes?: string;
}

export interface UpdateOrder {
  tableNumber?: number;
  customerName?: string;
  items?: Omit<OrderItem, "subtotal">[];
  status?: OrderStatus;
  notes?: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export type PaymentMethod = "cash" | "qris";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Payment {
  _id?: ObjectId;
  orderId: string;       // referensi ke orders collection
  tableNumber: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;  // kembalian
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  midtransOrderId?: string;
  qrString?: string;
  qrUrl?: string;
  expiryTime?: Date | string;
  settlementTime?: Date | string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePayment {
  orderId: string;
  paidAmount?: number;
  method: PaymentMethod;
  notes?: string;
}

export interface UpdatePayment {
  status?: PaymentStatus;
  paidAmount?: number;
  changeAmount?: number;
  transactionId?: string;
  midtransOrderId?: string;
  qrString?: string;
  qrUrl?: string;
  expiryTime?: Date | string;
  settlementTime?: Date | string;
  notes?: string;
}

// ─── Midtrans Notification ──────────────────────────────────────────────────

export interface MidtransNotificationPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
  transaction_time?: string;
  settlement_time?: string;
  status_message?: string;
  merchant_id?: string;
  [key: string]: any;
}
