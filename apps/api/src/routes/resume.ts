import { Router } from "express";
import { presignPut } from "../lib/s3.js";
import { query } from "../lib/db.js";
import { randomUUID } from "crypto";

const r = Router();

r.post("/upload-url", async (req, res) => {
  const { userId, contentType = "application/pdf" } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const id = randomUUID();
  const key = `resumes/${userId}/${id}.pdf`;
  const url = await presignPut(key, contentType);
  await query("INSERT INTO resumes(id, user_id, s3_key) VALUES($1,$2,$3)", [id, userId, key]);
  res.json({ url, key, id });
});

export default r;
