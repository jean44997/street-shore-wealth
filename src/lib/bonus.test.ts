import { describe, expect, it } from "vitest";
import { bonusFor, canWithdraw, creditedFor } from "./bonus";
import { fcfa } from "./format";
import { toCsv } from "./csv";

describe("règles de bonus", () => {
  it("crédite 20 000 F pour un dépôt de 5 000 F", () => {
    expect(bonusFor(5000)).toBe(15000);
    expect(creditedFor(5000)).toBe(20000);
  });

  it("reste proportionnel sur les autres montants", () => {
    expect(creditedFor(10000)).toBe(40000);
    expect(creditedFor(0)).toBe(0);
    expect(creditedFor(-500)).toBe(0);
  });
});

describe("règles de retrait", () => {
  const base = { hasDeposited: true, activeReferrals: 1, balance: 20000, amount: 20000, min: 20000 };
  it("autorise le retrait quand tout est réuni", () => {
    expect(canWithdraw(base)).toBe(true);
  });
  it("bloque sans filleul rechargé", () => {
    expect(canWithdraw({ ...base, activeReferrals: 0 })).toBe(false);
  });
  it("bloque sous le minimum ou au-dessus du solde", () => {
    expect(canWithdraw({ ...base, amount: 19999 })).toBe(false);
    expect(canWithdraw({ ...base, amount: 25000 })).toBe(false);
  });
  it("bloque sans dépôt validé", () => {
    expect(canWithdraw({ ...base, hasDeposited: false })).toBe(false);
  });
});

describe("formatage et export", () => {
  it("formate en FCFA", () => {
    expect(fcfa(20000).replace(/\u202f|\u00a0/g, " ")).toBe("20 000 F");
  });
  it("échappe les séparateurs CSV", () => {
    const csv = toCsv([{ a: 'x;y"z', b: 1 }]);
    expect(csv).toContain('"x;y""z"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
  it("renvoie une chaîne vide sans lignes", () => {
    expect(toCsv([])).toBe("");
  });
});
