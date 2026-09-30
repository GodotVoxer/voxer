import { describe, expect, it } from "vitest";
import { countryIso2FlagIconSuffix } from "./countryFlag";

describe("countryIso2FlagIconSuffix", () => {
  it("lowercases for fi-xx classes", () => {
    expect(countryIso2FlagIconSuffix("AR")).toBe("ar");
    expect(countryIso2FlagIconSuffix(" mx ")).toBe("mx");
  });
  it("rejects invalid codes", () => {
    expect(countryIso2FlagIconSuffix("")).toBeNull();
    expect(countryIso2FlagIconSuffix("ZZZ")).toBeNull();
    expect(countryIso2FlagIconSuffix("A")).toBeNull();
  });
});
