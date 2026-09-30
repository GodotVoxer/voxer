import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHookState, findElement } from "@/tests/utils/dialogStateHarness";

import { ReportDetailInfoPopover } from "./ReportDetailInfoPopover";

const mocks = vi.hoisted(() => ({
  canHover: false,
}));

vi.mock("@/hooks/device/useCanHover", () => ({
  useCanHover: () => mocks.canHover,
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof React>()),
  useState: vi.fn(),
  useEffect: vi.fn(),
  useRef: vi.fn((initial: unknown) => ({ current: initial })),
}));

const state = createHookState();
vi.mocked(React.useState).mockImplementation(state.useState as typeof React.useState);
vi.stubGlobal("React", React);

describe("ReportDetailInfoPopover", () => {
  const windowListeners = new Map<string, { listener: EventListener; options?: unknown }>();
  const documentListeners = new Map<string, { listener: EventListener; options?: unknown }>();

  beforeEach(() => {
    state.clear();
    vi.clearAllMocks();
    mocks.canHover = false;
    windowListeners.clear();
    documentListeners.clear();

    vi.stubGlobal("window", {
      addEventListener: (type: string, listener: EventListener, options?: unknown) => {
        windowListeners.set(type, { listener, options });
      },
      removeEventListener: (type: string) => {
        windowListeners.delete(type);
      },
    });

    vi.stubGlobal("document", {
      addEventListener: (type: string, listener: EventListener, options?: unknown) => {
        documentListeners.set(type, { listener, options });
      },
      removeEventListener: (type: string) => {
        documentListeners.delete(type);
      },
    });

    let activeCleanup: (() => void) | undefined;
    vi.mocked(React.useEffect).mockImplementation((effect) => {
      if (activeCleanup) {
        activeCleanup();
        activeCleanup = undefined;
      }
      const res = effect();
      if (typeof res === "function") {
        activeCleanup = res;
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const render = (details = "Motivo detallado") => {
    state.begin();
    return ReportDetailInfoPopover({ details });
  };

  it("on touch, tapping the button toggles the detail", () => {
    mocks.canHover = false;
    const tree1 = render();
    const button = findElement(tree1, (p) => p["aria-label"] === "Ver aclaración de la denuncia");

    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    (button.onClick as (e: unknown) => void)({ preventDefault, stopPropagation });
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();

    const tree2 = render();
    const hoverCard = findElement(tree2, (p) => "open" in p);
    expect(hoverCard.open).toBe(true);

    (button.onClick as (e: unknown) => void)({ preventDefault, stopPropagation });
    const tree3 = render();
    const hoverCardClosed = findElement(tree3, (p) => "open" in p);
    expect(hoverCardClosed.open).toBe(false);
  });

  it("on desktop (canHover), a click does not toggle (hover only)", () => {
    mocks.canHover = true;
    const tree1 = render();
    const button = findElement(tree1, (p) => p["aria-label"] === "Ver aclaración de la denuncia");

    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    (button.onClick as (e: unknown) => void)({ preventDefault, stopPropagation });
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();

    const tree2 = render();
    const hoverCard = findElement(tree2, (p) => "open" in p);
    expect(hoverCard.open).toBe(false);
  });

  it("while open, any scroll or touch drag closes the detail", () => {
    mocks.canHover = false;
    const tree1 = render();
    const button = findElement(tree1, (p) => p["aria-label"] === "Ver aclaración de la denuncia");
    (button.onClick as (e: unknown) => void)({ preventDefault: vi.fn(), stopPropagation: vi.fn() });

    render();
    expect(windowListeners.has("scroll")).toBe(true);
    expect(windowListeners.has("touchmove")).toBe(true);
    expect(documentListeners.has("pointerdown")).toBe(true);
    expect(documentListeners.has("touchstart")).toBe(true);

    const scrollHandler = windowListeners.get("scroll")?.listener;
    expect(scrollHandler).toBeDefined();
    scrollHandler!(new Event("scroll"));

    const treeAfterScroll = render();
    expect(findElement(treeAfterScroll, (p) => "open" in p).open).toBe(false);

    // Once closed, the listeners are removed
    expect(windowListeners.size).toBe(0);
    expect(documentListeners.size).toBe(0);
  });

  it("while open, a tap outside closes the detail but a tap inside does not", () => {
    mocks.canHover = false;
    const tree1 = render();
    const button = findElement(tree1, (p) => p["aria-label"] === "Ver aclaración de la denuncia");
    (button.onClick as (e: unknown) => void)({ preventDefault: vi.fn(), stopPropagation: vi.fn() });

    render();

    const pointerDownHandler = documentListeners.get("pointerdown")?.listener;
    expect(pointerDownHandler).toBeDefined();

    const outsideTarget = { contains: () => false };
    pointerDownHandler!({ target: outsideTarget } as unknown as Event);

    const treeAfterOutside = render();
    expect(findElement(treeAfterOutside, (p) => "open" in p).open).toBe(false);
  });

  it("prevents default on focus so the HoverCard does not open by itself", () => {
    const tree = render();
    const button = findElement(tree, (p) => p["aria-label"] === "Ver aclaración de la denuncia");

    const preventDefault = vi.fn();
    (button.onFocus as (e: unknown) => void)({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
  });
});
