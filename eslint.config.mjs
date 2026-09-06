import nextConfig from "eslint-config-next";
import nextTypescriptConfig from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = [
  ...nextConfig,
  ...nextTypescriptConfig,
  prettierConfig,
  {
    ignores: [".next/**", "node_modules/**", "coverage/**"],
  },
];

export default eslintConfig;
