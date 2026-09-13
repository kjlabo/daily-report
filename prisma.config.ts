// Prisma 7ではCLIが.envを自動読み込みしないため、明示的にロードする。
// https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference#using-environment-variables
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // prisma migrate / introspect はDIRECT_URLを使う（port 5432）。
    // Supabaseの「Direct connection」（db.<ref>.supabase.co）はIPv6専用ホストのため、
    // IPv4非対応環境からはSession pooler（aws-0-<region>.pooler.supabase.com:5432）を
    // DIRECT_URLとして使うこと（詳細は.env.example参照）。
    // `env()`ヘルパーは未設定時に即エラーになるため、`prisma generate`が
    // .envなしでも動くようplain参照にしている（migrate実行時は実値が必須）。
    url: process.env.DIRECT_URL,
  },
  migrations: {
    // Prisma 7ではシードは`prisma db seed`経由でのみ実行される
    // （`migrate dev`/`migrate reset`による自動実行は廃止された）。
    seed: "npx tsx prisma/seed.ts",
  },
});
