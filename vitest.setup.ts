// Vitestは（Next.jsと異なり）.envを自動読み込みしないため、
// DBに接続するテスト（lib/prisma.ts経由）のために明示的にロードする。
import "dotenv/config";
import "@testing-library/jest-dom/vitest";
