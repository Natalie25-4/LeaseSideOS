import express from "express";
import leasesRouter from "./routes/leases";

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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
