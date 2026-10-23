import { defineConfig } from 'oxfmt'

export default defineConfig({
  semi: false,
  ignorePatterns: ['dist/**', '*.min.js'],
  sortImports: true,
  sortTailwindcss: true,
  singleQuote: true,
  overrides: [],
})
