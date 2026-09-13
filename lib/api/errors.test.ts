import { describe, expect, it } from "vitest";
import {
  API_ERROR_STATUS,
  ApiError,
  conflictError,
  forbiddenError,
  internalServerError,
  notFoundError,
  unauthenticatedError,
  validationError,
} from "./errors";

describe("API_ERROR_STATUS", () => {
  it("API仕様書1.7節のコード⇔ステータス対応表と一致する", () => {
    expect(API_ERROR_STATUS).toEqual({
      VALIDATION_ERROR: 400,
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      INTERNAL_SERVER_ERROR: 500,
    });
  });
});

describe("ApiError.toResponse", () => {
  it("1.6節の形式（error.code/message/details）でJSONレスポンスを返す", async () => {
    const error = new ApiError("VALIDATION_ERROR", "入力内容に誤りがあります。", [
      { field: "customer_id", message: "顧客を選択してください。" },
    ]);

    const response = error.toResponse();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "入力内容に誤りがあります。",
        details: [{ field: "customer_id", message: "顧客を選択してください。" }],
      },
    });
  });

  it("detailsを省略した場合は空配列になる", async () => {
    const response = notFoundError("見つかりません。").toResponse();
    await expect(response.json()).resolves.toEqual({
      error: { code: "NOT_FOUND", message: "見つかりません。", details: [] },
    });
  });
});

describe("エラーファクトリ関数", () => {
  it.each([
    [validationError([]), 400, "VALIDATION_ERROR"],
    [unauthenticatedError(), 401, "UNAUTHENTICATED"],
    [forbiddenError(), 403, "FORBIDDEN"],
    [notFoundError(), 404, "NOT_FOUND"],
    [conflictError(), 409, "CONFLICT"],
    [internalServerError(), 500, "INTERNAL_SERVER_ERROR"],
  ] as const)("%o は status=%i code=%s を持つApiErrorを返す", (error, status, code) => {
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
  });
});
