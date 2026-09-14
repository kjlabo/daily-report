// @vitest-environment node
// DBアクセス・JWT検証はDOM非依存のためnode環境で実行する
// （lib/auth/authenticate.test.ts と同じ理由）。
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword, signAccessToken } from "@/lib/auth";
import { POST as logoutHandler } from "./route";

// このテストファイルはDB(Supabase接続)を使用する結合的な単体テスト。
// 作成したレコードは各テスト後(afterEach)に必ず削除し、既存データには一切触れない。

const TEST_SECRET = "test-jwt-secret-for-logout-route-tests";
const TEST_EMAIL = `test-logout-route-${Date.now()}@example.invalid`;

let testEmployeeId: number | undefined;

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_SECRET;
});

afterEach(async () => {
  if (testEmployeeId !== undefined) {
    await prisma.employee.delete({ where: { id: testEmployeeId } }).catch(() => {
      // 既に削除済みなら何もしない
    });
    testEmployeeId = undefined;
  }
});

async function createTestEmployee() {
  const passwordHash = await hashPassword("Test-Passw0rd!-unit-only");
  const employee = await prisma.employee.create({
    data: {
      email: TEST_EMAIL,
      name: "ログアウトAPIユニットテスト用ダミー社員",
      role: "SALES",
      passwordHash,
      isActive: true,
    },
  });
  testEmployeeId = employee.id;
  return employee;
}

function makeRequest(authorizationHeader: string | null): Request {
  const headers = new Headers();
  if (authorizationHeader !== null) {
    headers.set("authorization", authorizationHeader);
  }
  return new Request("https://example.invalid/api/v1/auth/logout", {
    method: "POST",
    headers,
  });
}

describe("POST /api/v1/auth/logout", () => {
  it("有効なトークンでログアウトすると204 No Contentが返る", async () => {
    const employee = await createTestEmployee();
    const token = await signAccessToken({ employeeId: employee.id, role: "SALES" });

    const response = await logoutHandler(makeRequest(`Bearer ${token}`));

    expect(response.status).toBe(204);
    const text = await response.text();
    expect(text).toBe("");
  });

  it("トークンが無い場合は401 UNAUTHENTICATEDになる", async () => {
    const response = await logoutHandler(makeRequest(null));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("不正なトークンの場合は401 UNAUTHENTICATEDになる", async () => {
    const response = await logoutHandler(makeRequest("Bearer invalid.token.value"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it(
    "【既知の制約：ステートレスJWT設計】ログアウト後も同一トークンでの呼び出しは" +
      "引き続き成功する（サーバー側でトークンを失効させないため）",
    async () => {
      // Issue #3で決定・ユーザー承認済みの設計方針により、logout自体はトークンを
      // 失効させるものではない。そのため、同一トークンで再度logoutを呼び出しても
      // 401にはならず204が返り続けることを確認する
      // （「ログアウト後、同一トークンでの保護APIアクセスが401になる」という
      // Issue #5の受け入れ条件は、この設計では技術的に満たせないことの裏付け）。
      const employee = await createTestEmployee();
      const token = await signAccessToken({ employeeId: employee.id, role: "SALES" });

      const first = await logoutHandler(makeRequest(`Bearer ${token}`));
      const second = await logoutHandler(makeRequest(`Bearer ${token}`));

      expect(first.status).toBe(204);
      expect(second.status).toBe(204);
    },
  );
});
