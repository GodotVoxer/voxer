import type { ReportReason } from "@prisma/client";

/** A `Record` over the type keeps it exhaustive; key order is the order the report dialog lists them. */
const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  WRONG_CATEGORY: "Categoría incorrecta",
  NSFW_OUT_OF_CATEGORY: "Porno fuera de categoría",
  GORE: "Gore",
  SPAM: "Spam",
  ILLEGAL_CONTENT: "Contenido ilegal",
  OTHER: "Otros",
};

/** Instead of Prisma's enum object, whose import pulls its runtime into the browser. */
export const REPORT_REASONS = Object.keys(REPORT_REASON_LABELS) as [
  ReportReason,
  ...ReportReason[],
];

export const reportReasonLabelEs = (reason: ReportReason): string => REPORT_REASON_LABELS[reason];
