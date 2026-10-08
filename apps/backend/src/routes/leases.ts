import { Router, Request, Response } from "express";
import { getAllLeases, addLease, Lease } from "../data/leaseStore";

const router = Router();

/**
 * GET /leases
 * Supports the "Lease List page" card: returns every uploaded lease so a
 * property manager can find the one they need. Sorted soonest-expiry-first
 * since that's what a manager scanning the list actually cares about.
 */
router.get("/leases", (req: Request, res: Response) => {
  const leases = [...getAllLeases()].sort(
    (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
  );
  res.json({ leases });
});

/**
 * POST /leases
 * Not part of the Lease List card itself, but included so the list can
 * actually be tested against "a newly uploaded lease" (per the card's
 * Testing checklist) before the real PDF upload pipeline exists. Takes the
 * same shape as Lease minus id.
 */
router.post("/leases", (req: Request, res: Response) => {
  const body = req.body as Partial<Omit<Lease, "id">>;

  const required: (keyof Omit<Lease, "id">)[] = [
    "propertyId",
    "propertyName",
    "tenantName",
    "landlordName",
    "startDate",
    "endDate",
    "rentAmount",
    "status",
  ];
  const missing = required.filter((field) => body[field] === undefined);
  if (missing.length > 0) {
    return res.status(400).json({
      error: "MISSING_FIELDS",
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  const lease = addLease(body as Omit<Lease, "id">);
  res.status(201).json({ lease });
});

export default router;
