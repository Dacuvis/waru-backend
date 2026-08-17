import pino from "pino";

const isDev = Bun.env.NODE_ENV !== "production";

/**
 * Logger terpusat untuk Waru Backend menggunakan pino.
 *
 * - Development : output berwarna & mudah dibaca via pino-pretty
 * - Production  : output JSON per baris (cocok untuk log aggregator)
 *
 * @example
 * import { logger } from "../utils/logger/logger";
 *
 * logger.info("Server started");
 * logger.warn({ userId }, "User tidak ditemukan");
 * logger.error({ err }, "Terjadi kesalahan");
 */
export const logger = pino(
  {
    level: Bun.env.LOG_LEVEL ?? "info",
    base: { service: "waru-backend" },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname,service",
        },
      })
    : undefined, // production: stdout JSON biasa
);
