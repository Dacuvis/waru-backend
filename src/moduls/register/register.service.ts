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
    email = email.trim().toLowerCase();

    // Cek apakah email sudah dipakai
    const existing = await this.model.findByEmail(email);
    if (existing) {
      throw new AppError("Email sudah terdaftar", 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Simpan ke database
    let result;
    try {
      result = await this.model.create({
        name,
        email,
        password: hashedPassword,
        createdAt: new Date(),
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new AppError("Email sudah terdaftar", 409);
      }
      throw error;
    }

    const userId = result.insertedId.toString();

    // Sign JWT via @elysia/jwt
    const token = await signFn({ id: userId, email });

    // Kirim email selamat datang beserta token
    try {
      await sendEmail({
        to: email,
        subject: "Selamat datang di Waru! 🎉",
        html: welcomeEmailTemplate(name, token),
      });
    } catch (error) {
      // Hindari akun setengah jadi yang membuat retry selalu gagal dengan 409.
      await this.model.deleteById(result.insertedId);
      throw error;
    }

    setCookieToken(ctx, token);

    return {
      message: "Registrasi berhasil! Token dikirim ke email kamu.",
      token,
      user: { id: userId, name, email },
    };
  }
}
