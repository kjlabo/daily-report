# 営業日報システム テスト仕様書

## 1. テスト概要

### 1.1 目的
要件定義書・画面定義書・API仕様書に定義した機能が仕様通りに動作すること、および権限制御・入力バリデーションが正しく機能することを検証する。

### 1.2 対象範囲
- 画面：SC-01〜SC-08（[screen-definition.md](screen-definition.md)参照）
- API：認証／日報／コメント／顧客マスタ／営業マスタ（[api-specification.md](api-specification.md)参照）

### 1.3 テストレベル
| レベル | 内容 |
|---|---|
| 単体テスト | API単体のリクエスト/レスポンス、バリデーション、権限制御 |
| 結合テスト | 画面操作を通した一連の業務フロー（日報作成→コメント→再確認 等） |
| 受入テスト | 要件定義書の機能要件を満たしているかのシナリオ確認 |

### 1.4 テストデータ方針
- 既存の顧客マスタ・営業マスタのレコードは書き換えず、テスト専用のレコードを新規作成して使用する。
- テスト専用に作成した営業担当者・顧客・日報・コメント等のDBレコードは、テスト完了後に必ず削除する。
- 既存レコードの値を変更する必要があるテストケース（例：既存営業担当者の`manager_id`変更）は、テスト前に現在値をバックアップし、テスト後に必ず元の値へ復元する。

### 1.5 テスト用アカウント（例）
| アカウント | ロール | 用途 |
|---|---|---|
| test-sales1@example.com | SALES | 日報作成者 |
| test-sales2@example.com | SALES | 他人の日報操作不可確認用 |
| test-manager1@example.com | MANAGER | test-sales1の直属上長 |
| test-manager2@example.com | MANAGER | test-sales1の直属上長ではない上長（権限外確認用） |
| test-admin1@example.com | ADMIN | マスタ管理 |

## 2. 認証・認可

| テストID | 観点 | 前提条件 | 手順 | 期待結果 |
|---|---|---|---|---|
| AUTH-001 | ログイン成功 | 有効な test-sales1 アカウント | 正しいメール・パスワードでログイン | 200 OK、アクセストークンが発行される |
| AUTH-002 | ログイン失敗（パスワード誤り） | 同上 | パスワードを誤って入力 | 401 UNAUTHENTICATED |
| AUTH-003 | 未認証アクセス | ログインしていない状態 | トークンなしで `/reports` を呼び出す | 401 UNAUTHENTICATED |
| AUTH-004 | ログアウト | ログイン済み | `/auth/logout` を呼び出した後、同一トークンでAPIを呼ぶ | ログアウトは204、以降のAPI呼び出しは401 |
| AUTH-005 | ロール外アクセス（SALES→マスタ更新） | test-sales1でログイン | `/customers` にPOST | 403 FORBIDDEN |

## 3. 日報（一覧・作成・編集）

### 3.1 日報一覧

| テストID | 観点 | 前提条件 | 手順 | 期待結果 |
|---|---|---|---|---|
| RPT-LIST-001 | 自分の日報のみ表示（SALES） | test-sales1, test-sales2 それぞれに日報が存在 | test-sales1でログインし `/reports` 取得 | test-sales1が作成した日報のみ返る |
| RPT-LIST-002 | 部下の日報のみ表示（MANAGER） | test-sales1（部下）、test-sales2（部下でない）に日報が存在 | test-manager1でログインし `/reports` 取得 | test-sales1の日報のみ返る（test-sales2の日報は含まれない） |
| RPT-LIST-003 | 期間絞込 | 複数日の日報が存在 | `date_from`/`date_to` を指定して取得 | 範囲内の日報のみ返る |
| RPT-LIST-004 | コメント有無での絞込 | コメントあり/なしの日報が存在 | `has_comment=true` で取得 | コメントが1件以上ある日報のみ返る |
| RPT-LIST-005 | ページング | 一覧件数がper_pageを超える | `page=2` で取得 | 2ページ目のデータと正しい`pagination`情報が返る |

### 3.2 日報作成

| テストID | 観点 | 前提条件 | 手順 | 期待結果 |
|---|---|---|---|---|
| RPT-CRT-001 | 正常作成（訪問記録・Problem・Plan含む） | test-sales1でログイン、当日分の日報が未作成 | 訪問記録2件・Problem1件・Plan1件を含めてPOST | 201 Created、登録内容が正しく返る |
| RPT-CRT-002 | 訪問記録0件での作成 | 同上 | `visits`を空配列でPOST | 400 VALIDATION_ERROR |
| RPT-CRT-003 | 存在しない顧客IDを指定 | 同上 | 未登録の`customer_id`を指定してPOST | 400 VALIDATION_ERROR |
| RPT-CRT-004 | 同一日の日報の重複作成 | test-sales1が当日分の日報を作成済み | 同じ`report_date`で再度POST | 409 CONFLICT |
| RPT-CRT-005 | Problem/Planの複数行登録 | test-sales1でログイン | Problemを3件、Planを2件含めてPOST | 全件が`sort_no`順に登録・取得できる |

### 3.3 日報詳細・更新

| テストID | 観点 | 前提条件 | 手順 | 期待結果 |
|---|---|---|---|---|
| RPT-DTL-001 | 本人による詳細取得 | test-sales1が日報Aを作成済み | test-sales1でログインし日報AをGET | 200 OK、訪問記録・Problem・Plan・コメントを含む詳細が返る |
| RPT-DTL-002 | 直属の上長による詳細取得 | 同上 | test-manager1でログインし日報AをGET | 200 OK |
| RPT-DTL-003 | 直属でない上長によるアクセス | 同上 | test-manager2でログインし日報AをGET | 403 FORBIDDEN |
| RPT-DTL-004 | 他営業によるアクセス | 同上 | test-sales2でログインし日報AをGET | 403 FORBIDDEN |
| RPT-UPD-001 | 本人による更新 | test-sales1が日報Aを作成済み | 訪問記録を1件追加してPUT | 200 OK、更新後の内容に置き換わる |
| RPT-UPD-002 | 他人による更新試行 | 同上 | test-sales2でログインし日報AをPUT | 403 FORBIDDEN |

## 4. コメント

| テストID | 観点 | 前提条件 | 手順 | 期待結果 |
|---|---|---|---|---|
| CMT-001 | 直属上長によるコメント投稿 | test-sales1の日報Aが存在 | test-manager1でログインしコメントをPOST | 201 Created、コメントが登録される |
| CMT-002 | 直属でない上長によるコメント投稿試行 | 同上 | test-manager2でログインしコメントをPOST | 403 FORBIDDEN |
| CMT-003 | 営業本人によるコメント投稿試行 | 同上 | test-sales1でログインしコメントをPOST | 403 FORBIDDEN |
| CMT-004 | 空文字でのコメント投稿 | 同上 | `content`を空文字でPOST | 400 VALIDATION_ERROR |
| CMT-005 | 複数コメントの蓄積 | 同上 | test-manager1が2回コメントを投稿 | 日報詳細取得時、2件のコメントが投稿日時順に返る |

## 5. 顧客マスタ

| テストID | 観点 | 前提条件 | 手順 | 期待結果 |
|---|---|---|---|---|
| CUST-001 | 新規登録 | test-adminでログイン | 必須項目を入力してPOST | 201 Created |
| CUST-002 | 顧客名未入力 | 同上 | `name`を空でPOST | 400 VALIDATION_ERROR |
| CUST-003 | 同名顧客の重複登録 | 同名の顧客が既に存在 | 同じ`name`でPOST | 409 CONFLICT |
| CUST-004 | キーワード検索 | 複数の顧客が存在 | `keyword`を指定してGET一覧 | 部分一致する顧客のみ返る |
| CUST-005 | 論理削除（無効化） | 顧客が存在 | DELETE実行後、GETで確認 | `is_active`が`false`になる（レコードは残存） |
| CUST-006 | ADMIN以外による登録試行 | test-sales1でログイン | `/customers`にPOST | 403 FORBIDDEN |

## 6. 営業マスタ

| テストID | 観点 | 前提条件 | 手順 | 期待結果 |
|---|---|---|---|---|
| EMP-001 | 新規登録（上長設定含む） | test-adminでログイン | `manager_id`を指定してPOST | 201 Created、`manager_name`が正しく返る |
| EMP-002 | メールアドレス重複 | 既存アカウントと同じメール | 同じ`email`でPOST | 409 CONFLICT |
| EMP-003 | 上長の循環参照 | AがBの上長、BがCの上長 | Aの`manager_id`にCを設定してPUT | 400 VALIDATION_ERROR |
| EMP-004 | 自分自身を上長に設定 | 対象社員が存在 | `manager_id`に自分自身のIDを設定してPUT | 400 VALIDATION_ERROR |
| EMP-005 | SALESによる自分自身の情報取得 | test-sales1でログイン | 自分の`employee_id`でGET | 200 OK |
| EMP-006 | SALESによる他人の情報取得試行 | test-sales1でログイン | test-sales2の`employee_id`でGET | 403 FORBIDDEN |
| EMP-007 | 論理削除（無効化） | 対象社員が存在 | DELETE実行後、ログイン試行 | `is_active`が`false`になり、ログインは401 |

## 7. 結合・受入シナリオテスト

| テストID | シナリオ | 手順 | 期待結果 |
|---|---|---|---|
| E2E-001 | 日報作成〜上長コメント〜本人確認の一連の流れ | ①test-sales1がログインし日報を作成（SC-03）→②test-manager1がログインし日報詳細を確認、コメントを投稿（SC-04）→③test-sales1が再ログインし日報詳細でコメントを確認 | 各画面で登録・表示内容が正しく反映され、コメントが本人に見える |
| E2E-002 | 権限外ユーザーの排除 | test-manager2が日報一覧（SC-02）を開く | test-sales1の日報が一覧に表示されない |
| E2E-003 | 顧客マスタ登録後の日報作成での参照 | ①管理者が顧客を新規登録（SC-06）→②営業担当者が日報作成画面（SC-03）で当該顧客を選択し訪問記録を登録 | 新規顧客が選択肢に表示され、訪問記録として正しく登録される |
| E2E-004 | 同一日の日報重複作成の抑止 | 営業担当者が当日分の日報を作成済みの状態で、再度「新規作成」を実行 | エラーメッセージが表示され、登録できない（SC-02の「新規作成」ボタンの非活性、またはAPIエラー表示） |

## 8. 非機能・セキュリティテスト観点

| テストID | 観点 | 手順 | 期待結果 |
|---|---|---|---|
| SEC-001 | SQLインジェクション対策 | 検索キーワードに `' OR '1'='1` 等を入力 | エラーにならず、意図しないデータ漏洩が発生しない |
| SEC-002 | 個人情報の露出 | ネットワークログ・エラーメッセージを確認 | パスワード等の機密情報が平文でログ・レスポンスに出力されない |
| SEC-003 | トークン期限切れ | 期限切れトークンでAPIを呼び出す | 401 UNAUTHENTICATED |
| SEC-004 | 入力文字数上限 | 訪問内容・Problem・Planに上限を超える文字列を入力 | 400 VALIDATION_ERROR |

## 9. 未確定事項（今後の確認ポイント）

- 非機能テストの詳細基準（性能・同時アクセス数などの目標値）
- ブラウザ・デバイスの動作確認対象（PC/スマートフォンの組み合わせ）
- テスト自動化の対象範囲（API単体テストの自動化ツール選定など）
