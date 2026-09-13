// @vitest-environment node
// DBアクセス・JWT検証はDOM非依存のためnode環境で実行する（jwt.test.tsと同じ理由）。
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { authenticate } from "./authenticate";
import { signAccessToken } from "./jwt";
import { AuthError } from "./errors";
import { hashPassword } from "./password";

// このテストファイルはDB(Supabase接続)を使用する結合的な単体テスト。
// 作成したレコードは各テスト後(afterEach)に必ず削除し、既存データには一切触れない。

const TEST_SECRET = "test-jwt-secret-for-authenticate-tests";
// テスト実行のたびに重複しないユニークなメールアドレスを使う
const TEST_EMAIL = `test-auth-unit-${Date.now()}@example.invalid`;

let testEmployeeId: number;

function makeRequest(authorizationHeader: string | null): Request {
  const headers = new Headers();
  if (authorizationHeader !== null) {
    headers.set("authorization", authorizationHeader);
  }
  return new Request("https://example.invalid/api/v1/reports", { headers });
}

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterEach(async () => {
  if (testEmployeeId !== undefined) {
    await prisma.employee.delete({ where: { id: testEmployeeId } }).catch(() => {
      // 既に削除済みなら何もしない
    });
  }
});

async function createTestEmployee(
  overrides: { isActive?: boolean; role?: "SALES" | "MANAGER" | "ADMIN" } = {},
) {
  const passwordHash = await hashPassword("Test-Passw0rd!-unit-only");
  const employee = await prisma.employee.create({
    data: {
      email: TEST_EMAIL,
      name: "認証ユニットテスト用ダミー社員",
      role: overrides.role ?? "SALES",
      passwordHash,
      isActive: overrides.isActive ?? true,
    },
  });
  testEmployeeId = employee.id;
  return employee;
}

describe("authenticate", () => {
  it("Authorizationヘッダが無い場合は401 UNAUTHENTICATEDを投げる", async () => {
    const request = makeRequest(null);

    await expect(authenticate(request)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("Bearerプレフィックスの無いヘッダの場合は401 UNAUTHENTICATEDを投げる", async () => {
    const request = makeRequest("some-raw-token");

    await expect(authenticate(request)).rejects.toBeInstanceOf(AuthError);
  });

  it("署名が不正なトークンの場合は401 UNAUTHENTICATEDを投げる", async () => {
    const request = makeRequest("Bearer invalid.token.value");

    await expect(authenticate(request)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("期限切れトークンの場合は401 UNAUTHENTICATEDを投げる", async () => {
    const employee = await createTestEmployee();
    const { SignJWT } = await import("jose");
    const expiredToken = await new SignJWT({ employee_id: employee.id, role: employee.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 60 * 60 * 3)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60 * 60)
      .sign(new TextEncoder().encode(TEST_SECRET));

    const request = makeRequest(`Bearer ${expiredToken}`);

    await expect(authenticate(request)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("存在しないemployee_idのトークンの場合は401 UNAUTHENTICATEDを投げる", async () => {
    const token = await signAccessToken({ employeeId: -1, role: "SALES" });
    const request = makeRequest(`Bearer ${token}`);

    await expect(authenticate(request)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("is_active=falseのアカウントの場合は401 UNAUTHENTICATEDを投げる（DBの最新値で判定）", async () => {
    const employee = await createTestEmployee({ isActive: false });
    const token = await signAccessToken({ employeeId: employee.id, role: employee.role });
    const request = makeRequest(`Bearer ${token}`);

    await expect(authenticate(request)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("有効なトークン・有効なアカウントの場合は認証済みコンテキストを返す", async () => {
    const employee = await createTestEmployee({ role: "MANAGER" });
    const token = await signAccessToken({ employeeId: employee.id, role: "MANAGER" });
    const request = makeRequest(`Bearer ${token}`);

    const context = await authenticate(request);

    expect(context).toEqual({ employeeId: employee.id, role: "MANAGER" });
  });

  it("ログイン後にis_activeがfalseへ更新された場合、古いトークンでも401になる", async () => {
    const employee = await createTestEmployee({ isActive: true });
    const token = await signAccessToken({ employeeId: employee.id, role: employee.role });

    // ログアウトの代わりにアカウント無効化をシミュレート
    await prisma.employee.update({ where: { id: employee.id }, data: { isActive: false } });

    const request = makeRequest(`Bearer ${token}`);

    await expect(authenticate(request)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });
});
