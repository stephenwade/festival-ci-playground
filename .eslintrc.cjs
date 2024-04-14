module.exports = {
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: true,
  },

  extends: [
    'eslint:recommended',

    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:playwright/recommended',

    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
  ],

  rules: {
    '@typescript-eslint/no-misused-promises': 'off',
  },

  settings: {
    react: {
      version: 'detect',
    },
  },

  overrides: [
    {
      files: ['.eslintrc.cjs', 'playwright-ct.config.js'],

      env: {
        node: true,
      },
    },
  ],
};
