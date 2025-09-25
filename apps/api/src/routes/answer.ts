import { Router } from "express";
import { presignPut } from "../lib/s3.js";
import { query } from "../lib/db.js";
import { randomUUID } from "crypto";

const r = Router();

r.post("/upload-url", async (req, res) => {
  const { userId, sessionId, questionId, contentType = "audio/webm" } = req.body;
  if (!userId || !sessionId || !questionId) {
    return res.status(400).json({ error: "userId, sessionId, questionId required" });
  }

  const id = randomUUID();
  const key = `audio/${userId}/${sessionId}/${id}.webm`;

  const url = await presignPut(key, contentType);
  await query(
    "INSERT INTO answers(id,session_id,question_id,s3_key) VALUES($1,$2,$3,$4)",
    [id, sessionId, questionId, key]
  );
  res.json({ url, key, answerId: id });
});

export default r;
