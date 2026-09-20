import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const __dirname = dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({ baseDirectory: __dirname })

/** Minimal flat ESLint (P7-5) — next/core-web-vitals via FlatCompat. */
export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'coverage/**', 'scripts/**'],
  },
  ...compat.extends('next/core-web-vitals'),
]
