import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});