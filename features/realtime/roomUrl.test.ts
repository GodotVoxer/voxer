import { describe, expect, it } from "vitest";
import { roomWebSocketUrl } from "@/features/realtime/roomUrl";

describe("roomWebSocketUrl", () => {
  it("turns https into wss", () => {
    expect(roomWebSocketUrl("https://realtime.example.com", "feed:home")).toBe(
      "wss://realtime.example.com/ws?room=feed%3Ahome",
    );
  });

  it("turns http into ws for development", () => {
    expect(roomWebSocketUrl("http://127.0.0.1:8799", "feed:home")).toBe(
      "ws://127.0.0.1:8799/ws?room=feed%3Ahome",
    );
  });

  it("tolerates a trailing slash", () => {
    expect(roomWebSocketUrl("https://realtime.example.com/", "feed:home")).toBe(
      "wss://realtime.example.com/ws?room=feed%3Ahome",
    );
  });

  it("adds the token only when present", () => {
    expect(roomWebSocketUrl("https://realtime.example.com", "user:abc", "tok")).toContain(
      "token=tok",
    );
    expect(roomWebSocketUrl("https://realtime.example.com", "user:abc", null)).not.toContain(
      "token",
    );
    expect(roomWebSocketUrl("https://realtime.example.com", "user:abc", "")).not.toContain("token");
  });

  it("adds the client id only when present", () => {
    expect(
      roomWebSocketUrl("https://realtime.example.com", "presence:global", null, "client123"),
    ).toContain("client=client123");
    expect(
      roomWebSocketUrl("https://realtime.example.com", "presence:global", null, null),
    ).not.toContain("client");
  });

  it("returns null for an empty or invalid base", () => {
    expect(roomWebSocketUrl("", "feed:home")).toBeNull();
    expect(roomWebSocketUrl("   ", "feed:home")).toBeNull();
    expect(roomWebSocketUrl("no-es-una-url", "feed:home")).toBeNull();
    expect(roomWebSocketUrl("ftp://x.com", "feed:home")).toBeNull();
  });
});
