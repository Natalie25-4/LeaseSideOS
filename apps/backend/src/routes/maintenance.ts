import { Router, Request, Response } from "express";
import { getAllLeases } from "../data/leaseStore";
import {
  getAllRequests,
  addRequest,
  updateRequestStatus,
  assignRequest,
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
  const { leaseId, description } = req.body as { leaseId?: string; description?: string };

  if (!leaseId || !description) {
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
  const { status } = req.body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status as MaintenanceStatus)) {
    return res.status(400).json({
      error: "INVALID_STATUS",
      message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }

  const id = req.params.id as string;
  const request = updateRequestStatus(id, status as MaintenanceStatus);
  if (!request) {
    return res.status(404).json({ error: "NOT_FOUND", message: `No maintenance request with id "${id}"` });
  }

  res.json({ request });
});

/**
 * PATCH /maintenance/:id/assign
 * Supports "Maintenance progress tracking"'s assignment UI - assigns (or
 * reassigns) a request to someone, e.g. a contractor or team member.
 */
router.patch("/maintenance/:id/assign", (req: Request, res: Response) => {
  const { assignedTo } = req.body as { assignedTo?: string };

  if (!assignedTo) {
    return res.status(400).json({ error: "MISSING_FIELDS", message: "Missing required field: assignedTo" });
  }

  const id = req.params.id as string;
  const request = assignRequest(id, assignedTo);
  if (!request) {
    return res.status(404).json({ error: "NOT_FOUND", message: `No maintenance request with id "${id}"` });
  }

  res.json({ request });
});

export default router;
