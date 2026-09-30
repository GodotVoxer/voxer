import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHookState, findElement } from "@/tests/utils/dialogStateHarness";
import { AsyncConfirmDialog } from "./AsyncConfirmDialog";

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof React>()),
  useState: vi.fn(),
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
}));
const state = createHookState();
vi.mocked(React.useState).mockImplementation(state.useState as typeof React.useState);
vi.stubGlobal("React", React);
const onConfirm = vi.fn();
const onOpenChange = vi.fn();
const render = () => {
  state.begin();
  return AsyncConfirmDialog({
    open: true,
    onOpenChange,
    title: "Eliminar comentario",
    description: "¿Eliminar?",
    onConfirm,
    showPurgePublicationMedia: true,
  });
};
beforeEach(() => {
  state.clear();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal("window", { setTimeout });
});
afterEach(() => vi.useRealTimers());

type MediaChoice = { purge: boolean; block: boolean };
const mediaOptions = () => findElement(render(), (p) => typeof p.canBlock === "boolean");
const chooseMedia = (next: MediaChoice) =>
  (mediaOptions().onChange as (v: MediaChoice) => void)(next);

it("resets success and purge before deleting the next comment", async () => {
  chooseMedia({ purge: true, block: false });
  (findElement(render(), (p) => p.children === "Confirmar").onClick as () => void)();
  await vi.runAllTimersAsync();
  expect(onConfirm).toHaveBeenLastCalledWith({
    purgePublicationMedia: true,
    blockPublicationMedia: false,
  });
  expect(onOpenChange).toHaveBeenCalledWith(false);
  const confirm = findElement(render(), (p) => p.children === "Confirmar");
  expect(confirm.disabled).toBe(false);
  expect(mediaOptions().value).toEqual({ purge: false, block: false });
  (confirm.onClick as () => void)();
  await vi.runAllTimersAsync();
  expect(onConfirm).toHaveBeenCalledTimes(2);
  expect(onConfirm).toHaveBeenLastCalledWith({
    purgePublicationMedia: false,
    blockPublicationMedia: false,
  });
});

it("without admin permission the block is not sent even if checked", async () => {
  chooseMedia({ purge: true, block: true });
  (findElement(render(), (p) => p.children === "Confirmar").onClick as () => void)();
  await vi.runAllTimersAsync();
  expect(onConfirm).toHaveBeenLastCalledWith({
    purgePublicationMedia: true,
    blockPublicationMedia: false,
  });
});

it("resets an error when closed with the button", async () => {
  onConfirm.mockRejectedValueOnce(new Error("Falló"));
  (findElement(render(), (p) => p.children === "Confirmar").onClick as () => void)();
  await vi.runAllTimersAsync();
  (findElement(render(), (p) => p.children === "Cerrar").onClick as () => void)();
  expect(findElement(render(), (p) => p.children === "Cancelar").disabled).toBe(false);
});
