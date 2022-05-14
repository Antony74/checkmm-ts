/*global module*/
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    rules: {
        eqeqeq: 'warn',
        'no-empty': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off'
    },
};
