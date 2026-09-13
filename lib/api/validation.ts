import type { ZodError, ZodType } from "zod";
import { type ApiErrorDetail, validationError } from "./errors";

/** ZodErrorをAPI仕様書1.6節のdetails配列形式に変換する。ネストしたフィールドはドット区切りのパスにする。 */
export function formatZodError(error: ZodError): ApiErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : undefined,
    message: issue.message,
  }));
}

/** Zodスキーマでパースし、失敗時はVALIDATION_ERRORのApiErrorをthrowする。 */
export function parseWithSchema<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw validationError(formatZodError(result.error));
  }
  return result.data;
}
