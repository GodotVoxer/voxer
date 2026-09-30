/**
 * Smoke test of the realtime Worker against a local instance.
 *
 *   npx wrangler dev --port 8799 --local     # in another terminal
 *   node scripts/smoke.mjs
 *
 * Uses the secrets of `.dev.vars.example` unless SOCKET_BROADCAST_SECRET / AUTH_SECRET are set.
 */
import { SignJWT } from "jose";

const PORT = process.env.PORT ?? "8799";
const BASE = `http://127.0.0.1:${PORT}`;
const WS = `ws://127.0.0.1:${PORT}`;
const SECRET =
  process.env.SOCKET_BROADCAST_SECRET ?? "local-test-broadcast-secret-at-least-32-chars";
const AUTH = process.env.AUTH_SECRET ?? "local-test-auth-secret-at-least-32-characters";

const emit = (room, event, data, secret = SECRET) =>
  fetch(`${BASE}/internal/emit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ room, event, data }),
  });

const openWs = (url) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const frames = [];
    ws.addEventListener("message", (e) => frames.push(JSON.parse(e.data)));
    ws.addEventListener("open", () => resolve({ ws, frames }));
    ws.addEventListener("error", () => reject(new Error(`did not open: ${url}`)));
    setTimeout(() => reject(new Error(`timeout: ${url}`)), 5000);
  });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? " -> " + extra : ""}`);
  if (!ok) failures += 1;
};

// 1. Fan-out to two clients in the same room
const a = await openWs(`${WS}/ws?room=feed:home`);
const b = await openWs(`${WS}/ws?room=feed:home`);
await wait(200);
const r1 = await emit("feed:home", "vox:created", { id: "abc", title: "hello" });
await wait(400);
check("emit answers 200", r1.status === 200, `status=${r1.status} body=${await r1.clone().text()}`);
check("client A received", a.frames.length === 1 && a.frames[0].event === "vox:created");
check("client B received (fan-out)", b.frames.length === 1 && b.frames[0].data.title === "hello");

// 2. Isolation between rooms
const c = await openWs(`${WS}/ws?room=vox:abcdefgh12345678`);
await wait(200);
await emit("vox:abcdefgh12345678", "comment:created", { id: "c1" });
await wait(400);
check("the other room received its event", c.frames.length === 1);
check("feed:home did NOT receive the vox room event", a.frames.length === 1);

// 3. Invalid secret
const bad = await emit("feed:home", "vox:created", {}, "wrong-secret");
check("invalid secret -> 401", bad.status === 401, `status=${bad.status}`);

// 4. Event outside the allow-list
const badEvent = await emit("feed:home", "made:up", {});
check("event not allowed -> 400", badEvent.status === 400, `status=${badEvent.status}`);

// 5. Invalid room
const badRoom = await emit("other:thing", "vox:created", {});
check("invalid room -> 400", badRoom.status === 400, `status=${badRoom.status}`);

// 6. User room without a token
// No Upgrade header on purpose: Node's fetch() forbids it, and the Worker checks the token before
// upgrading, so the 403 is observable anyway.
const res403 = await fetch(`${BASE}/ws?room=user:abcdefgh12345678`);
check("user room without a token -> 403", res403.status === 403, `status=${res403.status}`);

// 7. User room with another user's token
const key = new TextEncoder().encode(AUTH);
const otherUserToken = await new SignJWT({ typ: "socket" })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("zzzzzzzz99999999")
  .setIssuedAt()
  .setExpirationTime("120s")
  .sign(key);
const otherUserRes = await fetch(`${BASE}/ws?room=user:abcdefgh12345678&token=${otherUserToken}`);
check("another user's token -> 403", otherUserRes.status === 403, `status=${otherUserRes.status}`);

// 8. User room with the user's own token
const tokenOk = await new SignJWT({ typ: "socket" })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("abcdefgh12345678")
  .setIssuedAt()
  .setExpirationTime("120s")
  .sign(key);
const u = await openWs(`${WS}/ws?room=user:abcdefgh12345678&token=${tokenOk}`);
await wait(200);
await emit("user:abcdefgh12345678", "notification:new", { voxId: "v1", type: "REPLY_TO_COMMENT" });
await wait(400);
check(
  "user room with the user's own token receives",
  u.frames.length === 1 && u.frames[0].event === "notification:new",
);

for (const s of [a, b, c, u]) s.ws.close();
console.log(failures === 0 ? "\nALL OK" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
