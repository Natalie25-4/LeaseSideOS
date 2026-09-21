import { Router, Request, Response } from "express";
import { getAllTasks } from "../data/taskStore";
import { scanLeasesForKeyDates } from "../services/keyDateDetection";

const router = Router();

/**
 * Returns the current set of detected Clark Tasks (rent reviews, renewal
 * options, and expiries currently within the detection window), soonest
 * first. Populated by the scheduled scan job in index.ts - this endpoint
 * just reads whatever the last scan produced.
 */
router.get("/tasks", (req: Request, res: Response) => {
  const tasks = [...getAllTasks()].sort((a, b) => a.daysUntilEvent - b.daysUntilEvent);
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
