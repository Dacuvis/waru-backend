/**
 * Konfigurasi Midtrans Payment Gateway
 * Diambil dari file environment (.env)
 */

export interface MidtransConfig {
  merchantId: string;
  clientKey: string;
  serverKey: string;
  isProduction: boolean;
  baseUrl: string;
}

export const getMidtransConfig = (): MidtransConfig => {
  const merchantId = Bun.env.MIDTRANS_MERCHANT_ID || "";
  const clientKey = Bun.env.MIDTRANS_CLIENT_KEY || "";
  const serverKey = Bun.env.MIDTRANS_SERVER_KEY || "";

  // Deteksi environment sandbox vs production
  // Jika MIDTRANS_IS_PRODUCTION diset eksplisit, gunakan nilainya.
  // Jika tidak, cek apakah server key diawali dengan SB- (Sandbox) atau Mid-server- (Production)
  let isProduction = false;
  if (Bun.env.MIDTRANS_IS_PRODUCTION !== undefined) {
    isProduction = Bun.env.MIDTRANS_IS_PRODUCTION === "true";
  } else if (serverKey.startsWith("Mid-server-")) {
    isProduction = true;
  } else if (serverKey.startsWith("SB-Mid-server-")) {
    isProduction = false;
  }

  const baseUrl = isProduction
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";

  return {
    merchantId,
    clientKey,
    serverKey,
    isProduction,
    baseUrl,
  };
};
