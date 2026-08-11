export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }

  static create(
    message: string,
    statusCode: number = 500,
  ): AppError {
    return new AppError(message, statusCode);
  }
}