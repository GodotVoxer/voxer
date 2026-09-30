const ID_LINE = ">>idunico";
const FLAGS_LINE = ">>banderitas";

const normalizeNewlines = (raw: string) => raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

const normalizeLine = (line: string) => line.trim().toLowerCase();

const hasFeatureMarkerLine = (body: string, markerLower: string): boolean => {
  for (const line of body.split("\n")) {
    if (normalizeLine(line) === markerLower) return true;
  }
  return false;
};

export type VoxDescriptionFeatureMarkersParse = {
  threadUniqueIdsFromDescription: boolean;
  countryFlagsFromDescription: boolean;
};

/** Detects exact `>>idunico` / `>>banderitas` lines (trimmed, any case); combined with the checkboxes. */
export const parseVoxDescriptionFeatureMarkers = (
  raw: string,
): VoxDescriptionFeatureMarkersParse => {
  const normalized = normalizeNewlines(raw);
  let threadUniqueIdsFromDescription = false;
  let countryFlagsFromDescription = false;
  for (const line of normalized.split("\n")) {
    const n = normalizeLine(line);
    if (n === ID_LINE) threadUniqueIdsFromDescription = true;
    if (n === FLAGS_LINE) countryFlagsFromDescription = true;
  }
  return {
    threadUniqueIdsFromDescription,
    countryFlagsFromDescription,
  };
};

/** When the vox enables thread IDs or flags, makes sure the marker lines are visible in the stored text. */
export const appendVoxDescriptionFeatureMarkerLines = (
  raw: string,
  opts: { threadUniqueIds: boolean; countryFlags: boolean },
): string => {
  const normalized = normalizeNewlines(raw);
  const additions: string[] = [];
  if (opts.threadUniqueIds && !hasFeatureMarkerLine(normalized, ID_LINE)) {
    additions.push(ID_LINE);
  }
  if (opts.countryFlags && !hasFeatureMarkerLine(normalized, FLAGS_LINE)) {
    additions.push(FLAGS_LINE);
  }
  if (additions.length === 0) return normalized;
  const trimmedEnd = normalized.trimEnd();
  const sep = trimmedEnd.length > 0 ? "\n" : "";
  return `${trimmedEnd}${sep}${additions.join("\n")}`;
};
