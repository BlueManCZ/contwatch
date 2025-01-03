import path from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

const config = [
    ...compat.extends("@repo/eslint-config/next.js"),
    {
        languageOptions: {
            globals: {
                ...globals.jest,
            },

            parser: tsParser,
        },
    },
    {
        files: ["**/*.ts?(x)"],
    },
];

export default config;
