import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { leasesRouter } from "./routes/leases.js";
import { documentsRouter } from "./routes/documents.js";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/leases", leasesRouter);
app.use("/api/documents", documentsRouter);

app.listen(env.PORT, () => {
  console.log(`Backend server running on http://localhost:${env.PORT}`);
});