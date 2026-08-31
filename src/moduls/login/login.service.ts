import { AppError } from "../../utils/error/error-global-handler";
import { verifyPassword } from "../../utils/security/hash";
import { setCookieToken, type ElysiaContext } from "../../utils/cookies/cookies";
import { LoginModel } from "./login.model";
import { NotificationModel } from "../notification/notification.model";
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
      throw new AppError("Email atau password salah", 401, "E20");
    }

    // Verifikasi password
    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      throw new AppError("Email atau password salah", 401, "E20");
    }

    const userId = user._id!.toString();
    const name = user.name as string;
    const role = (user as any).role || "customer";

    // Sign JWT via @elysia/jwt
    const token = await signFn({ id: userId, email, role });

    setCookieToken(ctx, token);

    // Kirim notifikasi login ke database
    try {
      const notificationModel = new NotificationModel();
      const now = new Date();
      await notificationModel.create({
        type: "system",
        target: "all",
        title: "Login Berhasil",
        message: `${name} (${role}) berhasil masuk ke dalam sistem.`,
        isRead: false,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      // Non-blocking log if it fails
    }

    return {
      message: "Login berhasil.",
      token,
      user: { id: userId, name, email },
    };
  }
}