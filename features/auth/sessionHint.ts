const SESSION_HINT_KEY = "voxer.session-hint.v1";

/**
 * Only a hint to decide, before `/auth/me` answers, whether the public first page embedded in the
 * HTML can be shown: with a session the list differs (hidden vox, favorites) and a hidden vox must
 * never flash. It never authorizes anything.
 */
export const readSessionHint = (): boolean => {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
};

export const writeSessionHint = (hasSession: boolean): void => {
  try {
    if (hasSession) localStorage.setItem(SESSION_HINT_KEY, "1");
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    /* no localStorage (strict private mode): the hint stays at "signed out" */
  }
};
