import wordwrap from 'wordwrap';

const firstColumWidth = 12;
const wrap = wordwrap(12, 80);
import chalk from 'chalk';


// rightPad, because I'm a rebel
function rightPad(s: string, len: number): string {
  if (s.length >= len) return s;
  let pad = len - s.length;
  while (pad-- > 0) s += ' ';
  return s;
}

function log(
  label: string,
  contents: string,
  color = chalk.cyan,
  labelColor = chalk.green,
) {
  process.stdout.write(labelColor(rightPad(label, firstColumWidth)));
  console.log(color(wrap(contents).trim()));
}

export default log;
