import { isValidElement, type ReactNode } from "react";

export const createHookState = () => {
  const values: unknown[] = [];
  let cursor = 0;
  return {
    begin: () => {
      cursor = 0;
    },
    clear: () => {
      values.length = 0;
      cursor = 0;
    },
    useState: <T>(initial: T) => {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [
        values[index] as T,
        (next: T | ((previous: T) => T)) => {
          values[index] =
            typeof next === "function" ? (next as (previous: T) => T)(values[index] as T) : next;
        },
      ] as const;
    },
  };
};

export const findElement = (
  node: ReactNode,
  predicate: (props: Record<string, unknown>) => boolean,
): Record<string, unknown> => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (Object.keys(found).length) return found;
    }
  } else if (isValidElement<Record<string, unknown>>(node)) {
    if (predicate(node.props)) return node.props;
    return findElement(node.props.children as ReactNode, predicate);
  }
  return {};
};
