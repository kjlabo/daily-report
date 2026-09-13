import type { EmployeeRole } from "@prisma/client";
import type { AuthContext } from "./authenticate";
import { forbiddenError } from "./errors";

/**
 * 認証済みコンテキストのロールが許可ロール一覧に含まれるか検証する。
 * 含まれない場合は AuthError（403 FORBIDDEN）を投げる。
 */
export function authorize(context: AuthContext, allowedRoles: EmployeeRole[]): void {
  if (!allowedRoles.includes(context.role)) {
    throw forbiddenError();
  }
}
