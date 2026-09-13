import { describe, expect, it } from "vitest";
import { buildPaginatedResponse, parsePagination } from "./pagination";

function paramsOf(query: Record<string, string>): URLSearchParams {
  return new URLSearchParams(query);
}

describe("parsePagination", () => {
  it("未指定の場合はデフォルト値(page=1, per_page=20)を返す", () => {
    expect(parsePagination(paramsOf({}))).toEqual({ page: 1, per_page: 20 });
  });

  it("有効なpage/per_pageをそのまま数値として返す", () => {
    expect(parsePagination(paramsOf({ page: "3", per_page: "50" }))).toEqual({
      page: 3,
      per_page: 50,
    });
  });

  it("per_pageが101以上の場合は100に丸める", () => {
    expect(parsePagination(paramsOf({ per_page: "101" }))).toEqual({ page: 1, per_page: 100 });
    expect(parsePagination(paramsOf({ per_page: "9999" }))).toEqual({ page: 1, per_page: 100 });
  });

  it("per_pageがちょうど100の場合はそのまま100になる", () => {
    expect(parsePagination(paramsOf({ per_page: "100" }))).toEqual({ page: 1, per_page: 100 });
  });

  it.each([["0"], ["-1"], ["abc"], ["1.5"]])(
    "pageが不正値(%s)の場合はデフォルト値(1)にフォールバックする",
    (value) => {
      expect(parsePagination(paramsOf({ page: value })).page).toBe(1);
    },
  );

  it.each([["0"], ["-1"], ["abc"], ["1.5"]])(
    "per_pageが不正値(%s)の場合はデフォルト値(20)にフォールバックする",
    (value) => {
      expect(parsePagination(paramsOf({ per_page: value })).per_page).toBe(20);
    },
  );
});

describe("buildPaginatedResponse", () => {
  it("{ data, pagination: { page, per_page, total_count } } 形式を返す", () => {
    const result = buildPaginatedResponse([{ id: 1 }, { id: 2 }], { page: 2, per_page: 20 }, 42);

    expect(result).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      pagination: { page: 2, per_page: 20, total_count: 42 },
    });
  });
});
