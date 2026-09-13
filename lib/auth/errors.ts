import {
  ApiError,
  type ApiErrorCode as CommonApiErrorCode,
  type ApiErrorDetail as CommonApiErrorDetail,
} from "@/lib/api/errors";

/**
 * authenticate/authorize が投げる認証・認可専用エラー。
 * エラーコード⇔HTTPステータス対応表とレスポンス整形（#4）は lib/api/errors.ts の
 * ApiError に一本化されており、ここではコードを UNAUTHENTICATED/FORBIDDEN の2種類に
 * 限定したサブクラスのみを提供する。
 */

export type ApiErrorCode = Extract<CommonApiErrorCode, "UNAUTHENTICATED" | "FORBIDDEN">;
export type ApiErrorDetail = CommonApiErrorDetail;

export class AuthError extends ApiError<ApiErrorCode> {
  constructor(code: ApiErrorCode, message: string, details: ApiErrorDetail[] = []) {
    super(code, message, details);
    this.name = "AuthError";
  }
}

export function unauthenticatedError(message = "認証が必要です。"): AuthError {
  return new AuthError("UNAUTHENTICATED", message);
}

export function forbiddenError(message = "この操作を行う権限がありません。"): AuthError {
  return new AuthError("FORBIDDEN", message);
}
