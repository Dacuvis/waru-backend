import { AppError } from "../error/error-global-handler";

const JWT_EXPIRES_IN = Bun.env.JWT_EXPIRES_IN ?? "7d";

if (!Bun.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}

const JWT_SECRET = Bun.env.JWT_SECRET as string;

export interface JwtPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Encode base64url
function base64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Parse expired time string seperti "7d", "1h", "60m"
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new AppError("Format JWT_EXPIRES_IN tidak valid", 500);

  const value = parseInt(match[1]!);
  const unit = match[2]!;

  const multiplier: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * (multiplier[unit] ?? 86400);
}

// Sign JWT menggunakan HMAC SHA-256 via SubtleCrypto (built-in Bun)
export async function signJwt(payload: Omit<JwtPayload, "iat" | "exp">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiry(JWT_EXPIRES_IN);

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp }));

  const signingInput = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));

  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${signingInput}.${signature}`;
}

// Verify JWT
export async function verifyJwt(token: string): Promise<JwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new AppError("Token tidak valid", 401);

  const [header, body, signature] = parts as [string, string, string];
  const signingInput = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  // Kembalikan base64url ke base64 biasa
  const base64Sig = signature.replace(/-/g, "+").replace(/_/g, "/");
  const rawSig = Uint8Array.from(atob(base64Sig), (c) => c.charCodeAt(0));

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    rawSig,
    new TextEncoder().encode(signingInput)
  );

  if (!valid) throw new AppError("Token tidak valid atau telah dimanipulasi", 401);

  const payload: JwtPayload = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));

  if (!payload.exp || Math.floor(Date.now() / 1000) > payload.exp) {
    throw new AppError("Token sudah kadaluarsa", 401);
  }

  return payload;
}
