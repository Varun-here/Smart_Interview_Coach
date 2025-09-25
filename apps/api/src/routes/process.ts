import { Router } from "express";
import { query } from "../lib/db.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import axios from "axios";
import { randomUUID } from "crypto";

const r = Router();
const s3 = new S3Client({ region: process.env.AWS_REGION });

function simpleAnalysis(transcript: string, jobKeywords: string[]) {
  const lower = transcript.toLowerCase();
  const fillerList = ["um","uh","like","you know","so"];
  const fillerCounts: Record<string, number> = {};
  for (const f of fillerList) {
    fillerCounts[f] = (lower.match(new RegExp(`\\b${f}\\b`, "g")) || []).length;
  }
  const hit: string[] = [], miss: string[] = [];
  for (const kw of jobKeywords || []) {
    (lower.includes(kw.toLowerCase()) ? hit : miss).push(kw);
  }
  const totalFillers = Object.values(fillerCounts).reduce((a,b)=>a+b,0);
  const clarity = Math.max(30, Math.min(95, 100 - totalFillers * 5));
  return {
    sentiment_label: "NEUTRAL",
    sentiment_scores: { Neutral: 1 },
    key_phrases: hit,
    missed_keywords: miss,
    readability: { flesch: 60 },
    filler_words: fillerCounts,
    clarity_score: clarity
  };
}

r.post("/answer/process", async (req, res) => {
  try {
    const { answerId } = req.body;
    if (!answerId) return res.status(400).json({ error: "answerId required" });

    // 1) Lookup answer + its session keywords
    const ans = await query(
      `SELECT a.id, a.session_id, a.s3_key, s.job_keywords
         FROM answers a
         JOIN sessions s ON s.id = a.session_id
        WHERE a.id = $1`,
      [answerId]
    );
    if (!ans.rowCount) return res.status(404).json({ error: "answer not found" });
    const { s3_key, job_keywords } = ans.rows[0];

    // 2) Presign GET for the audio in S3
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: s3_key }),
      { expiresIn: 3600 }
    );

    // 3) Transcribe via AssemblyAI
    const AAI = process.env.ASSEMBLYAI_API_KEY;
    if (!AAI) return res.status(400).json({ error: "ASSEMBLYAI_API_KEY missing in env" });

    const start = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      { audio_url: url },
      { headers: { authorization: AAI } }
    );
    const tid = start.data.id as string;

    let transcript = "";
    for (;;) {
      await new Promise(r => setTimeout(r, 3000));
      const st = await axios.get(`https://api.assemblyai.com/v2/transcript/${tid}`, {
        headers: { authorization: AAI }
      });
      if (st.data.status === "completed") {
        transcript = st.data.text || "";
        break;
      }
      if (st.data.status === "error") {
        throw new Error(st.data.error || "transcription failed");
      }
    }

    // 4) Simple analysis
    const a = simpleAnalysis(transcript, job_keywords || []);

    // 5) Persist results (no DB extensions required)
    await query("UPDATE answers SET transcript=$2 WHERE id=$1", [answerId, transcript]);
    const analysisId = randomUUID();
    await query(
      `INSERT INTO analysis
         (id, answer_id, sentiment_label, sentiment_scores, key_phrases, missed_keywords, readability, filler_words, clarity_score)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [analysisId, answerId, a.sentiment_label, a.sentiment_scores, a.key_phrases, a.missed_keywords, a.readability, a.filler_words, a.clarity_score]
    );

    res.json({ ok: true, transcript, analysis: a, analysisId });
  } catch (e: any) {
    console.error("/answer/process failed:", e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data || e.message || "failed" });
  }
});

export default r;
