import { describe, expect, it } from "vitest";
import { parseBearerToken } from "./header";

describe("parseBearerToken", () => {
  it("Bearer プレフィックス付きのヘッダからトークンを取り出す", () => {
    expect(parseBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("トークンの前後の余分な空白は無視する", () => {
    expect(parseBearerToken("Bearer   abc.def.ghi  ")).toBe("abc.def.ghi");
  });

  it("ヘッダが null の場合は null を返す", () => {
    expect(parseBearerToken(null)).toBeNull();
  });

  it("ヘッダが undefined の場合は null を返す", () => {
    expect(parseBearerToken(undefined)).toBeNull();
  });

  it("ヘッダが空文字の場合は null を返す", () => {
    expect(parseBearerToken("")).toBeNull();
  });

  it("Bearer プレフィックスが無い場合は null を返す", () => {
    expect(parseBearerToken("abc.def.ghi")).toBeNull();
  });

  it("Bearer の後にトークンが無い場合は null を返す", () => {
    expect(parseBearerToken("Bearer")).toBeNull();
    expect(parseBearerToken("Bearer ")).toBeNull();
  });

  it("小文字の bearer は許容しない（大文字小文字を区別する）", () => {
    expect(parseBearerToken("bearer abc.def.ghi")).toBeNull();
  });

  it("Basic 認証など別スキームの場合は null を返す", () => {
    expect(parseBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
  });
});
