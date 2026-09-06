# 営業日報システム - CI/CD用コマンド集
#
# ProjectIDは仮の値です。実際のGCPプロジェクトが決まったら
# `make deploy PROJECT_ID=実際のID` のように上書きするか、
# このファイルのデフォルト値を書き換えてください。

PROJECT_ID ?= xxxxx
REGION ?= asia-northeast1
SERVICE_NAME ?= daily-report
REPOSITORY ?= daily-report
TAG ?= $(shell git rev-parse --short HEAD)
IMAGE := $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(REPOSITORY)/$(SERVICE_NAME)

# 個人情報を扱うシステムのため、既定では未認証アクセスを許可しない。
# 動作確認等で一時的に公開する場合のみ true を指定する。
ALLOW_UNAUTHENTICATED ?= false

# Workload Identity連携の初回セットアップ用（setup-wifターゲットでのみ使用）
GITHUB_REPO ?= kjlabo/daily-report
WIF_POOL ?= github-actions-pool
WIF_PROVIDER ?= github-actions-provider
DEPLOY_SA_NAME ?= cloud-run-deployer
DEPLOY_SA := $(DEPLOY_SA_NAME)@$(PROJECT_ID).iam.gserviceaccount.com

.PHONY: help install lint typecheck test build ci \
	docker-build docker-push deploy \
	setup-artifact-registry setup-wif

help:
	@echo "アプリケーション:"
	@echo "  make install                  依存パッケージのインストール"
	@echo "  make lint                     ESLintの実行"
	@echo "  make typecheck                tscによる型チェック"
	@echo "  make test                     Vitestの実行"
	@echo "  make build                    Next.jsのビルド"
	@echo "  make ci                       CIで実行する一連のチェック"
	@echo ""
	@echo "デプロイ:"
	@echo "  make docker-build             コンテナイメージのビルド"
	@echo "  make docker-push              Artifact Registryへpush"
	@echo "  make deploy                   Cloud Runへデプロイ"
	@echo ""
	@echo "初回セットアップ（一度だけ実行）:"
	@echo "  make setup-artifact-registry  Artifact Registryリポジトリの作成"
	@echo "  make setup-wif                GitHub Actions用Workload Identity連携の作成"
	@echo ""
	@echo "変数: PROJECT_ID=$(PROJECT_ID) REGION=$(REGION) SERVICE_NAME=$(SERVICE_NAME)"

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

## --- デプロイ ---

docker-build:
	docker build -t $(IMAGE):$(TAG) -t $(IMAGE):latest .

docker-push: docker-build
	gcloud auth configure-docker $(REGION)-docker.pkg.dev --quiet --project=$(PROJECT_ID)
	docker push $(IMAGE):$(TAG)
	docker push $(IMAGE):latest

deploy: docker-push
	gcloud run deploy $(SERVICE_NAME) \
		--project=$(PROJECT_ID) \
		--region=$(REGION) \
		--image=$(IMAGE):$(TAG) \
		--platform=managed \
		--allow-unauthenticated=$(ALLOW_UNAUTHENTICATED)

## --- 初回セットアップ ---

setup-artifact-registry:
	gcloud artifacts repositories create $(REPOSITORY) \
		--project=$(PROJECT_ID) \
		--repository-format=docker \
		--location=$(REGION) \
		--description="daily-report container images"

setup-wif:
	gcloud iam workload-identity-pools create $(WIF_POOL) \
		--project=$(PROJECT_ID) \
		--location="global" \
		--display-name="GitHub Actions Pool"
	gcloud iam workload-identity-pools providers create-oidc $(WIF_PROVIDER) \
		--project=$(PROJECT_ID) \
		--location="global" \
		--workload-identity-pool=$(WIF_POOL) \
		--display-name="GitHub Actions Provider" \
		--attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
		--attribute-condition="assertion.repository=='$(GITHUB_REPO)'" \
		--issuer-uri="https://token.actions.githubusercontent.com"
	gcloud iam service-accounts create $(DEPLOY_SA_NAME) \
		--project=$(PROJECT_ID) \
		--display-name="Cloud Run Deployer (GitHub Actions)"
	gcloud projects add-iam-policy-binding $(PROJECT_ID) \
		--member="serviceAccount:$(DEPLOY_SA)" \
		--role="roles/run.admin"
	gcloud projects add-iam-policy-binding $(PROJECT_ID) \
		--member="serviceAccount:$(DEPLOY_SA)" \
		--role="roles/artifactregistry.writer"
	gcloud projects add-iam-policy-binding $(PROJECT_ID) \
		--member="serviceAccount:$(DEPLOY_SA)" \
		--role="roles/iam.serviceAccountUser"
	gcloud iam service-accounts add-iam-policy-binding $(DEPLOY_SA) \
		--project=$(PROJECT_ID) \
		--role="roles/iam.workloadIdentityUser" \
		--member="principalSet://iam.googleapis.com/projects/$(PROJECT_ID)/locations/global/workloadIdentityPools/$(WIF_POOL)/attribute.repository/$(GITHUB_REPO)"
