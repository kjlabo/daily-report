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
- `npm run lint` と `npm run typecheck` でコード品質を確認する
- テストが失敗した場合、実装とテストのどちらが正しいかをユーザーに確認してから修正する

### 5. プルリクエスト作成

- 変更をコミットし、リモートにプッシュする
- `gh pr create` コマンドでプルリクエストを作成する
- PRタイトルは「feat: Issue #<Issue番号> [Issue内容の要約]」形式にする

### 6. 後処理（クリーンアップ）

- プルリクエスト作成後、Worktree作成前にいた元のリポジトリルートディレクトリに戻る
- `git worktree remove issue-<Issue番号>` でWorktreeを削除する
- 作業が完了したことを報告する

## 出力フォーマット

```
## implement-issue 完了

- Issue: #<Issue番号>
- 担当サブエージェント: <選択したサブエージェント名>
- ブランチ: feature/issue-<Issue番号>
- PR: <PRのURL>

### テスト結果
✅ 全テスト通過 / lint・typecheck OK
または
❌ 失敗内容の概要
```
