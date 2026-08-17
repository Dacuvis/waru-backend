import { AppError } from "../../utils/error/error-global-handler";
import { hashPassword } from "../../utils/security/hash";
import { sendEmail, welcomeEmailTemplate } from "../../utils/email/email";
import { setCookieToken, type ElysiaContext } from "../../utils/cookies/cookies";
import { RegisterModel } from "./register.model";
import type { RegisterResponse } from "./register.type";

export class RegisterService {
  private model = new RegisterModel();

  /**
   * @param signFn  - fungsi jwt.sign() dari @elysia/jwt plugin di ctx
   * @param ctx     - Elysia context untuk set cookie
   */
  async register(
    name: string,
    email: string,
    password: string,
    signFn: (payload: Record<string, unknown>) => Promise<string>,
    ctx: ElysiaContext,
  ): Promise<RegisterResponse> {
    // Cek apakah email sudah dipakai
    const existing = await this.model.findByEmail(email);
    if (existing) {
      throw new AppError("Email sudah terdaftar", 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Simpan ke database
    const result = await this.model.create({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    const userId = result.insertedId.toString();

    // Sign JWT via @elysia/jwt
    const token = await signFn({ id: userId, email });

    // Simpan token di cookie
    setCookieToken(ctx, token);

    // Kirim email selamat datang beserta token
    await sendEmail({
      to: email,
      subject: "Selamat datang di Waru! 🎉",
      html: welcomeEmailTemplate(name, token),
    });

    return {
      message: "Registrasi berhasil! Token dikirim ke email kamu.",
      token,
      user: { id: userId, name, email },
    };
  }
}
