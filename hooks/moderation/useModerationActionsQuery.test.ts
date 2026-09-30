import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MODERATION_SEARCH_DEBOUNCE_MS,
  useModerationActionsQuery,
} from "./useModerationActionsQuery";

const mocks = vi.hoisted(() => ({
  fetchModerationActions: vi.fn(),
  useState: vi.fn(),
  useRef: vi.fn(),
  useCallback: (fn: unknown) => fn,
  useEffect: vi.fn(),
}));

vi.mock("@/features/moderation/api", () => ({
  fetchModerationActions: mocks.fetchModerationActions,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  return {
    ...actual,
    useState: mocks.useState,
    useRef: mocks.useRef,
    useCallback: mocks.useCallback,
    useEffect: mocks.useEffect,
  };
});

type EffectRecord = {
  effect: () => void | (() => void);
  deps: unknown[] | undefined;
  cleanup?: void | (() => void);
  hasChanged: boolean;
};

const createHookRunner = <P, R>(hookFn: (props: P) => R, initialProps: P) => {
  const states: unknown[] = [];
  const refs: { current: unknown }[] = [];
  const effects: EffectRecord[] = [];
  let stateCursor = 0;
  let refCursor = 0;
  let effectCursor = 0;
  let currentProps = initialProps;
  let lastResult: R;

  mocks.useState.mockImplementation(<T>(initial: T | (() => T)) => {
    const idx = stateCursor++;
    if (!(idx in states)) {
      states[idx] = typeof initial === "function" ? (initial as () => T)() : initial;
    }
    const setState = (next: T | ((prev: T) => T)) => {
      states[idx] = typeof next === "function" ? (next as (prev: T) => T)(states[idx] as T) : next;
    };
    return [states[idx] as T, setState] as const;
  });

  mocks.useRef.mockImplementation(<T>(initial: T) => {
    const idx = refCursor++;
    if (!refs[idx]) {
      refs[idx] = { current: initial };
    }
    return refs[idx] as { current: T };
  });

  mocks.useEffect.mockImplementation((effect: () => void | (() => void), deps?: unknown[]) => {
    const idx = effectCursor++;
    const prev = effects[idx];
    const hasChanged = !prev || !deps || deps.some((dep, i) => !Object.is(dep, prev.deps?.[i]));
    if (hasChanged) {
      effects[idx] = { effect, deps, cleanup: prev?.cleanup, hasChanged: true };
    } else {
      effects[idx] = { ...prev, hasChanged: false };
    }
  });

  const flushEffects = () => {
    for (const record of effects) {
      if (record.hasChanged) {
        if (record.cleanup) {
          record.cleanup();
          record.cleanup = undefined;
        }
        record.cleanup = record.effect();
        record.hasChanged = false;
      }
    }
  };

  const render = (nextProps?: P) => {
    if (nextProps !== undefined) {
      currentProps = nextProps;
    }
    stateCursor = 0;
    refCursor = 0;
    effectCursor = 0;
    lastResult = hookFn(currentProps);
    flushEffects();
    return lastResult;
  };

  const unmount = () => {
    for (const record of effects) {
      if (record.cleanup) {
        record.cleanup();
        record.cleanup = undefined;
      }
    }
  };

  render();

  return {
    get result() {
      return lastResult;
    },
    rerender: (props?: P) => render(props),
    unmount,
  };
};

describe("useModerationActionsQuery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.fetchModerationActions.mockReset();
    mocks.fetchModerationActions.mockResolvedValue({
      actions: [{ id: "act1", actorUsername: "cuentaoficialdealissa123" }],
      nextCursor: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports the 300 ms debounce constant", () => {
    expect(MODERATION_SEARCH_DEBOUNCE_MS).toBe(300);
  });

  it("runs a search right away on mount without the debounce", async () => {
    createHookRunner((props) => useModerationActionsQuery(props), {
      moderatorUsername: "alissa",
      banIdFilter: "",
    });

    expect(mocks.fetchModerationActions).toHaveBeenCalledTimes(1);
    expect(mocks.fetchModerationActions).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUsername: "alissa",
        banId: undefined,
      }),
    );
  });

  it("debounces successive keystrokes", async () => {
    const harness = createHookRunner((props) => useModerationActionsQuery(props), {
      moderatorUsername: "",
      banIdFilter: "",
    });

    expect(mocks.fetchModerationActions).toHaveBeenCalledTimes(1);

    harness.rerender({ moderatorUsername: "a", banIdFilter: "" });
    vi.advanceTimersByTime(50);
    harness.rerender({ moderatorUsername: "al", banIdFilter: "" });
    vi.advanceTimersByTime(50);
    harness.rerender({ moderatorUsername: "ali", banIdFilter: "" });

    expect(mocks.fetchModerationActions).toHaveBeenCalledTimes(1);

    // 299 ms: still short of 300 ms since the last change
    vi.advanceTimersByTime(299);
    expect(mocks.fetchModerationActions).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(mocks.fetchModerationActions).toHaveBeenCalledTimes(2);
    expect(mocks.fetchModerationActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        actorUsername: "ali",
        banId: undefined,
      }),
    );
  });

  it("refresh runs immediately and cancels any pending debounce", async () => {
    const harness = createHookRunner((props) => useModerationActionsQuery(props), {
      moderatorUsername: "",
      banIdFilter: "",
    });

    expect(mocks.fetchModerationActions).toHaveBeenCalledTimes(1);

    harness.rerender({ moderatorUsername: "cuentaoficialdealissa12", banIdFilter: "" });
    expect(mocks.fetchModerationActions).toHaveBeenCalledTimes(1);

    // Submitting before 300 ms
    await harness.result.refresh();

    expect(mocks.fetchModerationActions).toHaveBeenCalledTimes(2);
    expect(mocks.fetchModerationActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        actorUsername: "cuentaoficialdealissa12",
        banId: undefined,
      }),
    );

    // Advancing time must not fire a duplicate call
    vi.advanceTimersByTime(500);
    expect(mocks.fetchModerationActions).toHaveBeenCalledTimes(2);
  });

  it("aborts the previous call on unmount", () => {
    const harness = createHookRunner((props) => useModerationActionsQuery(props), {
      moderatorUsername: "test",
      banIdFilter: "",
    });

    const firstSignal = mocks.fetchModerationActions.mock.calls[0][0].signal as AbortSignal;
    expect(firstSignal.aborted).toBe(false);

    harness.unmount();
    expect(firstSignal.aborted).toBe(true);
  });

  it("appendNextPage uses the filters that produced the current results", async () => {
    const harness = createHookRunner((props) => useModerationActionsQuery(props), {
      moderatorUsername: "alissa",
      banIdFilter: "",
    });

    mocks.fetchModerationActions.mockResolvedValueOnce({
      actions: [{ id: "act1", actorUsername: "alissa" }],
      nextCursor: "cur_1",
    });

    await harness.result.refresh();
    harness.rerender();
    expect(harness.result.nextCursor).toBe("cur_1");

    mocks.fetchModerationActions.mockResolvedValueOnce({
      actions: [{ id: "act2", actorUsername: "alissa" }],
      nextCursor: null,
    });

    await harness.result.appendNextPage();

    expect(mocks.fetchModerationActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: "cur_1",
        actorUsername: "alissa",
        banId: undefined,
      }),
    );
  });
});
