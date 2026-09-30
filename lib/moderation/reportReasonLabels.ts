import type { ReportReason } from "@prisma/client";

export const reportReasonLabelEs = (reason: ReportReason): string => {
  const map: Record<ReportReason, string> = {
    WRONG_CATEGORY: "Categoría incorrecta",
    NSFW_OUT_OF_CATEGORY: "Porno fuera de categoría",
    GORE: "Gore",
    SPAM: "Spam",
    ILLEGAL_CONTENT: "Contenido ilegal",
    OTHER: "Otros",
  };
  return map[reason];
};
