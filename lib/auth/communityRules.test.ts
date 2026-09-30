import { describe, expect, it } from "vitest";
import { COMMUNITY_RULES_VERSION, hasAcceptedCurrentRules } from "@/lib/auth/communityRules";
import { acceptRulesSchema, registerSchema } from "@/lib/auth/schemas";

describe("hasAcceptedCurrentRules", () => {
  it("an account that never accepted must accept", () => {
    expect(hasAcceptedCurrentRules(null)).toBe(false);
    expect(hasAcceptedCurrentRules(undefined)).toBe(false);
  });

  it("an older version asks for confirmation again", () => {
    expect(hasAcceptedCurrentRules(COMMUNITY_RULES_VERSION - 1)).toBe(false);
  });

  it("the current version is enough", () => {
    expect(hasAcceptedCurrentRules(COMMUNITY_RULES_VERSION)).toBe(true);
  });
});

describe("registerSchema", () => {
  const base = { username: "usuario", password: "contraseña-larga" };

  it("rejects sign-up without accepting the rules", () => {
    expect(registerSchema.safeParse(base).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, acceptRules: false }).success).toBe(false);
  });

  it("accepts sign-up with the rules accepted", () => {
    expect(registerSchema.safeParse({ ...base, acceptRules: true }).success).toBe(true);
  });
});

describe("acceptRulesSchema", () => {
  it("requires a version number", () => {
    expect(acceptRulesSchema.safeParse({}).success).toBe(false);
    expect(acceptRulesSchema.safeParse({ version: COMMUNITY_RULES_VERSION }).success).toBe(true);
  });
});
