type Target = { kind: "vox" | "comment"; id: string };
export const moderationActionTargets = (payload: unknown): Target[] => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const data = payload as Record<string, unknown>;
  if (typeof data.commentId === "string") return [{ kind: "comment", id: data.commentId }];
  if (typeof data.voxId === "string") return [{ kind: "vox", id: data.voxId }];
  const ids = (value: unknown) =>
    Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))]
      : [];
  return [
    ...ids(data.voxIds).map((id) => ({ kind: "vox" as const, id })),
    ...ids(data.commentIds).map((id) => ({ kind: "comment" as const, id })),
  ];
};
