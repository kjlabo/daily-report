import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

/**
 * POST /api/v1/auth/logout
 *
 * API仕様書3.2節。
 *
 * 設計方針（Issue #3で決定済み・ユーザー承認済み）:
 * このプロジェクトのアクセストークンはステートレスなJWTであり、
 * サーバー側にトークンブラックリスト／セッションテーブルを持たない。
 * そのため、本エンドポイントは「有効なトークンであること」を確認したうえで
 * 204 No Contentを返すのみで、トークン自体を無効化する処理は行わない
 * （クライアント側でトークンを破棄する運用を前提とする）。
 *
 * 既知の制約: この設計により、Issue #5の受け入れ条件「ログアウト後、同一トークンでの
 * 保護APIアクセスが401になる」（テスト仕様書 AUTH-004相当）は技術的に満たせない。
 * トークンの有効期限（既定2時間、JWT_EXPIRES_INで設定）が切れるまでは、
 * ログアウト後も同一トークンで保護APIにアクセス可能なままとなる。
 */
export const POST = withErrorHandling(async (request: Request) => {
  await authenticate(request);
  return new NextResponse(null, { status: 204 });
});
