import nodemailer from "nodemailer";
import { AppError } from "../error/error-global-handler";

const EMAIL_HOST = Bun.env.EMAIL_HOST ?? "smtp.gmail.com";
const EMAIL_PORT = parseInt(Bun.env.EMAIL_PORT ?? "587");
const EMAIL_USER = Bun.env.EMAIL_USER ?? "";
const EMAIL_PASS = Bun.env.EMAIL_PASS ?? "";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new AppError(
      "Konfigurasi email belum diatur. Pastikan EMAIL_USER dan EMAIL_PASS ada di .env",
      500,
    );
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: false,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Waru App" <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
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
