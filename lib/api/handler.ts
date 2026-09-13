import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, internalServerError, validationError } from "./errors";
import { formatZodError } from "./validation";

/**
 * Route Handler内で発生した例外をAPI仕様書1.6/1.7節の形式に変換する。
 * ApiError/ZodError以外の予期しない例外は、詳細（スタックトレース・メッセージ）を
 * レスポンス・ログに出さず定型の500に丸める（機密情報の漏洩防止のため）。
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return error.toResponse();
  }

  if (error instanceof ZodError) {
    return validationError(formatZodError(error)).toResponse();
  }

  console.error("[api] unhandled error:", error instanceof Error ? error.name : "unknown");
  return internalServerError().toResponse();
}

export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse> | NextResponse,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
