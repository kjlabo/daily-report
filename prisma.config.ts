import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // prisma migrate / introspect は直接接続（Supabaseのport 5432）を使う。
    // `env()`ヘルパーは未設定時に即エラーになるため、`prisma generate`が
    // .envなしでも動くようplain参照にしている（migrate実行時は実値が必須）。
    url: process.env.DIRECT_URL,
  },
});
