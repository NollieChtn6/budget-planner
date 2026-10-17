import { describe, expect, it } from "vitest";
import {
  addMoney,
  ceilDivideMoney,
  floorPercentageOf,
  moneyFromCents,
  moneyFromEuros,
  moneyToCents,
  moneyToEuros,
  subtractMoney,
  sumMoney,
} from "./money";

describe("moneyFromCents", () => {
  it("accepts zero", () => {
    expect(moneyToCents(moneyFromCents(0))).toBe(0);
  });

  it("accepts a positive integer", () => {
    expect(moneyToCents(moneyFromCents(1250))).toBe(1250);
  });

  it("accepts a negative integer (restants and marge can go negative, R14/R15)", () => {
    expect(moneyToCents(moneyFromCents(-1250))).toBe(-1250);
  });

  it("throws on a non-integer amount", () => {
    expect(() => moneyFromCents(1.5)).toThrow(RangeError);
  });

  it("throws on NaN", () => {
    expect(() => moneyFromCents(Number.NaN)).toThrow(RangeError);
  });

  it("throws on Infinity", () => {
    expect(() => moneyFromCents(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("moneyToCents", () => {
  it("round-trips with moneyFromCents", () => {
    expect(moneyToCents(moneyFromCents(4242))).toBe(4242);
  });
});

describe("moneyFromEuros", () => {
  it("converts a euro amount with cents to integer cents", () => {
    expect(moneyToCents(moneyFromEuros(12.5))).toBe(1250);
  });

  it("converts zero", () => {
    expect(moneyToCents(moneyFromEuros(0))).toBe(0);
  });

  it("converts a negative euro amount", () => {
    expect(moneyToCents(moneyFromEuros(-12.5))).toBe(-1250);
  });

  it("throws on a sub-cent euro amount", () => {
    expect(() => moneyFromEuros(12.505)).toThrow(RangeError);
  });
});

describe("moneyToEuros", () => {
  it("converts integer cents to a euro amount", () => {
    expect(moneyToEuros(moneyFromCents(1250))).toBe(12.5);
  });

  it("converts a single cent", () => {
    expect(moneyToEuros(moneyFromCents(1))).toBe(0.01);
  });
});

describe("addMoney", () => {
  it("adds two positive amounts", () => {
    expect(moneyToCents(addMoney(moneyFromCents(100), moneyFromCents(250)))).toBe(350);
  });

  it("adds a negative amount", () => {
    expect(moneyToCents(addMoney(moneyFromCents(100), moneyFromCents(-250)))).toBe(-150);
  });
});

describe("subtractMoney", () => {
  it("subtracts to a positive result", () => {
    expect(moneyToCents(subtractMoney(moneyFromCents(250), moneyFromCents(100)))).toBe(150);
  });

  it("subtracts to a negative result (R15: restant can be negative)", () => {
    expect(moneyToCents(subtractMoney(moneyFromCents(100), moneyFromCents(250)))).toBe(-150);
  });
});

describe("sumMoney", () => {
  it("sums an empty list to zero", () => {
    expect(moneyToCents(sumMoney([]))).toBe(0);
  });

  it("sums several amounts", () => {
    expect(
      moneyToCents(sumMoney([moneyFromCents(100), moneyFromCents(250), moneyFromCents(50)])),
    ).toBe(400);
  });

  it("sums negative and positive amounts", () => {
    expect(moneyToCents(sumMoney([moneyFromCents(100), moneyFromCents(-250)]))).toBe(-150);
  });
});

describe("floorPercentageOf", () => {
  it("computes an exact percentage (E2: 850€ base, 15% -> 127,50€)", () => {
    expect(moneyToCents(floorPercentageOf(moneyFromEuros(850), 15))).toBe(12750);
  });

  it("rounds a fractional cent down (R2)", () => {
    expect(moneyToCents(floorPercentageOf(moneyFromCents(101), 50))).toBe(50);
  });
});

describe("ceilDivideMoney", () => {
  it("rounds a fractional cent up (E3: 400€ / 6 -> 66,67€)", () => {
    expect(moneyToCents(ceilDivideMoney(moneyFromEuros(400), 6))).toBe(6667);
  });

  it("divides evenly (E3: 700€ / 10 -> 70,00€)", () => {
    expect(moneyToCents(ceilDivideMoney(moneyFromEuros(700), 10))).toBe(7000);
  });

  it("rounds up a small remainder", () => {
    expect(moneyToCents(ceilDivideMoney(moneyFromCents(1), 3))).toBe(1);
  });

  it("throws when dividing by zero", () => {
    expect(() => ceilDivideMoney(moneyFromCents(100), 0)).toThrow(RangeError);
  });
});
