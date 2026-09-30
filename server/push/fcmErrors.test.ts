import { describe, expect, it } from "vitest";
import { classifyFcmFailure, shouldDeleteToken, type FcmFailure } from "@/server/push/fcmErrors";

const fcmError = (status: string, errorCode: string, code: number) => ({
  error: {
    code,
    message: "mensaje de google",
    status,
    details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode }],
  },
});

describe("classifyFcmFailure", () => {
  it("detects an uninstalled token", () => {
    expect(classifyFcmFailure(404, fcmError("NOT_FOUND", "UNREGISTERED", 404))).toBe(
      "unregistered",
    );
  });

  it("treats a bare 404 as a dead token", () => {
    expect(classifyFcmFailure(404, null)).toBe("unregistered");
  });

  it("detects invalid tokens and tokens of another sender", () => {
    expect(classifyFcmFailure(400, fcmError("INVALID_ARGUMENT", "INVALID_ARGUMENT", 400))).toBe(
      "invalid",
    );
    expect(classifyFcmFailure(403, fcmError("PERMISSION_DENIED", "SENDER_ID_MISMATCH", 403))).toBe(
      "invalid",
    );
  });

  it("classifies the actual body FCM returned for a fake token", () => {
    const real = {
      error: {
        code: 400,
        message: "The registration token is not a valid FCM registration token",
        status: "INVALID_ARGUMENT",
        details: [
          {
            "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError",
            errorCode: "INVALID_ARGUMENT",
          },
          {
            "@type": "type.googleapis.com/google.rpc.BadRequest",
            fieldViolations: [
              {
                field: "message.token",
                description: "The registration token is not a valid FCM registration token",
              },
            ],
          },
        ],
      },
    };
    expect(classifyFcmFailure(400, real)).toBe("invalid");
    expect(shouldDeleteToken(classifyFcmFailure(400, real))).toBe(true);
  });

  it("separates problems with our own credentials", () => {
    expect(classifyFcmFailure(401, null)).toBe("auth");
    expect(classifyFcmFailure(403, null)).toBe("auth");
    expect(
      classifyFcmFailure(401, fcmError("UNAUTHENTICATED", "THIRD_PARTY_AUTH_ERROR", 401)),
    ).toBe("auth");
  });

  it("marks quota and server errors as retryable", () => {
    expect(classifyFcmFailure(429, fcmError("RESOURCE_EXHAUSTED", "QUOTA_EXCEEDED", 429))).toBe(
      "retryable",
    );
    expect(classifyFcmFailure(503, fcmError("UNAVAILABLE", "UNAVAILABLE", 503))).toBe("retryable");
    expect(classifyFcmFailure(500, null)).toBe("retryable");
  });

  it("survives unexpected bodies", () => {
    expect(classifyFcmFailure(418, null)).toBe("unknown");
    expect(classifyFcmFailure(418, "texto plano")).toBe("unknown");
    expect(classifyFcmFailure(418, { error: { details: "no es array" } })).toBe("unknown");
    expect(classifyFcmFailure(418, { error: { details: [{}, null] } })).toBe("unknown");
  });
});

describe("shouldDeleteToken", () => {
  it("deletes only when the device is at fault", () => {
    const expected: Record<FcmFailure, boolean> = {
      unregistered: true,
      invalid: true,
      auth: false,
      retryable: false,
      unknown: false,
    };
    for (const [failure, want] of Object.entries(expected)) {
      expect(shouldDeleteToken(failure as FcmFailure)).toBe(want);
    }
  });
});
