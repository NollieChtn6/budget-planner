/**
 * Amounts are always integer cents (ADR-0001): floats never represent money,
 * and conversion to/from euros happens only at this module's boundary.
 */
export type Money = { readonly __brand: "Money"; readonly cents: number };

const EURO_ROUNDING_TOLERANCE = 1e-6;

export function moneyFromCents(cents: number): Money {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`Money must be an integer number of cents, got ${cents}`);
  }
  return { __brand: "Money", cents };
}

export function moneyFromEuros(euros: number): Money {
  const cents = euros * 100;
  const roundedCents = Math.round(cents);
  if (Math.abs(cents - roundedCents) > EURO_ROUNDING_TOLERANCE) {
    throw new RangeError(`Money must be exact to the cent, got ${euros} euros`);
  }
  return moneyFromCents(roundedCents);
}

export function moneyToCents(money: Money): number {
  return money.cents;
}

export function moneyToEuros(money: Money): number {
  return money.cents / 100;
}

export function addMoney(a: Money, b: Money): Money {
  return moneyFromCents(a.cents + b.cents);
}

export function subtractMoney(a: Money, b: Money): Money {
  return moneyFromCents(a.cents - b.cents);
}

export function sumMoney(amounts: Money[]): Money {
  return amounts.reduce(addMoney, moneyFromCents(0));
}

/** R2: envelope percentage budgets round down to the cent. */
export function floorPercentageOf(base: Money, percentage: number): Money {
  return moneyFromCents(Math.floor((base.cents * percentage) / 100));
}

/** R2: provision target division rounds up to the cent. */
export function ceilDivideMoney(total: Money, count: number): Money {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError(`count must be a positive integer, got ${count}`);
  }
  return moneyFromCents(Math.ceil(total.cents / count));
}
