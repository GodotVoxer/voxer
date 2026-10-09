import { describe, expect, it } from "vitest";
import { commentNotificationLine, commentNotificationText } from "./notificationText";

const comment = (
  body: string,
  over: Partial<Parameters<typeof commentNotificationText>[0]> = {},
) => ({
  body,
  imageUrl: null,
  videoUrl: null,
  animatedImage: false,
  ...over,
});

describe("commentNotificationText", () => {
  it("drops the reply tokens and the blank lines they leave", () => {
    expect(commentNotificationText(comment(">>ABCD1234\nhola"))).toBe("hola");
    expect(commentNotificationText(comment(">>ABCD1234 >>WXYZ5678 hola"))).toBe("hola");
    expect(commentNotificationText(comment("como dijo >>ABCD1234 acá"))).toBe("como dijo acá");
  });

  it("keeps greentext and line breaks", () => {
    expect(commentNotificationText(comment(">>ABCD1234\n>implicando\n\nno"))).toBe(
      ">implicando\n\nno",
    );
  });

  it("replaces control characters, which a notification would show raw", () => {
    expect(commentNotificationText(comment("a\tb\u0007c"))).toBe("a b c");
  });

  it("labels a comment that is only media", () => {
    expect(commentNotificationText(comment("", { imageUrl: "/a.webp" }))).toBe("Imagen");
    expect(commentNotificationText(comment(">>ABCD1234", { videoUrl: "/a.mp4" }))).toBe("Video");
    expect(commentNotificationText(comment("", { videoUrl: "/a.mp4", animatedImage: true }))).toBe(
      "GIF",
    );
  });

  it("prefers the text over the media label", () => {
    expect(commentNotificationText(comment("mirá", { imageUrl: "/a.webp" }))).toBe("mirá");
  });

  it("is never empty", () => {
    expect(commentNotificationText(comment(">>ABCD1234"))).toBe("Sin texto");
  });
});

describe("commentNotificationLine", () => {
  it("is a single truncated line", () => {
    expect(commentNotificationLine(comment(">>ABCD1234\nuno\ndos"), 20)).toBe("uno dos");
    expect(commentNotificationLine(comment("x".repeat(50)), 10)).toBe(`${"x".repeat(9)}…`);
  });
});
