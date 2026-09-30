export type OptimisticToggleArgs = {
  apply: () => void;
  revert: () => void;
  call: () => Promise<unknown>;
};

export const runOptimisticToggle = async ({
  apply,
  revert,
  call,
}: OptimisticToggleArgs): Promise<boolean> => {
  apply();
  try {
    await call();
    return true;
  } catch {
    revert();
    return false;
  }
};
