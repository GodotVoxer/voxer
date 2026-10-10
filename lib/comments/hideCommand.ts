export const HIDE_COMMAND = ">hide";

/** A comment hides its vox for the author when one of its lines is exactly `>hide`. */
export const commentBodyHasHideCommand = (body: string): boolean =>
  body.split(/\r\n?|\n/).some((line) => line.trim().toLowerCase() === HIDE_COMMAND);

export const appendHideCommandToBody = (body: string): string => {
  if (commentBodyHasHideCommand(body)) return body;
  const text = body.replace(/\s+$/u, "");
  return text === "" ? HIDE_COMMAND : `${text}\n${HIDE_COMMAND}`;
};
