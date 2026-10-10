import type { CommentPublic } from "@/lib/vox/types";
const sortCommentsDesc = (a: CommentPublic, b: CommentPublic): number => {
  return (
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id.localeCompare(a.id)
  );
};
const sampleComments = (voxId: string): CommentPublic[] => {
  const base = new Date("2024-06-02T10:00:00.000Z").getTime();
  return [
    {
      id: `${voxId}-c1`,
      publicTag: "6DTE2TQY",
      body: ">>TI4YIFAZ >>70TP2NT4\n>>MQ8LIBRC\nno se, era una imagen que tenia y la puse como ejemplo",
      displayName: "Gordo",
      imageUrl: null,
      videoUrl: null,
      videoPosterUrl: null,
      avatarVariant: "BROWN",
      isOp: true,
      threadTag: { text: "A1", badgeHue: 200 },
      countryCode: "AR",
      pollVoteLabel: null,
      pollVoteHue: null,
      isMine: false,
      createdAt: new Date(base).toISOString(),
    },
    {
      id: `${voxId}-c-mc1`,
      publicTag: "TI4YIFAZ",
      body: "Avatar multicolor (gradiente estándar) para probar el tile.",
      displayName: "Anónimo",
      imageUrl: null,
      videoUrl: null,
      videoPosterUrl: null,
      avatarVariant: "MULTICOLOR",
      isOp: false,
      threadTag: { text: "B2", badgeHue: 20 },
      countryCode: "UY",
      pollVoteLabel: null,
      pollVoteHue: null,
      pinnedAt: "2024-06-02T12:00:00.000Z",
      isMine: false,
      createdAt: new Date(base + 15000).toISOString(),
    },
    {
      id: `${voxId}-c-mci1`,
      publicTag: "70TP2NT4",
      body: ">>TI4YIFAZ Multicolor invertido.",
      displayName: "Anónimo",
      imageUrl: null,
      videoUrl: null,
      videoPosterUrl: null,
      avatarVariant: "MULTICOLOR_INVERTED",
      isOp: false,
      threadTag: { text: "C3", badgeHue: 120 },
      countryCode: "CL",
      pollVoteLabel: null,
      pollVoteHue: null,
      isMine: false,
      createdAt: new Date(base + 30000).toISOString(),
    },
    {
      id: `${voxId}-c-mc2`,
      publicTag: "MQ8LIBRC",
      body: "Otro multicolor con >>70TP2NT4 citado.",
      displayName: "Anónimo",
      imageUrl: null,
      videoUrl: null,
      videoPosterUrl: null,
      avatarVariant: "MULTICOLOR",
      isOp: false,
      threadTag: null,
      countryCode: null,
      pollVoteLabel: null,
      pollVoteHue: null,
      isMine: false,
      createdAt: new Date(base + 45000).toISOString(),
    },
    {
      id: `${voxId}-c-mci2`,
      publicTag: "Z9Y8X7W6",
      body: "Segundo multicolor invertido para comparar.",
      displayName: "Anónimo",
      imageUrl: null,
      videoUrl: null,
      videoPosterUrl: null,
      avatarVariant: "MULTICOLOR_INVERTED",
      isOp: false,
      threadTag: null,
      countryCode: null,
      pollVoteLabel: null,
      pollVoteHue: null,
      isMine: false,
      createdAt: new Date(base + 60000).toISOString(),
    },
    {
      id: `${voxId}-c2`,
      publicTag: "5E5TEFH4",
      body: ">viejardo\n>hide\nRespuesta anónima.",
      displayName: "Anónimo",
      imageUrl: null,
      videoUrl: null,
      videoPosterUrl: null,
      avatarVariant: "BLUE",
      isOp: false,
      threadTag: null,
      countryCode: null,
      pollVoteLabel: null,
      pollVoteHue: null,
      isMine: false,
      createdAt: new Date(base + 90000).toISOString(),
    },
    {
      id: `${voxId}-c3`,
      publicTag: "A1B2C3D4",
      body: "Rosa raro de demo.",
      displayName: "Anónimo",
      imageUrl: null,
      videoUrl: null,
      videoPosterUrl: null,
      avatarVariant: "PINK",
      isOp: false,
      threadTag: null,
      countryCode: null,
      pollVoteLabel: null,
      pollVoteHue: null,
      isMine: false,
      createdAt: new Date(base + 120000).toISOString(),
    },
  ];
};
const store = new Map<string, CommentPublic[]>();
/** Stable tag per seed, so the demo and its screenshots do not change between reloads. */
const seededTag = (seed: string): string => {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let h = 2166136261;
  for (const ch of seed) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  }
  let s = "";
  for (let i = 0; i < 8; i++) {
    h = Math.imul(h ^ (h >>> 13), 2654435761);
    s += alphabet[(h >>> 0) % alphabet.length]!;
  }
  return s;
};
export const MSW_DEMO_LONG_THREAD_KEY = "voxer:msw-demo-long-thread";

type LongThread = { size: number; videoUrl?: string };

/** e2e: a JSON `{ size, videoUrl? }` under this key seeds that many comments, one of them with the video. */
const readLongThread = (): LongThread | null => {
  try {
    const raw = window.localStorage.getItem(MSW_DEMO_LONG_THREAD_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<LongThread>) : null;
    return parsed && typeof parsed.size === "number" ? { ...parsed, size: parsed.size } : null;
  } catch {
    return null;
  }
};

const LONG_THREAD_VIDEO_INDEX = 2;

const LONG_THREAD_WRAPPING_LINE =
  "Una línea larga que en pantalla ocupa varias, para que la fila mida distinto de lo estimado y haya algo que corregir al medirla.";

/** Bodies of uneven height; every fourth one wraps, so its row does not match the virtualizer's estimate. */
const longThreadBody = (i: number): string =>
  [
    `Comentario demo #${i + 1}`,
    ...Array.from({ length: i % 6 }, (_, n) => `Línea ${n + 2}`),
    ...(i % 4 === 3 ? [LONG_THREAD_WRAPPING_LINE] : []),
  ].join("\n");

export const seedMockComments = (voxId: string, repliesHint: number) => {
  if (store.has(voxId)) return;
  // A vox listed without replies opens with an empty thread, the only way to demo the first comment.
  if (repliesHint === 0) {
    store.set(voxId, []);
    return;
  }
  const list = sampleComments(voxId);
  const longThread = readLongThread();
  const extra = longThread?.size ?? Math.min(12, Math.max(0, repliesHint - list.length));
  const t0 = Date.now();
  for (let i = 0; i < extra; i++) {
    list.push({
      id: `${voxId}-cx-${i}`,
      publicTag: seededTag(`${voxId}-cx-${i}`),
      body: longThread ? longThreadBody(i) : `Comentario demo #${i + 1}`,
      displayName: "Anónimo",
      imageUrl: null,
      videoUrl: (i === LONG_THREAD_VIDEO_INDEX && longThread?.videoUrl) || null,
      videoPosterUrl: null,
      avatarVariant: "YELLOW",
      isOp: false,
      threadTag: null,
      countryCode: null,
      pollVoteLabel: null,
      pollVoteHue: null,
      isMine: false,
      createdAt: new Date(t0 - i * 30000).toISOString(),
    });
  }
  list.sort(sortCommentsDesc);
  store.set(voxId, list);
};
export const getMockComments = (voxId: string): CommentPublic[] => {
  return store.get(voxId) ?? [];
};
export const appendMockComment = (voxId: string, c: CommentPublic) => {
  const list = [...(store.get(voxId) ?? []), c];
  list.sort(sortCommentsDesc);
  store.set(voxId, list);
};
