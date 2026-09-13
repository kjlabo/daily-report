---
name: implement-issue-worktree-subagent
description: Git Worktreeで作業用ブランチを分離し、内容に応じたプロジェクト専用サブエージェントにIssueの実装を任せてPRを作成する。
---

# Skill: implement-issue

## Purpose

指定されたIssue番号をもとに、mainブランチから独立したGit Worktreeを作成し、
その中でIssue内容に最適なサブエージェントに実装を任せ、テスト・Lint確認後にプルリクエストを作成する。
実装が完了したらWorktreeを片付け、作業ディレクトリを汚さない。

## When to use

- `/implement-issue <Issue番号>` のようにIssue番号を指定して呼ばれたとき

---

## Instructions

### 1. 前処理（Worktree作成前）

- 現在のブランチがmain以外の場合は、mainブランチにチェックアウトする
- `git checkout main && git pull origin main` で最新のmainブランチを取得する
- 既存のブランチ `feature/issue-<Issue番号>` があれば削除する（削除前に必ず内容を確認し、未マージの変更がある場合はユーザーに確認する）

### 2. Worktree作成

- `git worktree add issue-<Issue番号> -b feature/issue-<Issue番号>` コマンドでWorktreeを作成する
- Worktreeは `issue-<Issue番号>` という命名規則のサブフォルダに作成される

### 3. Worktree環境の設定

- 作成したサブディレクトリ `issue-<Issue番号>` に移動する
- `npx husky install` を実行してHuskyのパスを設定する
- 必要に応じて `npm install` で依存関係をインストールする
- DB/Supabase接続を伴うIssue（マイグレーション実行など）の場合、Worktree内に `.env` が存在するか確認する
  - 存在しない場合は `.env.example` を提示し、`DATABASE_URL`（Transaction pooler, port 6543）・`DIRECT_URL`（Session pooler, port 5432）の値をユーザーに確認してから設定してもらう
  - **注意**: Supabaseの「Direct connection」ホスト（`db.<ref>.supabase.co:5432`）はIPv4アドオン未購入プロジェクトではIPv6専用であり、サンドボックス環境やIPv6非対応のローカル・CI環境からは到達できない（`P1001`エラーになる）。`DIRECT_URL`には代わりに「Session pooler」（`aws-0-<region>.pooler.supabase.com:5432`、IPv4対応）の接続文字列を使うこと

### 4. 実装

- Issue内容を確認し、以下のプロジェクト専用サブエージェントから最適なものを選んでAgentツールで実装を任せる

| サブエージェント       | 担当領域                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| backend-api-engineer   | Next.js API Routes（認証基盤・日報API・コメントAPI・顧客マスタAPI・営業マスタAPI）                    |
| db-engineer            | Prismaスキーマ・マイグレーション・Supabase(PostgreSQL)接続・シードスクリプト                          |
| frontend-engineer      | Next.js(App Router) + shadcn/ui + Tailwind CSSによる画面実装                                          |
| e2e-test-engineer      | Playwrightによる結合・受け入れシナリオE2Eテスト                                                       |
| security-test-engineer | 非機能・セキュリティテスト（SQLインジェクション対策、個人情報露出、トークン期限切れ、入力文字数上限） |
| unit-test-engineer     | Vitestによる単体テスト（認証・認可、日報、コメント、顧客マスタ、営業マスタ）                          |

- 実装完了後、必ずテストを実行し、全テストがグリーンであることを確認する
- `npm run lint` でコード品質を確認する
- 型チェックは `npm run typecheck` があればそれを使う。存在しない場合（package.jsonにscriptがない）は `npx tsc --noEmit` で代用する
- テストが失敗した場合、実装とテストのどちらが正しいかをユーザーに確認してから修正する

### 5. package-lock.jsonのCI互換性確認

- `package.json` / `package-lock.json` に変更がある場合（`npm install`で依存追加した場合など）、ローカルのnpmバージョンとCI（`.github/workflows/*.yml`の`node-version`、現在はNode 22）で使われるnpmバージョンが異なると、`npm ci`がpeer依存関係の解決差異で失敗することがある（例: Issue #1でNode 22/npm 10 vs ローカルnpm 11の差異により`Missing: typescript@5.9.3 from lock file`エラーが発生）
- そのため、pushする前に必ずCIと同じNode版のDockerコンテナで`npm ci`が通ることを検証する
  ```
  docker run --rm -v <worktreeパス>:/app -w /app node:22 sh -c "npm ci && npm run lint && npm run test"
  ```
- 失敗する場合は、同じコンテナ内で `npm install` を実行してlockfileをCI互換の内容に再生成し、コミットに含める
- コンテナ内でインストールした`node_modules`はLinux用ネイティブバイナリになりホスト（macOS等）では動かないため、検証後は必ずホスト上で `npm ci` を再実行してから通常通りcommit/pushする（pre-push hookのテストがホストのnode_modulesを使うため）

### 6. プルリクエスト作成

- 変更をコミットし、リモートにプッシュする（`.env` 等の秘密情報を含むファイルがステージされていないことを `git status` で確認する）
- `gh pr create` コマンドでプルリクエストを作成する
- PRタイトルは「feat: Issue #<Issue番号> [Issue内容の要約]」形式にする
- PR本文に受け入れ条件のチェックリストと実施したテスト内容を記載し、末尾に `Closes #<Issue番号>` を入れる
- プッシュ後、`gh pr checks <PR番号>` でCIがpassすることを確認する。failした場合は原因を調査して修正する

### 7. Issueへの完了報告・ステータス更新

- `gh issue comment <Issue番号>` で対応内容・PRリンク・受け入れ条件チェック結果・テスト結果を記載したコメントを追記する
- 作業中に判明した注意点（環境依存の問題や回避策など）があれば、今後のためにコメントに残す
- Issueはこの時点ではクローズせず、「レビュー待ち」であることが分かるようラベル `status: in review` を付与する（存在しなければ `gh label create "status: in review" --description "PRレビュー待ち" --color "fbca04"` で作成してから付与）
  - PR本文に `Closes #<Issue番号>` を入れてあるため、PRがマージされれば自動でIssueがクローズされる。エージェントが自らIssueをクローズしない

### 8. 後処理（クリーンアップ）

- Worktree作成前にいた元のリポジトリルートディレクトリに戻る
- `git worktree remove issue-<Issue番号>` でWorktreeを削除する
- 作業が完了したことを報告する

## 出力フォーマット

```
## implement-issue 完了

- Issue: #<Issue番号>
- 担当サブエージェント: <選択したサブエージェント名>
- ブランチ: feature/issue-<Issue番号>
- PR: <PRのURL>
- Issueステータス: Open（`status: in review`ラベル付与・コメント追記済み。PRマージで自動クローズ）

### テスト結果
✅ 全テスト通過 / lint・typecheck OK
または
❌ 失敗内容の概要

### 補足（あれば）
作業中に判明した注意点・回避策など
```
