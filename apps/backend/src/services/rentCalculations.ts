/**
 * Rent review / OPEX calculations.
 *
 * "As a PM, I want rent, OPEX, and CPI/fixed increases tracked per lease,
 * so that I always know the current financial position" (Rent and OPEX
 * tracking) and "As a PM, I want Clark to calculate the next rent review
 * amount, so that I don't do it manually" (Rent review calculation) -
 * both SPRINT 10.
 */

import { Lease, RentReviewTerms } from "../data/leaseStore";

/**
 * Placeholder current CPI annual rate, used for any lease whose rent review
 * terms are CPI-linked but don't specify a cpiOverrideRate.
 *
 * TODO: replace with a real feed (e.g. Stats NZ CPI series, or RBNZ) once
 * this app talks to an external data source - 3.2% is a placeholder value,
 * not sourced from anywhere real.
 */
export const DEFAULT_CPI_ANNUAL_RATE = 0.032;

export interface RentReviewCalculation {
  leaseId: string;
  currentRentAmount: number;
  calculatedRentAmount: number;
  /** The increase implied by the lease's raw terms, before any cap/collar. */
  rawIncreasePercentage: number;
  /** The increase actually applied, after cap/collar clamping. */
  appliedIncreasePercentage: number;
  capApplied: boolean;
  collarApplied: boolean;
  /** Human-readable explanation of the calculated amount, for display. */
  clause: string;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function computeRawIncreasePercentage(terms: RentReviewTerms, currentRentAmount: number): number {
  switch (terms.type) {
    case "fixed_percentage":
      return terms.value ?? 0;
    case "fixed_amount":
      // Expressed as a dollar amount in the lease terms, but converted to a
      // percentage here so it can be compared against cap/collar bounds
      // using the same units as the other increase types.
      return currentRentAmount > 0 ? (terms.value ?? 0) / currentRentAmount : 0;
    case "cpi":
      return terms.cpiOverrideRate ?? DEFAULT_CPI_ANNUAL_RATE;
  }
}

function describeClause(
  terms: RentReviewTerms,
  rawIncreasePercentage: number,
  appliedIncreasePercentage: number,
  capApplied: boolean,
  collarApplied: boolean
): string {
  let base: string;
  switch (terms.type) {
    case "fixed_percentage":
      base = `Fixed ${formatPercent(rawIncreasePercentage)} annual increase`;
      break;
    case "fixed_amount":
      base = `Fixed $${(terms.value ?? 0).toLocaleString()} increase (${formatPercent(rawIncreasePercentage)})`;
      break;
    case "cpi":
      base = `CPI-linked increase (${formatPercent(rawIncreasePercentage)})`;
      break;
  }

  if (capApplied) {
    return `${base}, capped at ${formatPercent(terms.capPercentage as number)}`;
  }
  if (collarApplied) {
    const heldFlat = appliedIncreasePercentage === 0 ? " - rent held at current level" : "";
    return `${base}, collared at ${formatPercent(terms.collarPercentage as number)}${heldFlat}`;
  }
  return base;
}

/**
 * Calculates the next rent review amount for a lease, per its rent review
 * terms (fixed percentage, fixed amount, or CPI-linked), applying any
 * cap/collar bounds. Returns null if the lease has no rent review terms -
 * not every lease has one, so "not applicable" is a valid result.
 */
export function calculateRentReview(lease: Lease): RentReviewCalculation | null {
  const terms = lease.rentReviewTerms;
  if (!terms) return null;

  const rawIncreasePercentage = computeRawIncreasePercentage(terms, lease.rentAmount);

  let appliedIncreasePercentage = rawIncreasePercentage;
  let capApplied = false;
  let collarApplied = false;

  if (terms.capPercentage !== undefined && appliedIncreasePercentage > terms.capPercentage) {
    appliedIncreasePercentage = terms.capPercentage;
    capApplied = true;
  }
  if (terms.collarPercentage !== undefined && appliedIncreasePercentage < terms.collarPercentage) {
    appliedIncreasePercentage = terms.collarPercentage;
    collarApplied = true;
  }

  // Round to cents.
  const calculatedRentAmount = Math.round(lease.rentAmount * (1 + appliedIncreasePercentage) * 100) / 100;

  return {
    leaseId: lease.id,
    currentRentAmount: lease.rentAmount,
    calculatedRentAmount,
    rawIncreasePercentage,
    appliedIncreasePercentage,
    capApplied,
    collarApplied,
    clause: describeClause(terms, rawIncreasePercentage, appliedIncreasePercentage, capApplied, collarApplied),
  };
}
