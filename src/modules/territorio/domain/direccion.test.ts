import { describe, expect, it } from "vitest";
import { transversalesValidas } from "./direccion";
import { comoCalleId } from "./identificadores";

const calleA = comoCalleId("11111111-1111-4111-8111-111111111111");
const calleB = comoCalleId("22222222-2222-4222-8222-222222222222");
const calleC = comoCalleId("33333333-3333-4333-8333-333333333333");

describe("transversalesValidas", () => {
  it("acepta las tres calles cuando son distintas entre si", () => {
    expect(transversalesValidas(calleA, calleB, calleC)).toBe(true);
  });

  it("rechaza si calleId coincide con entreCalleAId", () => {
    expect(transversalesValidas(calleA, calleA, calleC)).toBe(false);
  });

  it("rechaza si calleId coincide con entreCalleBId", () => {
    expect(transversalesValidas(calleA, calleB, calleA)).toBe(false);
  });

  it("rechaza si entreCalleAId coincide con entreCalleBId", () => {
    expect(transversalesValidas(calleA, calleB, calleB)).toBe(false);
  });

  it("acepta transversales nulas -comisaria rural sin cruces conocidos-", () => {
    expect(transversalesValidas(calleA, null, null)).toBe(true);
  });

  it("acepta una sola transversal presente", () => {
    expect(transversalesValidas(calleA, calleB, null)).toBe(true);
  });
});
