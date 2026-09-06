# 営業日報システム API仕様書

## 1. 共通仕様

### 1.1 ベースURL
```
https://{host}/api/v1
```

### 1.2 認証
- 認証方式：Bearerトークン（ログイン成功時に発行するJWTを想定）
- リクエストヘッダ

```
Authorization: Bearer {access_token}
```

- 未認証・トークン無効時は `401 Unauthorized` を返す。

### 1.3 ロールと認可
| ロール | 説明 |
|---|---|
| SALES | 営業担当者。自分の日報のみ作成・編集・閲覧可能 |
| MANAGER | 上長。自分の部下（`manager_id`が自分）の日報を閲覧・コメント可能 |
| ADMIN | 管理者。顧客マスタ・営業マスタを管理可能 |

各エンドポイントで許可ロールを明記する。許可されないロールがアクセスした場合は `403 Forbidden` を返す。

### 1.4 リクエスト／レスポンス形式
- Content-Type: `application/json`
- 日付：`YYYY-MM-DD`、日時：`YYYY-MM-DDTHH:mm:ssZ`（ISO 8601, UTC）

### 1.5 一覧取得の共通クエリパラメータ
| パラメータ | 型 | 説明 |
|---|---|---|
| page | int | ページ番号（1始まり、デフォルト1） |
| per_page | int | 1ページの件数（デフォルト20、最大100） |

一覧系レスポンスは共通のページング情報を付与する。

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_count": 42
  }
}
```

### 1.6 共通エラーレスポンス形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります。",
    "details": [
      { "field": "customer_id", "message": "顧客を選択してください。" }
    ]
  }
}
```

### 1.7 共通エラーコード

| HTTPステータス | code | 説明 |
|---|---|---|
| 400 | VALIDATION_ERROR | リクエスト内容のバリデーションエラー |
| 401 | UNAUTHENTICATED | 未認証、またはトークン無効・期限切れ |
| 403 | FORBIDDEN | 権限不足 |
| 404 | NOT_FOUND | 対象リソースが存在しない |
| 409 | CONFLICT | 一意制約違反（例：同一日の日報が既に存在する） |
| 500 | INTERNAL_SERVER_ERROR | サーバー内部エラー |

## 2. エンドポイント一覧

| メソッド | パス | 概要 | 許可ロール |
|---|---|---|---|
| POST | /auth/login | ログイン | 全ロール |
| POST | /auth/logout | ログアウト | 全ロール |
| GET | /reports | 日報一覧取得 | SALES, MANAGER |
| POST | /reports | 日報新規作成 | SALES |
| GET | /reports/{report_id} | 日報詳細取得 | SALES, MANAGER |
| PUT | /reports/{report_id} | 日報更新 | SALES |
| GET | /reports/{report_id}/comments | コメント一覧取得 | SALES, MANAGER |
| POST | /reports/{report_id}/comments | コメント投稿 | MANAGER |
| GET | /customers | 顧客マスタ一覧取得 | ADMIN, SALES |
| POST | /customers | 顧客マスタ登録 | ADMIN |
| GET | /customers/{customer_id} | 顧客マスタ詳細取得 | ADMIN, SALES |
| PUT | /customers/{customer_id} | 顧客マスタ更新 | ADMIN |
| DELETE | /customers/{customer_id} | 顧客マスタ無効化 | ADMIN |
| GET | /employees | 営業マスタ一覧取得 | ADMIN, MANAGER |
| POST | /employees | 営業マスタ登録 | ADMIN |
| GET | /employees/{employee_id} | 営業マスタ詳細取得 | ADMIN, MANAGER, SALES(本人) |
| PUT | /employees/{employee_id} | 営業マスタ更新 | ADMIN |
| DELETE | /employees/{employee_id} | 営業マスタ無効化 | ADMIN |

## 3. 認証API

### 3.1 POST /auth/login

ログイン処理を行い、アクセストークンを発行する。

**リクエストボディ**
```json
{
  "email": "sato@example.com",
  "password": "password123"
}
```

**レスポンス（200 OK）**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "employee": {
    "employee_id": 1,
    "name": "佐藤太郎",
    "role": "SALES"
  }
}
```

**エラー**
- `401 UNAUTHENTICATED`：メールアドレスまたはパスワードが誤っている

### 3.2 POST /auth/logout

現在のアクセストークンを無効化する。

**レスポンス（204 No Content）**

## 4. 日報API

### 4.1 GET /reports

日報一覧を取得する。SALESは自分が作成した日報のみ、MANAGERは自分の部下（`manager_id`が自分）の日報のみが対象。

**クエリパラメータ**
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| date_from | date | 任意 | 対象日の範囲（開始） |
| date_to | date | 任意 | 対象日の範囲（終了） |
| employee_id | int | 任意 | 営業担当者で絞込（MANAGERのみ有効） |
| has_comment | bool | 任意 | コメント有無で絞込 |
| page, per_page | int | 任意 | ページング（1.5参照） |

**レスポンス（200 OK）**
```json
{
  "data": [
    {
      "report_id": 101,
      "employee_id": 1,
      "employee_name": "佐藤太郎",
      "report_date": "2026-09-05",
      "visit_count": 3,
      "comment_count": 1,
      "created_at": "2026-09-05T18:30:00Z",
      "updated_at": "2026-09-05T18:30:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_count": 1 }
}
```

### 4.2 POST /reports

日報を新規作成する（訪問記録・Problem・Planを含めて一括登録）。ログインユーザー本人の日報として作成される。同一営業担当者・同一`report_date`が既に存在する場合はエラー。

**リクエストボディ**
```json
{
  "report_date": "2026-09-06",
  "visits": [
    { "customer_id": 10, "content": "新製品の提案を実施", "sort_no": 1 },
    { "customer_id": 12, "content": "定例フォロー訪問", "sort_no": 2 }
  ],
  "problems": [
    { "content": "見積の承認が遅れている", "sort_no": 1 }
  ],
  "plans": [
    { "content": "A社へ再提案資料を送付", "sort_no": 1 }
  ]
}
```

**レスポンス（201 Created）**：4.3のレスポンス形式と同一

**エラー**
- `400 VALIDATION_ERROR`：`visits`が0件、`customer_id`未指定、必須項目未入力など
- `409 CONFLICT`：同一日の日報が既に存在する

### 4.3 GET /reports/{report_id}

日報詳細（訪問記録・Problem・Plan・コメントを含む）を取得する。

**レスポンス（200 OK）**
```json
{
  "report_id": 101,
  "employee_id": 1,
  "employee_name": "佐藤太郎",
  "report_date": "2026-09-05",
  "visits": [
    { "visit_id": 501, "customer_id": 10, "customer_name": "株式会社A", "content": "新製品の提案を実施", "sort_no": 1 }
  ],
  "problems": [
    { "problem_id": 301, "content": "見積の承認が遅れている", "sort_no": 1 }
  ],
  "plans": [
    { "plan_id": 401, "content": "A社へ再提案資料を送付", "sort_no": 1 }
  ],
  "comments": [
    {
      "comment_id": 201,
      "commenter_id": 5,
      "commenter_name": "鈴木上長",
      "content": "早めのフォローをお願いします。",
      "created_at": "2026-09-05T20:00:00Z"
    }
  ],
  "created_at": "2026-09-05T18:30:00Z",
  "updated_at": "2026-09-05T18:30:00Z"
}
```

**エラー**
- `403 FORBIDDEN`：自分の日報でも部下の日報でもない場合
- `404 NOT_FOUND`：存在しない`report_id`

### 4.4 PUT /reports/{report_id}

日報を更新する（訪問記録・Problem・Planは全件置き換え）。作成者本人のみ更新可能。

**リクエストボディ**：4.2と同一形式

**レスポンス（200 OK）**：4.3のレスポンス形式と同一

**エラー**
- `403 FORBIDDEN`：本人以外が更新しようとした場合
- `400 VALIDATION_ERROR`：入力不備

## 5. コメントAPI

### 5.1 GET /reports/{report_id}/comments

指定した日報のコメント一覧を取得する。

**レスポンス（200 OK）**
```json
{
  "data": [
    {
      "comment_id": 201,
      "commenter_id": 5,
      "commenter_name": "鈴木上長",
      "content": "早めのフォローをお願いします。",
      "created_at": "2026-09-05T20:00:00Z"
    }
  ]
}
```

### 5.2 POST /reports/{report_id}/comments

日報にコメントを投稿する。投稿者は当該日報の作成者の直属の上長である必要がある。

**リクエストボディ**
```json
{
  "content": "早めのフォローをお願いします。"
}
```

**レスポンス（201 Created）**
```json
{
  "comment_id": 202,
  "commenter_id": 5,
  "commenter_name": "鈴木上長",
  "content": "早めのフォローをお願いします。",
  "created_at": "2026-09-06T09:00:00Z"
}
```

**エラー**
- `403 FORBIDDEN`：投稿者が当該日報作成者の直属の上長でない場合
- `400 VALIDATION_ERROR`：`content`が空

## 6. 顧客マスタAPI

### 6.1 GET /customers

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|---|---|---|
| keyword | string | 顧客名の部分一致検索 |
| is_active | bool | 有効/無効での絞込 |
| page, per_page | int | ページング |

**レスポンス（200 OK）**
```json
{
  "data": [
    {
      "customer_id": 10,
      "name": "株式会社A",
      "address": "東京都千代田区...",
      "contact_person": "山田様",
      "phone": "03-1234-5678",
      "is_active": true
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_count": 1 }
}
```

### 6.2 POST /customers

**リクエストボディ**
```json
{
  "name": "株式会社A",
  "address": "東京都千代田区...",
  "contact_person": "山田様",
  "phone": "03-1234-5678"
}
```

**レスポンス（201 Created）**：登録された顧客オブジェクト

**エラー**
- `400 VALIDATION_ERROR`：`name`未入力、`phone`形式不正
- `409 CONFLICT`：同名顧客が既に存在する

### 6.3 GET /customers/{customer_id}

**レスポンス（200 OK）**：顧客オブジェクト単体

### 6.4 PUT /customers/{customer_id}

**リクエストボディ**：6.2と同一形式（`is_active`も更新可）

**レスポンス（200 OK）**：更新後の顧客オブジェクト

### 6.5 DELETE /customers/{customer_id}

物理削除は行わず、`is_active`を`false`に更新する論理削除。

**レスポンス（204 No Content）**

## 7. 営業マスタAPI

### 7.1 GET /employees

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|---|---|---|
| keyword | string | 氏名の部分一致検索 |
| manager_id | int | 上長での絞込 |
| is_active | bool | 有効/無効での絞込 |
| page, per_page | int | ページング |

**レスポンス（200 OK）**
```json
{
  "data": [
    {
      "employee_id": 1,
      "name": "佐藤太郎",
      "email": "sato@example.com",
      "role": "SALES",
      "manager_id": 5,
      "manager_name": "鈴木上長",
      "is_active": true
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_count": 1 }
}
```

### 7.2 POST /employees

**リクエストボディ**
```json
{
  "name": "佐藤太郎",
  "email": "sato@example.com",
  "password": "初期パスワード",
  "role": "SALES",
  "manager_id": 5
}
```

**レスポンス（201 Created）**：登録された営業担当者オブジェクト（`password`は含まない）

**エラー**
- `400 VALIDATION_ERROR`：`email`形式不正、`manager_id`が自分自身
- `409 CONFLICT`：`email`重複

### 7.3 GET /employees/{employee_id}

SALESロールは自分自身の情報のみ取得可能。

**レスポンス（200 OK）**：営業担当者オブジェクト単体

### 7.4 PUT /employees/{employee_id}

**リクエストボディ**：7.2と同一形式（`password`は変更時のみ指定、`is_active`も更新可）

**レスポンス（200 OK）**：更新後の営業担当者オブジェクト

**エラー**
- `400 VALIDATION_ERROR`：`manager_id`の循環参照（部下を自分の上長に設定しようとした場合）

### 7.5 DELETE /employees/{employee_id}

物理削除は行わず、`is_active`を`false`に更新する論理削除。

**レスポンス（204 No Content）**

## 8. 未確定事項（今後の確認ポイント）

- アクセストークンの有効期限、リフレッシュトークンの要否
- パスワードの初期発行・再設定方法（招待メールなど）
- 顧客マスタ・営業マスタの一覧取得をSALESロールにどこまで許可するか（訪問記録入力時の顧客検索用途）
- コメント投稿時の通知（メール・プッシュ通知）連携APIの要否
