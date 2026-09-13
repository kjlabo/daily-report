import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { EmployeeRole } from "@prisma/client";

/**
 * アクセストークンの有効期限。
 *
 * 設計方針: このプロジェクトのPrismaスキーマにはトークンブラックリストを
 * 保持するテーブルが無く、そのためだけの新規マイグレーションも計画していない。
 * そのため「リフレッシュ不可の短命トークン運用」を採用する
 * （ログアウトはクライアント側でトークンを破棄するだけのステートレスな運用とし、
 * サーバー側のブラックリストは持たない）。有効期限を短く保つことで
 * 漏洩・ログアウト後の悪用リスクを許容範囲に抑える。
 */
export const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN ?? "2h";

const JWT_ALG = "HS256";

export type JwtPayload = {
  employeeId: number;
  role: EmployeeRole;
};

function isEmployeeRole(value: unknown): value is EmployeeRole {
  return typeof value === "string" && (Object.values(EmployeeRole) as string[]).includes(value);
}

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // 実際の値はエラーメッセージに含めない（設定漏れの事実のみを伝える）。
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * JWTアクセストークンを発行する。
 * ペイロードには employee_id, role を含める（API仕様書1.2/1.3節）。
 */
export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({
    employee_id: payload.employeeId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecretKey());
}

export class JwtVerificationError extends Error {
  constructor(message = "invalid or expired token") {
    super(message);
    this.name = "JwtVerificationError";
  }
}

/**
 * JWTアクセストークンを検証し、ペイロードを取り出す。
 * 署名不正・期限切れ・ペイロード不正のいずれの場合も JwtVerificationError を投げる
 * （呼び出し元にトークンの生文字列や詳細な検証エラーを伝播させないため）。
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  let payload;
  try {
    const result = await jwtVerify(token, getSecretKey(), { algorithms: [JWT_ALG] });
    payload = result.payload;
  } catch (error) {
    if (
      error instanceof joseErrors.JWTExpired ||
      error instanceof joseErrors.JWSSignatureVerificationFailed ||
      error instanceof joseErrors.JWTInvalid ||
      error instanceof joseErrors.JWSInvalid
    ) {
      throw new JwtVerificationError();
    }
    throw new JwtVerificationError();
  }

  const employeeId = payload.employee_id;
  const role = payload.role;

  if (typeof employeeId !== "number" || !isEmployeeRole(role)) {
    throw new JwtVerificationError("invalid token payload");
  }

  return { employeeId, role };
}
