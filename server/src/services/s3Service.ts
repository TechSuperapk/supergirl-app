import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

// Uses the EC2 instance role's credentials by default (no keys in code).
const s3 = new S3Client({ region: env.awsRegion });

/** Public URL where an object with this key will be served from. */
export function publicUrlFor(key: string): string {
  if (env.s3PublicBaseUrl) return `${env.s3PublicBaseUrl.replace(/\/+$/, '')}/${key}`;
  return `https://${env.s3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
}

/** Presigned PUT URL the client uploads to directly, plus the final read URL. */
export async function createUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; fileUrl: string }> {
  const cmd = new PutObjectCommand({ Bucket: env.s3Bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5-min window
  return { uploadUrl, fileUrl: publicUrlFor(key) };
}
