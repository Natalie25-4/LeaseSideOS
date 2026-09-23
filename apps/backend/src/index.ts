import express from "express";
import leasesRouter from "./routes/leases";
import tasksRouter from "./routes/tasks";
import accountingRouter from "./routes/accounting";
import { scanLeasesForKeyDates } from "./services/keyDateDetection";

const app = express();
app.use(express.json());

// Minimal CORS for local dev so the Next.js frontend (localhost:3000) can
// call this API (localhost:4000). No "cors" package dependency added for
// just this - revisit with a real allowlist before anything is deployed.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

const PORT = process.env.PORT || 4000;

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(leasesRouter);
app.use(tasksRouter);
app.use(accountingRouter);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);

  // Key date detection scheduled job ("Build scheduled jobs to scan all
  // leases" - SPRINT 7 Key date detection card). No cron package added
  // just for this: setInterval covers a single-process dev/demo backend
  // fine. Swap for a real scheduler (e.g. node-cron, or a DB-backed job
  // queue) once this runs anywhere other than one long-lived process.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const runScan = () => {
    const tasks = scanLeasesForKeyDates();
    console.log(`Key date scan complete: ${tasks.length} upcoming event(s) detected.`);
  };

  runScan(); // scan once on startup so /tasks isn't empty before the first interval fires
  setInterval(runScan, ONE_DAY_MS);
});
