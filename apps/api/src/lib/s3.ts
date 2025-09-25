import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function presignPut(key: string, contentType: string, expiresSec = 300) {
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: contentType
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresSec });
}
