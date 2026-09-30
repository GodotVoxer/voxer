import { describe, expect, it } from "vitest";
import {
  banContentWindowDurationMs,
  banContentWindowLabelEs,
  banContentWindowMaxAmountForUnit,
} from "./contentBan";

describe("banContentWindowDurationMs", () => {
  it("converts minutes, hours and days", () => {
    expect(banContentWindowDurationMs(2, "MINUTES")).toBe(120_000);
    expect(banContentWindowDurationMs(3, "HOURS")).toBe(3 * 3_600_000);
    expect(banContentWindowDurationMs(4, "DAYS")).toBe(4 * 86_400_000);
  });
});

describe("banContentWindowMaxAmountForUnit", () => {
  it("returns the cap per unit", () => {
    expect(banContentWindowMaxAmountForUnit("MINUTES")).toBe(525_600);
    expect(banContentWindowMaxAmountForUnit("HOURS")).toBe(8_760);
    expect(banContentWindowMaxAmountForUnit("DAYS")).toBe(366);
  });
});

describe("banContentWindowLabelEs", () => {
  it("labels forever", () => {
    expect(banContentWindowLabelEs(true)).toBe("Todo el historial");
  });
  it("uses Spanish singular and plural", () => {
    expect(banContentWindowLabelEs(false, 1, "MINUTES")).toBe("Últimos 1 minuto");
    expect(banContentWindowLabelEs(false, 5, "MINUTES")).toBe("Últimos 5 minutos");
    expect(banContentWindowLabelEs(false, 1, "HOURS")).toBe("Últimos 1 hora");
    expect(banContentWindowLabelEs(false, 2, "HOURS")).toBe("Últimos 2 horas");
    expect(banContentWindowLabelEs(false, 1, "DAYS")).toBe("Últimos 1 día");
    expect(banContentWindowLabelEs(false, 3, "DAYS")).toBe("Últimos 3 días");
  });
});
