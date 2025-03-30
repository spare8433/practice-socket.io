import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      pluginPrettierRecommended,
      pluginReact.configs.flat.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.recommended,
    ],
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    settings: { react: { version: "19" } },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-first-prop-new-line": "error",
      "react/self-closing-comp": ["error", { component: true, html: true }],
      "react/no-unknown-property": "error",
      "react-refresh/only-export-components": ["off", { allowConstantExport: true }],
      "unused-imports/no-unused-imports": "error",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "prettier/prettier": [
        "error",
        {
          useTabs: false,
          printWidth: 120,
          tabWidth: 2,
          singleQuote: false,
          jsxSingleQuote: false,
          semi: true,
          bracketSpacing: true,
          jsxBracketSameLine: false,
          quoteProps: "as-needed",
          trailingComma: "all",
          arrowParens: "always",
          proseWrap: "never",
          endOfLine: "auto",
        },
      ],
    },
  },
);
