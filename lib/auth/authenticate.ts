import type { EmployeeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseBearerToken } from "./header";
import { JwtVerificationError, verifyAccessToken } from "./jwt";
import { unauthenticatedError } from "./errors";

export type AuthContext = {
  employeeId: number;
  role: EmployeeRole;
};

/**
 * Route Handler の Request から認証済みコンテキストを取り出す。
 *
 * 以下のいずれかに該当する場合は AuthError（401 UNAUTHENTICATED）を投げる。
 * - Authorization ヘッダが無い、または Bearer トークンが取り出せない
 * - トークンの署名不正・期限切れ・ペイロード不正
 * - トークンのペイロードに対応する employee が存在しない、または is_active=false
 *
 * is_active は JWT発行時点のペイロードではなく、必ずDBの最新値を確認する
 * （アカウント無効化後に古いトークンで access できてしまうのを防ぐため）。
 * role も同様にDBの最新値を採用する（ロール変更が古いトークンに反映されるようにするため）。
 */
export async function authenticate(request: Request): Promise<AuthContext> {
  const authorizationHeader = request.headers.get("authorization");
  const token = parseBearerToken(authorizationHeader);

  if (!token) {
    throw unauthenticatedError();
  }

  let payload;
  try {
    payload = await verifyAccessToken(token);
  } catch (error) {
    if (error instanceof JwtVerificationError) {
      throw unauthenticatedError();
    }
    throw error;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: payload.employeeId },
    select: { id: true, role: true, isActive: true },
  });

  if (!employee || !employee.isActive) {
    throw unauthenticatedError();
  }

  return { employeeId: employee.id, role: employee.role };
}
