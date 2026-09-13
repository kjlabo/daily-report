import { describe, expect, it } from "vitest";
import { authorize } from "./authorize";
import { AuthError } from "./errors";
import type { AuthContext } from "./authenticate";

function makeContext(role: AuthContext["role"]): AuthContext {
  return { employeeId: 1, role };
}

describe("authorize", () => {
  it("許可ロールに含まれる場合は何もせず正常終了する", () => {
    expect(() => authorize(makeContext("SALES"), ["SALES", "MANAGER"])).not.toThrow();
  });

  it("許可ロールに含まれない場合は AuthError(403 FORBIDDEN) を投げる", () => {
    expect(() => authorize(makeContext("SALES"), ["ADMIN"])).toThrow(AuthError);

    try {
      authorize(makeContext("SALES"), ["ADMIN"]);
      throw new Error("ここには到達しないはず");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).status).toBe(403);
      expect((error as AuthError).code).toBe("FORBIDDEN");
    }
  });

  it("許可ロールが空配列の場合はどのロールも通過しない", () => {
    expect(() => authorize(makeContext("ADMIN"), [])).toThrow(AuthError);
  });

  it("MANAGERロールがADMIN専用エンドポイントを叩くと403", () => {
    expect(() => authorize(makeContext("MANAGER"), ["ADMIN"])).toThrow(AuthError);
  });
});
