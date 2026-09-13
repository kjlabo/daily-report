/**
 * テスト用アカウント・サンプルデータの投入スクリプト。
 *
 * 実行: `npm run db:seed`（内部的に `prisma db seed` → `tsx prisma/seed.ts`）
 *
 * 冪等性の方針:
 * - Employee: email（一意制約あり）で存在確認し `upsert` する。
 *   既に存在する場合は何も更新しない（`update: {}`）ため、
 *   何度実行してもレコードが増えたり値が書き換わったりしない。
 * - Customer: name には一意制約がないため `findFirst` で存在確認した上で
 *   存在しない場合のみ `create` する。
 *
 * セキュリティ上の注意:
 * - パスワードは bcryptjs でハッシュ化してから保存する。
 * - 平文パスワードは console.log 等のログに一切出力しない。
 * - 平文パスワードは `SEED_TEST_PASSWORD` 環境変数があればそれを使用し、
 *   なければテスト専用の固定ダミーパスワードを使う（本番データには使用しないこと）。
 */
import { PrismaClient, type EmployeeRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

// テスト専用ダミーパスワード。環境変数が設定されていればそちらを優先する。
// 平文パスワードはログに出力しないこと。
const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD ?? "Test-Passw0rd!";
const BCRYPT_SALT_ROUNDS = 10;

type SeedEmployee = {
  email: string;
  name: string;
  role: EmployeeRole;
  managerEmail?: string;
};

// 依存関係の順序（上長を先に作成 → 部下を後から紐付け）を守るため、
// 上長を持たないアカウントを先に定義している。
const SEED_EMPLOYEES: SeedEmployee[] = [
  { email: "test-manager1@example.com", name: "テスト上長1", role: "MANAGER" },
  { email: "test-manager2@example.com", name: "テスト上長2", role: "MANAGER" },
  { email: "test-admin1@example.com", name: "テスト管理者1", role: "ADMIN" },
  {
    email: "test-sales1@example.com",
    name: "テスト営業1",
    role: "SALES",
    managerEmail: "test-manager1@example.com",
  },
  {
    email: "test-sales2@example.com",
    name: "テスト営業2",
    role: "SALES",
    managerEmail: "test-manager2@example.com",
  },
];

const SEED_CUSTOMERS = [
  {
    name: "株式会社テスト商事",
    address: "東京都千代田区テスト1-1-1",
    contactPerson: "山田 太郎",
    phone: "03-0000-0001",
  },
  {
    name: "テストフーズ株式会社",
    address: "大阪府大阪市テスト区2-2-2",
    contactPerson: "鈴木 花子",
    phone: "06-0000-0002",
  },
];

async function seedEmployees() {
  const emailToId = new Map<string, number>();

  for (const emp of SEED_EMPLOYEES) {
    const managerId = emp.managerEmail ? emailToId.get(emp.managerEmail) : undefined;

    if (emp.managerEmail && managerId === undefined) {
      throw new Error(
        `上長 ${emp.managerEmail} が先に作成されていません（定義順を確認してください）`,
      );
    }

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_SALT_ROUNDS);

    const employee = await prisma.employee.upsert({
      where: { email: emp.email },
      update: {}, // 既存レコードは書き換えない（冪等・非破壊）
      create: {
        email: emp.email,
        name: emp.name,
        role: emp.role,
        passwordHash,
        managerId: managerId ?? null,
        isActive: true,
      },
    });

    emailToId.set(emp.email, employee.id);
    console.log(`[employee] ok: ${employee.email} (role=${employee.role})`);
  }
}

async function seedCustomers() {
  for (const customer of SEED_CUSTOMERS) {
    const existing = await prisma.customer.findFirst({
      where: { name: customer.name },
    });

    if (existing) {
      console.log(`[customer] skip (already exists): ${customer.name}`);
      continue;
    }

    const created = await prisma.customer.create({
      data: { ...customer, isActive: true },
    });
    console.log(`[customer] created: ${created.name}`);
  }
}

async function main() {
  console.log("シード投入を開始します...");
  await seedEmployees();
  await seedCustomers();
  console.log("シード投入が完了しました。");
}

main()
  .catch((error) => {
    console.error("シード投入中にエラーが発生しました。");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
