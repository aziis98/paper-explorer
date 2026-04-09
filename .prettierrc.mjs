/** @type {import("prettier").Config} */
export default {
  printWidth: 60,
  singleQuote: true,
  quoteProps: 'consistent',
  tabWidth: 2,
  useTabs: false,
  semi: false,
  arrowParens: 'avoid',

  overrides: [
    {
      files: '*.{yml,yaml,json}',
      options: {
        tabWidth: 2,
      },
    },
  ],
}
