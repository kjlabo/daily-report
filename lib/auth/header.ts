/**
 * `Authorization: Bearer {access_token}` ヘッダからトークン文字列を取り出す。
 *
 * - ヘッダ自体が無い（null/undefined）、"Bearer " プレフィックスが無い、
 *   トークン部分が空文字の場合はいずれも null を返す。
 */
export function parseBearerToken(headerValue: string | null | undefined): string | null {
  if (!headerValue) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/.exec(headerValue.trim());
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  return token.length > 0 ? token : null;
}
