import { Router, Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import { ApprovalError, listApprovals, decideAction } from "../data/maintenanceStore";

const router = Router();
function requirePM(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.PM_APPROVAL_TOKEN;
  const actor = process.env.PM_APPROVER_ID;
  if (!secret || secret.length < 32 || !actor?.trim()) {
    return res.status(503).json({ message: "PM approval access has not been configured" });
  }
  const supplied = req.get("Authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(401).json({ message: "Valid PM approval key required" });
  }
  res.locals.actor = actor;
  res.setHeader("Cache-Control", "no-store");
  next();
}
router.get("/approvals", requirePM, (_req, res) => res.json(listApprovals()));
router.post("/approvals/:id/decision", requirePM, (req, res) => {
  const { decision, reason = "" } = req.body ?? {};
  if (!["approve", "reject"].includes(decision) || typeof reason !== "string" || reason.length > 1000) {
    return res.status(400).json({ message: "Choose approve or reject and provide a short reason" });
  }
  res.json(decideAction(req.params.id as string, decision, res.locals.actor, reason));
});
export function approvalErrorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApprovalError) return res.status(error.status).json({ message: error.message });
  console.error("Operation failed", error);
  return res.status(500).json({ message: "Operation could not be saved; no approval was confirmed" });
}
export default router;
