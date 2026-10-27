import { Router, Request, Response } from "express";
import { getAllLeases } from "../data/leaseStore";
import {
  getAllRequests,
  addRequest,
  proposeAction,
  MaintenanceStatus,
} from "../data/maintenanceStore";

const router = Router();

const VALID_STATUSES: MaintenanceStatus[] = ["logged", "assigned", "in_progress", "resolved"];

/**
 * GET /maintenance
 * Supports both SPRINT 11 cards - returns every logged maintenance
 * request, newest first, with its current status and assignment.
 */
router.get("/maintenance", (req: Request, res: Response) => {
  const requests = [...getAllRequests()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ requests });
});

/**
 * POST /maintenance
 * Supports "Maintenance request logging": logs a request against a
 * property by linking it to a lease (leases carry the property/tenant
 * info - there's no standalone Property store yet). Pulls propertyId,
 * propertyName, and tenantName from the lease so a caller only needs to
 * supply leaseId + description.
 */
router.post("/maintenance", (req: Request, res: Response) => {
  const { leaseId, description } = req.body ?? {};

  if (typeof leaseId !== "string" || typeof description !== "string" || !description.trim() || description.length > 5000) {
    return res.status(400).json({
      error: "MISSING_FIELDS",
      message: "Missing required fields: leaseId, description",
    });
  }

  const lease = getAllLeases().find((l) => l.id === leaseId);
  if (!lease) {
    return res.status(400).json({
      error: "LEASE_NOT_FOUND",
      message: `No lease found with id "${leaseId}" - a maintenance request must link to an existing property/lease.`,
    });
  }

  const request = addRequest({
    leaseId: lease.id,
    propertyId: lease.propertyId,
    propertyName: lease.propertyName,
    tenantName: lease.tenantName,
    description,
  });

  res.status(201).json({ request });
});

/**
 * PATCH /maintenance/:id/status
 * Supports "Maintenance progress tracking": moves a request through
 * logged -> assigned -> in_progress -> resolved.
 */
router.patch("/maintenance/:id/status", (req: Request, res: Response) => {
  const { status } = req.body ?? {};

  if (!status || !VALID_STATUSES.includes(status as MaintenanceStatus)) {
    return res.status(400).json({
      error: "INVALID_STATUS",
      message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }

  const id = req.params.id as string;
  const action = proposeAction(id, { type: "status", status });
  res.status(202).json({ action, message: "Awaiting PM approval; status has not changed" });
});

/**
 * PATCH /maintenance/:id/assign
 * Supports "Maintenance progress tracking"'s assignment UI - assigns (or
 * reassigns) a request to someone, e.g. a contractor or team member.
 */
router.patch("/maintenance/:id/assign", (req: Request, res: Response) => {
  const { assignedTo } = req.body ?? {};

  if (typeof assignedTo !== "string" || !assignedTo.trim() || assignedTo.length > 200) {
    return res.status(400).json({ error: "MISSING_FIELDS", message: "Missing required field: assignedTo" });
  }

  const id = req.params.id as string;
  const action = proposeAction(id, { type: "assign", assignedTo: assignedTo.trim() });
  res.status(202).json({ action, message: "Awaiting PM approval; assignment has not changed" });
});

export default router;
