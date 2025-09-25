import type { S3Event } from "aws-lambda";
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { ComprehendClient, DetectSentimentCommand, DetectKeyPhrasesCommand } from "@aws-sdk/client-comprehend";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Pool } from "pg";

const region = process.env.AWS_REGION!;
const bucket = process.env.S3_BUCKET!;
const db = new Pool({ connectionString: process.env.DATABASE_URL }); // In AWS, fetch from Secrets Manager

const s3 = new S3Client({ region });
const transcribe = new TranscribeClient({ region });
const comprehend = new ComprehendClient({ region });

export const handler = async (event: S3Event) => {
  for (const rec of event.Records) {
    const key = decodeURIComponent(rec.s3.object.key);
    if (!key.startsWith("audio/")) continue;

    const jobName = key.replace(/\W+/g, "-").slice(-60);
    await transcribe.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      Media: { MediaFileUri: `s3://${bucket}/${key}` },
      LanguageCode: "en-US",
      OutputBucketName: bucket,
      OutputKey: `transcripts/${jobName}.json`
    }));

    let done = false; let transcriptText = "";
    for (let i=0;i<20 && !done;i++) {
      await new Promise(r => setTimeout(r, 5000));
      const out = await transcribe.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }));
      const st = out.TranscriptionJob?.TranscriptionJobStatus;
      if (st === "COMPLETED") {
        const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: `transcripts/${jobName}.json` }));
        const body = await obj.Body?.transformToString();
        const data = JSON.parse(body ?? "{}");
        transcriptText = data?.results?.transcripts?.[0]?.transcript ?? "";
        done = true;
      } else if (st === "FAILED") {
        done = true;
      }
    }

    if (!transcriptText) continue;

    const senti = await comprehend.send(new DetectSentimentCommand({ LanguageCode: "en", Text: transcriptText }));
    const phrases = await comprehend.send(new DetectKeyPhrasesCommand({ LanguageCode: "en", Text: transcriptText }));

    const ans = await db.query("SELECT id FROM answers WHERE s3_key=$1 LIMIT 1", [key]);
    if (ans.rowCount === 0) continue;
    const answerId = ans.rows[0].id;

    await db.query("UPDATE answers SET transcript=$2 WHERE id=$1", [answerId, transcriptText]);
    await db.query(
      "INSERT INTO analysis(id, answer_id, sentiment_label, sentiment_scores, key_phrases, clarity_score, filler_words, readability) VALUES(uuid_generate_v4(),$1,$2,$3,$4,$5,$6,$7)",
      [
        answerId,
        senti.Sentiment ?? "NEUTRAL",
        senti.SentimentScore ?? {},
        (phrases.KeyPhrases ?? []).map(p => p.Text),
        70,
        { um: 0, like: 0 },
        { flesch: 60 }
      ]
    );
  }
};

// Allow local testing
if (process.env.LOCAL_INVOKE === "1") {
  (async () => {
    console.log("Local lambda dev mode. No event passed.");
  })();
}
