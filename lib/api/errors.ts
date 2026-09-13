import { NextResponse } from "next/server";

/** API仕様書1.7節のエラーコード→HTTPステータス対応表（唯一の定義箇所）。 */
export const API_ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_STATUS;

export type ApiErrorDetail = {
  field?: string;
  message: string;
};

/** API仕様書1.6節の共通エラーレスポンス形式を表す例外。Route Handlerからthrowし、共通ハンドラでレスポンス化する。 */
export class ApiError<TCode extends ApiErrorCode = ApiErrorCode> extends Error {
  readonly code: TCode;
  readonly status: (typeof API_ERROR_STATUS)[TCode];
  readonly details: ApiErrorDetail[];

  constructor(code: TCode, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = API_ERROR_STATUS[code];
    this.details = details;
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      { error: { code: this.code, message: this.message, details: this.details } },
      { status: this.status },
    );
  }
}

export function validationError(
  details: ApiErrorDetail[],
  message = "入力内容に誤りがあります。",
): ApiError<"VALIDATION_ERROR"> {
  return new ApiError("VALIDATION_ERROR", message, details);
}

export function unauthenticatedError(message = "認証が必要です。"): ApiError<"UNAUTHENTICATED"> {
  return new ApiError("UNAUTHENTICATED", message);
}

export function forbiddenError(
  message = "この操作を行う権限がありません。",
): ApiError<"FORBIDDEN"> {
  return new ApiError("FORBIDDEN", message);
}

export function notFoundError(message = "対象のリソースが見つかりません。"): ApiError<"NOT_FOUND"> {
  return new ApiError("NOT_FOUND", message);
}

export function conflictError(message = "リソースが競合しています。"): ApiError<"CONFLICT"> {
  return new ApiError("CONFLICT", message);
}

export function internalServerError(
  message = "サーバー内部でエラーが発生しました。",
): ApiError<"INTERNAL_SERVER_ERROR"> {
  return new ApiError("INTERNAL_SERVER_ERROR", message);
}
