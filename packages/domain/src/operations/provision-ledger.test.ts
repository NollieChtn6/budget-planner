import { describe, expect, it } from "vitest";
import { moneyFromEuros, moneyToEuros } from "../money";
import {
  computeContributionSurplus,
  computeProvisionBalance,
  isProvisionDone,
} from "./provision-ledger";

describe("computeProvisionBalance", () => {
  it("is the sum of contributions when nothing was spent", () => {
    const balance = computeProvisionBalance([moneyFromEuros(100), moneyFromEuros(50)], []);
    expect(moneyToEuros(balance)).toBe(150);
  });

  it("E10: a 300€ expense on a 250€ balance draws 50€ from savings, leaving 0€", () => {
    const balance = computeProvisionBalance(
      [moneyFromEuros(250)],
      [{ amount: moneyFromEuros(300), savingsDraw: moneyFromEuros(50) }],
    );
    expect(moneyToEuros(balance)).toBe(0);
  });

  it("deducts an expense with no savings draw in full", () => {
    const balance = computeProvisionBalance(
      [moneyFromEuros(100)],
      [{ amount: moneyFromEuros(40) }],
    );
    expect(moneyToEuros(balance)).toBe(60);
  });
});

describe("computeContributionSurplus (R19)", () => {
  it("E5: a 100€ contribution against a 66.67€ target gives a 33.33€ advance", () => {
    expect(
      moneyToEuros(computeContributionSurplus(moneyFromEuros(66.67), moneyFromEuros(100))),
    ).toBeCloseTo(33.33);
  });

  it("is negative when the target isn't met yet", () => {
    expect(moneyToEuros(computeContributionSurplus(moneyFromEuros(100), moneyFromEuros(40)))).toBe(
      -60,
    );
  });
});

describe("isProvisionDone (R28)", () => {
  it("is done once contributions reach the target", () => {
    expect(isProvisionDone(moneyFromEuros(100), moneyFromEuros(100))).toBe(true);
    expect(isProvisionDone(moneyFromEuros(100), moneyFromEuros(100.01))).toBe(true);
  });

  it("is not done while under target", () => {
    expect(isProvisionDone(moneyFromEuros(100), moneyFromEuros(99.99))).toBe(false);
  });
});
