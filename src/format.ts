import { format as prettierFormat, Options } from 'prettier';

export const prettierOpts: Options = {
  tabWidth: 2,
  bracketSpacing: true,
  printWidth: 80,
  semi: true,
  singleQuote: true,
  jsxBracketSameLine: false,
  trailingComma: 'all',
  arrowParens: 'avoid',
  useTabs: false,
};

export function format(src: string, filepath: string) {
  return prettierFormat(src, {...prettierOpts, filepath});
}
