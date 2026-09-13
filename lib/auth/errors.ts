import { NextResponse } from "next/server";

/**
 * API仕様書1.6節の共通エラーレスポンス形式に沿った最小限の実装。
 * 共通エラーフレームワーク全体（#4）はこのIssueのスコープ外のため、
 * ここでは認証・認可ヘルパーが返すレスポンス整形に閉じる。
 */

export type ApiErrorCode = "UNAUTHENTICATED" | "FORBIDDEN";

export type ApiErrorDetail = {
  field?: string;
  message: string;
};

export class AuthError extends Error {
  readonly status: 401 | 403;
  readonly code: ApiErrorCode;
  readonly details: ApiErrorDetail[];

  constructor(
    status: 401 | 403,
    code: ApiErrorCode,
    message: string,
    details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** API仕様書1.6節の形式でNextResponseを組み立てる。 */
  toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: this.code,
          message: this.message,
          details: this.details,
        },
      },
      { status: this.status },
    );
  }
}

export function unauthenticatedError(message = "認証が必要です。"): AuthError {
  return new AuthError(401, "UNAUTHENTICATED", message);
}

export function forbiddenError(message = "この操作を行う権限がありません。"): AuthError {
  return new AuthError(403, "FORBIDDEN", message);
}
