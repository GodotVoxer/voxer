import { useState } from "react";

/**
 * True from the first time `open` is true onwards. Lets a lazily loaded dialog mount on its first
 * opening and stay mounted, so its closing animation still plays.
 */
export const useOpenedOnce = (open: boolean): boolean => {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened || open;
};
