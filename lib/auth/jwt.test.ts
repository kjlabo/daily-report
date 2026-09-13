// @vitest-environment node
// JWT署名/検証はDOM非依存のためnode環境で実行する
// （jsdom環境ではTextEncoderが生成するUint8Arrayのrealmがjoseの内部チェックと
//   一致せず "Key for the HS256 algorithm must be..." エラーになるため）。
import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { JwtVerificationError, signAccessToken, verifyAccessToken } from "./jwt";

const TEST_SECRET = "test-jwt-secret-for-unit-tests-only";

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

describe("signAccessToken / verifyAccessToken", () => {
  it("正しいペイロードでトークンを発行・検証できる（正常系）", async () => {
    const token = await signAccessToken({ employeeId: 1, role: "SALES" });
    expect(typeof token).toBe("string");

    const payload = await verifyAccessToken(token);
    expect(payload).toEqual({ employeeId: 1, role: "SALES" });
  });

  it("役割ごとに正しくペイロードを保持する", async () => {
    const token = await signAccessToken({ employeeId: 42, role: "MANAGER" });
    const payload = await verifyAccessToken(token);
    expect(payload).toEqual({ employeeId: 42, role: "MANAGER" });
  });

  it("署名が不正なトークンは検証に失敗する", async () => {
    const token = await signAccessToken({ employeeId: 1, role: "SALES" });
    const tampered = `${token.slice(0, -1)}${token.at(-1) === "a" ? "b" : "a"}`;

    await expect(verifyAccessToken(tampered)).rejects.toThrow(JwtVerificationError);
  });

  it("別の秘密鍵で署名されたトークンは検証に失敗する", async () => {
    const token = await new SignJWT({ employee_id: 1, role: "SALES" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode("different-secret"));

    await expect(verifyAccessToken(token)).rejects.toThrow(JwtVerificationError);
  });

  it("期限切れのトークンは検証に失敗する", async () => {
    const expiredToken = await new SignJWT({ employee_id: 1, role: "SALES" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 60 * 60 * 3)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60 * 60) // 1時間前に失効
      .sign(new TextEncoder().encode(TEST_SECRET));

    await expect(verifyAccessToken(expiredToken)).rejects.toThrow(JwtVerificationError);
  });

  it("employee_id が欠落したペイロードは検証に失敗する", async () => {
    const invalidToken = await new SignJWT({ role: "SALES" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode(TEST_SECRET));

    await expect(verifyAccessToken(invalidToken)).rejects.toThrow(JwtVerificationError);
  });

  it("role が不正な値のペイロードは検証に失敗する", async () => {
    const invalidToken = await new SignJWT({ employee_id: 1, role: "SUPERADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode(TEST_SECRET));

    await expect(verifyAccessToken(invalidToken)).rejects.toThrow(JwtVerificationError);
  });

  it("壊れた文字列（JWT形式でない）は検証に失敗する", async () => {
    await expect(verifyAccessToken("not-a-jwt-token")).rejects.toThrow(JwtVerificationError);
  });
});
