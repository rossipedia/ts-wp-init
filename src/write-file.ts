import { writeFile as fsWriteFile } from 'fs';
import { promisify } from 'util';
import { format as formatCode, prettierOpts } from './format';
import deindentCode from './de-indent';

import log from './log';

const writeFileAsync = promisify(fsWriteFile);

export type WriteFileOpts = {
  contents: string | Buffer;
  filename: string;
  encoding?: string;
  format?: boolean;
  deindent?: boolean;
};

export function writeFile({
  filename,
  contents,
  encoding = 'utf-8',
  format = false,
  deindent = true,
}: WriteFileOpts): Promise<void> {
  log('Writing', filename);
  if (contents instanceof Buffer) {
    return writeFileAsync(filename, contents);
  }

  if (format) {
    contents = formatCode(contents, filename);
  } else if (deindent) {
    contents = deindentCode(contents);
  }

  return writeFileAsync(filename, contents.trim() + '\n', encoding);
}

export function writeJson(filename: string, object: any) {
  return writeFile({
    filename,
    contents: JSON.stringify(object, void 0, prettierOpts.tabWidth),
  });
}
