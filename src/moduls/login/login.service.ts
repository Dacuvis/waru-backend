import { AppError } from "../../utils/error/error-global-handler";
import { verifyPassword } from "../../utils/security/hash";
import { sendEmail, loginEmailTemplate } from "../../utils/email/email";
import { setCookieToken, type ElysiaContext } from "../../utils/cookies/cookies";
import { LoginModel } from "./login.model";
import type { LoginResponse } from "./login.type";

export class LoginService {
  private model = new LoginModel();

  /**
   * @param signFn  - fungsi jwt.sign() dari @elysia/jwt plugin di ctx
   * @param ctx     - Elysia context untuk set cookie
   */
  async login(
    email: string,
    password: string,
    signFn: (payload: Record<string, unknown>) => Promise<string>,
    ctx: ElysiaContext,
  ): Promise<LoginResponse> {
    email = email.trim().toLowerCase();

    // Cari user berdasarkan email
    const user = await this.model.findByEmail(email);
    if (!user) {
      throw new AppError("Email atau password salah", 401);
    }

    // Verifikasi password
    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      throw new AppError("Email atau password salah", 401);
    }

    const userId = user._id!.toString();
    const name = user.name as string;

    // Sign JWT via @elysia/jwt
    const token = await signFn({ id: userId, email });

    // Kirim email notifikasi login beserta token
    await sendEmail({
      to: email,
      subject: "Login berhasil ke Waru 👋",
      html: loginEmailTemplate(name, token),
    });

    setCookieToken(ctx, token);

    return {
      message: "Login berhasil! Token dikirim ke email kamu.",
      token,
      user: { id: userId, name, email },
    };
  }
}
