// @vitest-environment node
// DBアクセス・bcrypt比較・JWT発行はDOM非依存のためnode環境で実行する
// （lib/auth/authenticate.test.ts と同じ理由）。
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { POST as loginHandler } from "./route";

// このテストファイルはDB(Supabase接続)を使用する結合的な単体テスト。
// 作成したレコードは各テスト後(afterEach)に必ず削除し、既存データには一切触れない。

const TEST_SECRET = "test-jwt-secret-for-login-route-tests";
// テスト実行のたびに重複しないユニークなメールアドレスを使う
const TEST_EMAIL = `test-login-route-${Date.now()}@example.invalid`;
const TEST_PASSWORD = "Test-Passw0rd!-unit-only";

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

async function createTestEmployee(overrides: { isActive?: boolean } = {}) {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const employee = await prisma.employee.create({
    data: {
      email: TEST_EMAIL,
      name: "ログインAPIユニットテスト用ダミー社員",
      role: "SALES",
      passwordHash,
      isActive: overrides.isActive ?? true,
    },
  });
  testEmployeeId = employee.id;
  return employee;
}

function makeRequest(body: unknown): Request {
  return new Request("https://example.invalid/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/auth/login", () => {
  it("正しいメール・パスワードでログインすると200とaccess_token・employeeが返る", async () => {
    const employee = await createTestEmployee();

    const response = await loginHandler(
      makeRequest({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(typeof body.access_token).toBe("string");
    expect(body.access_token.length).toBeGreaterThan(0);
    expect(body.employee).toEqual({
      employee_id: employee.id,
      name: employee.name,
      role: "SALES",
    });
    // passwordHash等の機密情報がレスポンスに含まれないこと
    expect(body).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(body)).not.toContain(TEST_PASSWORD);
  });

  it("パスワードが誤っている場合は401 UNAUTHENTICATEDになる", async () => {
    await createTestEmployee();

    const response = await loginHandler(
      makeRequest({ email: TEST_EMAIL, password: "wrong-password-xxxx" }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("存在しないメールアドレスの場合も401 UNAUTHENTICATEDになる（存在有無を推測させない）", async () => {
    const response = await loginHandler(
      makeRequest({
        email: `test-login-route-not-exist-${Date.now()}@example.invalid`,
        password: "whatever-password",
      }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("is_active=falseのアカウントの場合は401 UNAUTHENTICATEDになる", async () => {
    await createTestEmployee({ isActive: false });

    const response = await loginHandler(
      makeRequest({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("emailが未入力の場合は400 VALIDATION_ERRORになる", async () => {
    const response = await loginHandler(makeRequest({ email: "", password: TEST_PASSWORD }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("passwordが未入力の場合は400 VALIDATION_ERRORになる", async () => {
    const response = await loginHandler(makeRequest({ email: TEST_EMAIL, password: "" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("email/passwordが両方とも未指定の場合は400 VALIDATION_ERRORになる", async () => {
    const response = await loginHandler(makeRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
