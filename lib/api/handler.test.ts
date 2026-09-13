import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { conflictError, notFoundError } from "./errors";
import { toErrorResponse, withErrorHandling } from "./handler";

describe("toErrorResponse", () => {
  it("ApiErrorはそのままtoResponse()相当のレスポンスに変換される", async () => {
    const response = toErrorResponse(notFoundError("見つかりません。"));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "NOT_FOUND", message: "見つかりません。", details: [] },
    });
  });

  it("ZodErrorはVALIDATION_ERROR(400)のdetails付きレスポンスに変換される", async () => {
    const schema = z.object({ content: z.string().min(1, "内容を入力してください。") });
    const result = schema.safeParse({ content: "" });
    if (result.success) throw new Error("unexpected success");

    const response = toErrorResponse(result.error);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual([{ field: "content", message: "内容を入力してください。" }]);
  });

  it("予期しない例外は500 INTERNAL_SERVER_ERRORの定型メッセージに変換される", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = toErrorResponse(new Error("DBのパスワードは xxxx です"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
    // スタックトレースや元の例外メッセージ（機密情報を含み得る）がレスポンスに出ないこと
    expect(JSON.stringify(body)).not.toContain("xxxx");
    expect(JSON.stringify(body)).not.toContain("DBのパスワード");

    // ログにも元の例外メッセージ・スタックトレースを出力しないこと
    for (const call of consoleSpy.mock.calls) {
      const serialized = JSON.stringify(call);
      expect(serialized).not.toContain("xxxx");
      expect(serialized).not.toContain("DBのパスワード");
    }

    consoleSpy.mockRestore();
  });

  it("文字列や非Errorオブジェクトがthrowされても500に変換される", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = toErrorResponse("some raw string error");

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");

    consoleSpy.mockRestore();
  });
});

describe("withErrorHandling", () => {
  it("正常終了時はハンドラの戻り値をそのまま返す", async () => {
    const handler = withErrorHandling(async () => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ ok: true }, { status: 200 });
    });

    const response = await handler();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("ApiErrorがthrowされた場合は対応するエラーレスポンスを返す", async () => {
    const handler = withErrorHandling(async () => {
      throw conflictError("既に存在します。");
    });

    const response = await handler();
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("予期しない例外がthrowされた場合は500に変換される", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const handler = withErrorHandling(async () => {
      throw new Error("unexpected");
    });

    const response = await handler();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");

    consoleSpy.mockRestore();
  });
});
