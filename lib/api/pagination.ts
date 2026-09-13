const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

export type PaginationParams = {
  page: number;
  per_page: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
  };
};

/**
 * page/per_page が未指定・不正値（数値でない、整数でない、1未満）の場合はデフォルト値にフォールバックする。
 * 一覧取得系はcrawlerや外部リンク経由でも呼ばれ得るため、クエリ不備で400にせず常に安全な結果を返す方針とする。
 */
function parsePositiveInt(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return fallback;
  return value;
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
  const perPage = parsePositiveInt(searchParams.get("per_page"), DEFAULT_PER_PAGE);

  // per_page=101以上は400にせず100に丸める。一覧APIでクライアントの過大指定によって
  // エラーにするより、上限に丸めて結果を返す方が利用側の実装ミスに寛容で運用上安全なため。
  const per_page = Math.min(perPage, MAX_PER_PAGE);

  return { page, per_page };
}

export function buildPaginatedResponse<T>(
  data: T[],
  pagination: PaginationParams,
  totalCount: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page: pagination.page,
      per_page: pagination.per_page,
      total_count: totalCount,
    },
  };
}
