export const HIDE_COMMAND = ">hide";

/**
 * `>hide` alone on a line, case-insensitive. A source string because
 * `server/vox/lastActivity.ts` runs the same pattern in Postgres.
 */
export const HIDE_COMMAND_LINE_PATTERN = String.raw`(^|\n)[ \t]*>hide[ \t]*(\n|$)`;

const HIDE_COMMAND_LINE_RE = new RegExp(HIDE_COMMAND_LINE_PATTERN, "i");

/** Such a comment hides its vox for the author and does not bump it. */
export const commentBodyHasHideCommand = (body: string): boolean =>
  HIDE_COMMAND_LINE_RE.test(body.replace(/\r\n?/g, "\n"));

export const appendHideCommandToBody = (body: string): string => {
  if (commentBodyHasHideCommand(body)) return body;
  const text = body.replace(/\s+$/u, "");
  return text === "" ? HIDE_COMMAND : `${text}\n${HIDE_COMMAND}`;
};
