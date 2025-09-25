import { Router } from "express";
import { query } from "../lib/db.js";
import { randomUUID } from "crypto";

const r = Router();

function generateQuestions(role: string) {
  const bank: Record<string, string[]> = {
    "Backend Engineer": [
      "Describe a time you optimized a database query.",
      "Explain eventual consistency and when to use it.",
      "Walk me through designing a rate limiter."
    ],
    "General": [
      "Tell me about yourself using STAR.",
      "What’s a challenging bug you fixed recently?",
      "How do you handle conflicting priorities?"
    ]
  };
  const q = bank[role] ?? bank["General"];
  return q.map((prompt, i) => ({ prompt, sequence: i + 1 }));
}

function looksLikeUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

r.post("/", async (req, res) => {
  try {
    let { userId, role = "General", job_keywords = [] } = req.body;

    if (!userId || !looksLikeUuid(userId)) {
      // generate a proper UUID if one not provided
      userId = randomUUID();
    }

    // ensure user exists (UPSERT by email or id)
    await query(
      `INSERT INTO users (id, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [userId, `user+${userId}@example.com`, "Guest"]
    );

    const sid = randomUUID();
    await query(
      "INSERT INTO sessions(id, user_id, role, job_keywords) VALUES($1,$2,$3,$4)",
      [sid, userId, role, job_keywords]
    );

    const qs = generateQuestions(role);
    for (const q of qs) {
      await query(
        "INSERT INTO questions(id, session_id, prompt, sequence) VALUES($1,$2,$3,$4)",
        [randomUUID(), sid, q.prompt, q.sequence]
      );
    }

    res.json({ sessionId: sid, userId, count: qs.length });
  } catch (err: any) {
    console.error("POST /session failed:", err);
    res.status(500).json({ error: err.message || "failed to create session" });
  }
});

r.get("/:id", async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT * FROM questions WHERE session_id=$1 ORDER BY sequence",
      [req.params.id]
    );
    res.json(rows);
  } catch (err: any) {
    console.error("GET /session/:id failed:", err);
    res.status(500).json({ error: err.message || "failed to fetch questions" });
  }
});

export default r;
