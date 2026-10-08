import { describe, expect, it } from "vitest";
import { ReportReason } from "@prisma/client";
import { REPORT_REASONS, reportReasonLabelEs } from "./reportReasonLabels";

describe("REPORT_REASONS", () => {
  it("lists every Prisma reason exactly once", () => {
    expect([...REPORT_REASONS].sort()).toEqual(Object.values(ReportReason).sort());
  });

  it("keeps the order of the report dialog", () => {
    expect(REPORT_REASONS[0]).toBe("WRONG_CATEGORY");
    expect(REPORT_REASONS.at(-1)).toBe("OTHER");
    expect(reportReasonLabelEs("OTHER")).toBe("Otros");
  });
});
