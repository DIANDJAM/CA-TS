import { describe, expect, it } from "vitest";
import {
  formatMoney,
  marginFraction,
  marginPercent,
  parseMoney,
  priceForMarkup,
  priceForTargetMargin,
} from "./margin";

describe("marginFraction", () => {
  it("computes gross margin", () => {
    expect(marginFraction(10, 6)).toBeCloseTo(0.4);
  });

  it("returns null when cost is unknown", () => {
    expect(marginFraction(10, null)).toBeNull();
  });

  it("returns null for non-positive price", () => {
    expect(marginFraction(0, 5)).toBeNull();
    expect(marginFraction(-1, 5)).toBeNull();
  });

  it("handles negative margin (selling below cost)", () => {
    expect(marginFraction(5, 10)).toBeCloseTo(-1);
  });
});

describe("marginPercent", () => {
  it("rounds to one decimal", () => {
    expect(marginPercent(2.99, 1.87)).toBe(37.5);
  });
});

describe("priceForTargetMargin", () => {
  it("inverts the margin formula", () => {
    // cost 6, target 40% margin -> price 10
    expect(priceForTargetMargin(6, 40)).toBe(10);
  });

  it("rounds to cents", () => {
    expect(priceForTargetMargin(1.87, 35)).toBe(2.88);
  });

  it("achieved margin of the returned price is close to the target", () => {
    const price = priceForTargetMargin(12.34, 42)!;
    expect(marginFraction(price, 12.34)!).toBeCloseTo(0.42, 2);
  });

  it("rejects >= 100% margins", () => {
    expect(priceForTargetMargin(5, 100)).toBeNull();
    expect(priceForTargetMargin(5, 150)).toBeNull();
  });

  it("zero margin returns the cost", () => {
    expect(priceForTargetMargin(7.5, 0)).toBe(7.5);
  });
});

describe("priceForMarkup", () => {
  it("computes markup on cost", () => {
    expect(priceForMarkup(10, 50)).toBe(15);
  });
});

describe("parseMoney / formatMoney", () => {
  it("round-trips decimal strings", () => {
    expect(parseMoney("12.34")).toBe(12.34);
    expect(formatMoney(12.34)).toBe("12.34");
  });

  it("returns null for missing values", () => {
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });
});
