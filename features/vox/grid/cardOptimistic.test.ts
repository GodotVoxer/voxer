import { describe, expect, it, vi } from "vitest";
import { runOptimisticToggle } from "@/features/vox/grid/cardOptimistic";

describe("runOptimisticToggle", () => {
  it("applies the change before awaiting the request and keeps it when it resolves", async () => {
    const apply = vi.fn();
    const revert = vi.fn();
    let resolveCall!: () => void;
    const callPromise = new Promise<void>((res) => {
      resolveCall = res;
    });

    const result = runOptimisticToggle({
      apply,
      revert,
      call: () => callPromise,
    });

    expect(apply).toHaveBeenCalledTimes(1);
    expect(revert).not.toHaveBeenCalled();

    resolveCall();
    await expect(result).resolves.toBe(true);
    expect(revert).not.toHaveBeenCalled();
  });

  it("reverts and returns false when the request fails", async () => {
    const apply = vi.fn();
    const revert = vi.fn();
    const call = vi.fn().mockRejectedValue(new Error("boom"));

    const ok = await runOptimisticToggle({ apply, revert, call });

    expect(apply).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledTimes(1);
    expect(revert).toHaveBeenCalledTimes(1);
    expect(ok).toBe(false);
  });

  it("does not swallow errors from apply (calls neither call nor revert)", async () => {
    const revert = vi.fn();
    const call = vi.fn().mockResolvedValue(undefined);
    const apply = () => {
      throw new Error("apply roto");
    };

    await expect(runOptimisticToggle({ apply, revert, call })).rejects.toThrowError("apply roto");
    expect(revert).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });
});
