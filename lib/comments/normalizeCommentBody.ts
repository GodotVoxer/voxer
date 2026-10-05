/**
 * Shapes the line breaks of a comment body to cap vertical spam: unifies newlines, drops
 * trailing spaces per line, collapses any run of blank lines to a single one and trims blank
 * lines at the edges. Length and NUL stripping stay in `sanitizePlainText`; this only touches
 * line breaks, so greentext and `>>TAG` tokens survive untouched.
 */
export const normalizeCommentBody = (input: string): string => {
  const out: string[] = [];
  let sawBlankRun = false;
  for (const raw of input.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/[ \t]+$/u, "");
    if (line === "") {
      if (sawBlankRun) continue;
      sawBlankRun = true;
    } else {
      sawBlankRun = false;
    }
    out.push(line);
  }
  return out.join("\n").replace(/^\n+/u, "").replace(/\n+$/u, "");
};

/** Line count of a comment body once normalized; `0` for an empty body. */
export const commentBodyLineCount = (input: string): number => {
  const normalized = normalizeCommentBody(input);
  return normalized === "" ? 0 : normalized.split("\n").length;
};
