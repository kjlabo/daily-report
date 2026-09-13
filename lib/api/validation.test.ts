import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "./errors";
import { formatZodError, parseWithSchema } from "./validation";

describe("formatZodError", () => {
  it("トップレベルのフィールドエラーをfield/messageに変換する", () => {
    const schema = z.object({ name: z.string().min(1, "顧客名を入力してください。") });
    const result = schema.safeParse({ name: "" });
    if (result.success) throw new Error("unexpected success");

    expect(formatZodError(result.error)).toEqual([
      { field: "name", message: "顧客名を入力してください。" },
    ]);
  });

  it("ネストしたフィールドパスをドット区切りの文字列にする", () => {
    const schema = z.object({
      visits: z.array(z.object({ customer_id: z.number({ error: "顧客を選択してください。" }) })),
    });
    const result = schema.safeParse({ visits: [{ customer_id: "invalid" }] });
    if (result.success) throw new Error("unexpected success");

    const details = formatZodError(result.error);
    expect(details).toContainEqual(expect.objectContaining({ field: "visits.0.customer_id" }));
  });

  it("パスが無いエラー（ルート直下のrefineなど）はfieldをundefinedにする", () => {
    const schema = z.object({}).refine(() => false, { message: "全体として不正です。" });
    const result = schema.safeParse({});
    if (result.success) throw new Error("unexpected success");

    expect(formatZodError(result.error)).toEqual([
      { field: undefined, message: "全体として不正です。" },
    ]);
  });
});

describe("parseWithSchema", () => {
  const schema = z.object({ name: z.string().min(1, "顧客名を入力してください。") });

  it("バリデーション成功時はパース済みの値を返す", () => {
    expect(parseWithSchema(schema, { name: "株式会社A" })).toEqual({ name: "株式会社A" });
  });

  it("バリデーション失敗時はdetailsを含むApiError(VALIDATION_ERROR)をthrowする", () => {
    try {
      parseWithSchema(schema, { name: "" });
      throw new Error("ここには到達しないはず");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(400);
      expect(apiError.code).toBe("VALIDATION_ERROR");
      expect(apiError.details).toEqual([{ field: "name", message: "顧客名を入力してください。" }]);
    }
  });
});
