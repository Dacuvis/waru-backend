import { resolve, sep } from "node:path";
import { buildErrorResponse } from "../src/utils/error/error-global-handler";

/**
 * Melayani static file dengan verifikasi path traversal yang aman.
 * Mencegah pengaksesan file di luar `baseRelPath` (seperti ../, ../../, dsb).
 */
export async function serveSafeStaticFile(
  baseRelPath: string,
  relativePath: string,
  set: { status?: number | string },
) {
  const safeBase = resolve(baseRelPath);
  const targetPath = resolve(safeBase, relativePath || "");

  // Pastikan targetPath berada di dalam safeBase
  if (targetPath !== safeBase && !targetPath.startsWith(`${safeBase}${sep}`)) {
    set.status = 404;
    return buildErrorResponse(404, "File tidak ditemukan.", "E30");
  }

  const file = Bun.file(targetPath);
  if (!(await file.exists())) {
    set.status = 404;
    return buildErrorResponse(404, "File tidak ditemukan.", "E30");
  }

  return file;
}