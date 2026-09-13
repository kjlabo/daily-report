import bcrypt from "bcryptjs";

/**
 * パスワードハッシュ化のコストパラメータ。
 * prisma/seed.ts の BCRYPT_SALT_ROUNDS と同じ強度(10)を踏襲する。
 */
export const BCRYPT_SALT_ROUNDS = 10;

/**
 * 平文パスワードをハッシュ化する。
 *
 * 呼び出し元・ログ出力で平文パスワードを保持・出力しないこと。
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

/**
 * 平文パスワードとハッシュ済みパスワードを比較する。
 * 一致すれば true、不一致・比較エラー時は false を返す。
 */
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}
