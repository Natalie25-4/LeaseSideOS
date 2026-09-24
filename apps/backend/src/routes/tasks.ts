import { Router, Request, Response } from "express";
import { getAllTasks } from "../data/taskStore";
import { scanLeasesForKeyDates } from "../services/keyDateDetection";
import { compareTaskUrgency } from "../services/taskUrgency";

const router = Router();

/**
 * Returns the current set of detected Clark Tasks (rent reviews, renewal
 * options, and expiries currently within the detection window), soonest
 * first within each urgency level. Re-evaluates urgency on every read.
 */
router.get("/tasks", (req: Request, res: Response) => {
  const tasks = [...getAllTasks()].sort(compareTaskUrgency);
  res.json({ tasks });
});

/**
 * Manually triggers a key-date scan instead of waiting for the scheduled
 * job. Exists so the "Key date detection" card's testing checklist items
 * (seeding leases with dates at varying distances from today, testing a
 * portfolio with zero upcoming events) can be exercised on demand rather
 * than waiting on a real clock.
 */
router.post("/tasks/scan", (req: Request, res: Response) => {
  const tasks = scanLeasesForKeyDates();
  res.json({ tasks });
});

export default router;
