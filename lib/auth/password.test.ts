import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("正しいパスワードで照合するとtrueを返す", async () => {
    const plain = "Test-Passw0rd!";
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    await expect(verifyPassword(plain, hash)).resolves.toBe(true);
  });

  it("誤ったパスワードで照合するとfalseを返す", async () => {
    const hash = await hashPassword("Test-Passw0rd!");

    await expect(verifyPassword("Wrong-Password!", hash)).resolves.toBe(false);
  });

  it("同じ平文パスワードでもハッシュ値は毎回異なる（ソルトが効いている）", async () => {
    const plain = "Test-Passw0rd!";
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);

    expect(hash1).not.toBe(hash2);
  });
});
