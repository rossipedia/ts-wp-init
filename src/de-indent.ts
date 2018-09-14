export default function deindent(
  parts: TemplateStringsArray | string,
  ...tokens: any[]
): string {
  function deindent(s: string) {
    const indent = getIndent(s);
    if (indent === undefined) {
      return s;
    }
    return s.replace(new RegExp(`^${indent}`, 'gm'), '');
  }

  if (typeof parts === 'string') {
    return deindent(parts);
  }

  const rep = (o: any) =>
    o && typeof o.toString === 'function' ? o.toString() : String(o);
  return deindent(
    tokens.reduce((s, tok, i) => s + rep(tok) + parts[i + 1], parts[0]),
  );
}

function getIndent(s: string): string | undefined {
  const firstNonWs = s.search(/\S/);
  if (firstNonWs === -1) {
    return undefined; // no non whitespace characters in s
  }
  const lastNlBefore = s.lastIndexOf('\n', firstNonWs);
  if (lastNlBefore === -1) {
    // no newlines before first non-ws char
    return undefined;
  }
  // skip over \r and \n
  for (let i = lastNlBefore; i < s.length; i++) {
    const c = s.charAt(i);

    if (c !== '\r' && c !== '\n') {
      return s.substring(firstNonWs, i);
    }
  }
  return undefined;
}
