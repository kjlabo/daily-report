# 営業日報システム - 開発コマンド集
#
# ホスティング: Vercel（GitHub連携によるGit Push自動デプロイ。本Makefileではデプロイ操作は扱わない）
# データベース: Supabase (PostgreSQL)。マイグレーションはPrisma経由でこのMakefileから実行する。

.PHONY: help install lint typecheck test build ci \
	db-generate db-migrate db-deploy db-studio

help:
	@echo "アプリケーション:"
	@echo "  make install       依存パッケージのインストール"
	@echo "  make lint          ESLintの実行"
	@echo "  make typecheck     tscによる型チェック"
	@echo "  make test          Vitestの実行"
	@echo "  make build         Next.jsのビルド"
	@echo "  make ci            CIで実行する一連のチェック"
	@echo ""
	@echo "データベース（Supabase / PostgreSQL）:"
	@echo "  make db-generate   Prisma Clientの生成"
	@echo "  make db-migrate    開発環境向けマイグレーション作成・適用（prisma migrate dev）"
	@echo "  make db-deploy     本番/Supabase環境へのマイグレーション適用（prisma migrate deploy）"
	@echo "  make db-studio     Prisma Studioの起動"
	@echo ""
	@echo "デプロイはVercelのGit連携により push 時に自動実行されるため、本Makefileには含めない。"

install:
	npm ci

lint:
	npm run lint

typecheck:
	npx tsc --noEmit

test:
	npm test

build:
	npm run build

ci: install lint typecheck test build

## --- データベース ---

db-generate:
	npx prisma generate

db-migrate:
	npx prisma migrate dev

db-deploy:
	npx prisma migrate deploy

db-studio:
	npx prisma studio
