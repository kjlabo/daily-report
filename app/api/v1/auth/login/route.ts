import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signAccessToken, unauthenticatedError, verifyPassword } from "@/lib/auth";
import { parseWithSchema, withErrorHandling } from "@/lib/api";

/**
 * bcryptによる比較には一定の処理時間がかかる。存在しないemailの場合に
 * この比較処理をスキップすると、応答時間の差からメールアドレスの登録有無を
 * 推測されるおそれがある（タイミング攻撃）。それを防ぐため、該当employeeが
 * 存在しない場合もダミーのハッシュ値と比較を行い、処理時間の差を小さくする。
 *
 * このハッシュ値はどの平文パスワードとも一致しないダミー値であり、
 * 実在のアカウント・パスワードとは無関係。
 */
const DUMMY_PASSWORD_HASH = await hashPassword("dummy-password-for-timing-safety-only");

const loginSchema = z.object({
  email: z
    .string({ error: "メールアドレスを入力してください。" })
    .trim()
    .min(1, "メールアドレスを入力してください。")
    .email("メールアドレスの形式が正しくありません。"),
  password: z
    .string({ error: "パスワードを入力してください。" })
    .min(1, "パスワードを入力してください。"),
});

/**
 * POST /api/v1/auth/login
 *
 * API仕様書3.1節。メール・パスワードで認証し、アクセストークンを発行する。
 * 存在しないメールアドレス／パスワード不一致／is_active=false のいずれも、
 * アカウントの存在有無を推測されないよう同一の401 UNAUTHENTICATEDを返す。
 *
 * 注意: リクエストボディ（パスワードを含む）や発行したトークンをログに出力しないこと。
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();
  const { email, password } = parseWithSchema(loginSchema, body);

  const employee = await prisma.employee.findUnique({ where: { email } });

  const passwordHashToCompare = employee?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await verifyPassword(password, passwordHashToCompare);

  if (!employee || !employee.isActive || !passwordMatches) {
    throw unauthenticatedError("メールアドレスまたはパスワードが誤っています。");
  }

  const accessToken = await signAccessToken({ employeeId: employee.id, role: employee.role });

  return NextResponse.json(
    {
      access_token: accessToken,
      employee: {
        employee_id: employee.id,
        name: employee.name,
        role: employee.role,
      },
    },
    { status: 200 },
  );
});
