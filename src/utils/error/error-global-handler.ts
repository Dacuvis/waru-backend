export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }

  static create(message: string, statusCode: number = 500): AppError {
    return new AppError(message, statusCode);
  }
}

export interface ErrorResponse {
  status: "error";
  statusCode: number;
  message: string;
  details?: unknown;
}

/**
 * Membangun response error yang konsisten.
 */
export function buildErrorResponse(
  statusCode: number,
  message: string,
  details?: unknown,
): ErrorResponse {
  return {
    status: "error",
    statusCode,
    message,
    ...(details !== undefined ? { details } : {}),
  };
}

/**
 * Handler global error untuk Elysia.
 * Pasang di .onError() di index.ts.
 *
 * Menangani:
 * - AppError  → response sesuai statusCode yang di-set
 * - VALIDATION → 422 Unprocessable Entity (body/param/query tidak valid)
 * - NOT_FOUND  → 404
 * - Error biasa → 500 dengan pesan aman ke client
 */
export function globalErrorHandler({
  error,
  set,
  code,
}: {
  error: unknown;
  set: { status?: number | string };
  code?: string | number;
}): ErrorResponse {
  // --- AppError yang kita lempar manual ---
  if (error instanceof AppError) {
    set.status = error.statusCode;
    console.error(`[AppError] ${error.statusCode} - ${error.message}`);
    return buildErrorResponse(error.statusCode, error.message);
  }

  // --- Validation error dari Elysia (body/query/params tidak sesuai skema) ---
  if (code === "VALIDATION") {
    set.status = 422;
    const details =
      error instanceof Error ? tryParseValidationDetails(error.message) : undefined;
    console.error(`[ValidationError] 422 -`, details ?? error);
    return buildErrorResponse(422, "Data yang dikirim tidak valid.", details);
  }

  // --- Route tidak ditemukan ---
  if (code === "NOT_FOUND") {
    set.status = 404;
    return buildErrorResponse(404, "Endpoint tidak ditemukan.");
  }

  // --- Error JS/runtime biasa ---
  if (error instanceof Error) {
    console.error(`[UnhandledError] 500 - ${error.message}\n${error.stack}`);
    set.status = 500;
    return buildErrorResponse(500, "Terjadi kesalahan pada server.");
  }

  // --- Fallback ---
  console.error(`[UnknownError] 500 -`, error);
  set.status = 500;
  return buildErrorResponse(500, "Terjadi kesalahan pada server.");
}

/**
 * Coba parse pesan validasi Elysia jadi object yang lebih readable.
 * Kalau gagal parse, kembalikan string aslinya.
 */
function tryParseValidationDetails(message: string): unknown {
  try {
    return JSON.parse(message);
  } catch {
    return message;
  }
}
