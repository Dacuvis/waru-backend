import { AppError } from "../error/error-global-handler";

const RESEND_API_KEY = Bun.env.RESEND_API_KEY ?? "";
const RESEND_FROM = Bun.env.RESEND_FROM ?? "onboarding@resend.dev";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  if (!RESEND_API_KEY || !RESEND_FROM) {
    throw new AppError(
      "Konfigurasi email belum diatur. Pastikan RESEND_API_KEY dan RESEND_FROM ada di .env",
      500,
    );
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Email] Resend API error:", errorText);
      throw new AppError("Gagal mengirim email. Silakan coba lagi nanti.", 502);
    }
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    console.error("[Email] Gagal mengirim email:", err);
    throw new AppError("Gagal mengirim email. Silakan coba lagi nanti.", 502);
  }
}

// Template email selamat datang setelah register
export function welcomeEmailTemplate(name: string, token: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Selamat datang di Waru, ${name}! 🎉</h2>
      <p>Akun kamu berhasil dibuat. Berikut adalah JWT token kamu:</p>
      <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; word-break: break-all;">
        <code style="font-size: 12px;">${token}</code>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 16px;">
        Token ini berlaku selama ${Bun.env.JWT_EXPIRES_IN ?? "7d"}. 
        Simpan baik-baik dan jangan bagikan ke siapapun.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #aaa; font-size: 11px;">Email ini dikirim otomatis dari sistem Waru.</p>
    </div>
  `;
}

// Template email login berhasil
export function loginEmailTemplate(name: string, token: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Login berhasil, ${name}! 👋</h2>
      <p>Berikut adalah JWT token sesi login kamu:</p>
      <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; word-break: break-all;">
        <code style="font-size: 12px;">${token}</code>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 16px;">
        Token berlaku selama ${Bun.env.JWT_EXPIRES_IN ?? "7d"}.
        Jika kamu tidak melakukan login ini, segera hubungi admin.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #aaa; font-size: 11px;">Email ini dikirim otomatis dari sistem Waru.</p>
    </div>
  `;
}
