import { Router, Request, Response } from "express";
import { getAllLeases } from "../data/leaseStore";
import { calculateRentReview } from "../services/rentCalculations";

const router = Router();

/**
 * GET /accounting/summary
 * Supports "Rent and OPEX tracking" and "Rent review calculation" (SPRINT
 * 10): per-lease rent, OPEX, and CPI/fixed increase figures so a PM always
 * knows the current financial position, plus - where a lease has rent
 * review terms - the calculated next review amount and the clause behind
 * it, so it never needs to be worked out manually.
 */
router.get("/accounting/summary", (req: Request, res: Response) => {
  const leases = getAllLeases();

  const summary = leases.map((lease) => {
    const opexAmount = lease.opexAmount ?? 0;
    return {
      leaseId: lease.id,
      propertyName: lease.propertyName,
      tenantName: lease.tenantName,
      rentAmount: lease.rentAmount,
      opexAmount,
      totalAmount: lease.rentAmount + opexAmount,
      rentReview: calculateRentReview(lease),
    };
  });

  res.json({ summary });
});

export default router;
