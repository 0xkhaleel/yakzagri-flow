import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const i18nPlugin = {
  rules: {
    "no-hardcoded-jsx-copy": {
      meta: {
        type: "suggestion",
        docs: { description: "Use the i18n catalog for visible JSX copy" },
        schema: [],
        messages: {
          literal: "Move user-facing JSX copy to the typed i18n catalog.",
        },
      },
      create(context) {
        function reportIfCopy(node, value) {
          const text = value.trim();
          if (
            text &&
            !/^(cNGN|NGN|USDC|XLM|USD|EUR|GBP)$/i.test(text) &&
            /\p{L}/u.test(text)
          ) {
            context.report({ node, messageId: "literal" });
          }
        }

        return {
          JSXText(node) {
            reportIfCopy(node, node.value);
          },
          JSXAttribute(node) {
            if (!["aria-label", "alt", "placeholder", "title"].includes(node.name.name)) {
              return;
            }
            if (node.value?.type === "Literal" && typeof node.value.value === "string") {
              reportIfCopy(node, node.value.value);
            }
          },
        };
      },
    },
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**", "**/dev-test/**"],
    plugins: { i18n: i18nPlugin },
    rules: { "i18n/no-hardcoded-jsx-copy": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
