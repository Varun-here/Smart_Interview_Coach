// apps/api/src/index.ts
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ---- Manual CORS (no dependency) ----
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
// -------------------------------------

app.use(express.json());

// Routes
import resume from "./routes/resume.js";
import sessionRoutes from "./routes/session.js";
import answer from "./routes/answer.js";
import processRoute from "./routes/process.js";
app.use("/", processRoute);


app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/resume", resume);
app.use("/session", sessionRoutes);
app.use("/answer", answer);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on :${port}`));
