import * as React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { createHookState } from "@/tests/utils/dialogStateHarness";
import { useCreateVoxForm } from "./useCreateVoxForm";
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createVox: vi.fn().mockResolvedValue({ id: "nuevo" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/features/auth/store", () => ({
  useAuthStore: (select: (s: unknown) => unknown) =>
    select({ user: { id: "user" }, loading: false }),
}));
vi.mock("@/features/auth/rulesPromptStore", () => ({
  ensureRulesAccepted: vi.fn().mockResolvedValue(true),
  isRulesNotAcceptedError: () => false,
  markRulesNotAccepted: vi.fn(),
}));
vi.mock("@/features/vox/store", () => ({
  useVoxStore: (select: (s: unknown) => unknown) => select({ refreshCurrentView: vi.fn() }),
}));
vi.mock("@/features/vox/api", () => ({ createVox: mocks.createVox, uploadMedia: vi.fn() }));
vi.mock("@/hooks/media/useObjectUrlForFile", () => ({ useObjectUrlForFile: () => null }));
vi.mock("@/hooks/media/useSilentVideoOption", () => ({ useSilentVideoOption: () => ({}) }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof React>()),
  useState: vi.fn(),
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
}));
const state = createHookState();
vi.mocked(React.useState).mockImplementation(state.useState as typeof React.useState);
const FormHarness = () => {
  state.begin();
  return useCreateVoxForm();
};
beforeEach(() => {
  state.clear();
  vi.clearAllMocks();
});

it("disables the empty field when closing and reopening", () => {
  expect(FormHarness().linkFieldOpen).toBe(false);
  FormHarness().setDialogOpen(true);
  FormHarness().setLinkFieldOpen(true);
  FormHarness().setDialogOpen(false);
  FormHarness().setDialogOpen(true);
  expect(FormHarness().linkFieldOpen).toBe(false);
});

it("keeps the link and the draft until publishing, then resets", async () => {
  FormHarness().setTitle("Título");
  FormHarness().setDescription("Descripción");
  FormHarness().onLinkChange(
    { target: { value: "https://example.com/image.jpg" } } as React.ChangeEvent<HTMLInputElement>,
    null,
  );
  FormHarness().setDialogOpen(false);
  FormHarness().setDialogOpen(true);
  expect(FormHarness().linkFieldOpen).toBe(true);
  expect(FormHarness().title).toBe("Título");
  expect(FormHarness().description).toBe("Descripción");
  await FormHarness().submit();
  expect(mocks.createVox).toHaveBeenCalledOnce();
  expect(FormHarness().dialogOpen).toBe(false);
  FormHarness().setDialogOpen(true);
  expect(FormHarness().linkFieldOpen).toBe(false);
  expect(FormHarness().linkUrl).toBe("");
  expect(FormHarness().title).toBe("");
});
