import { Request, Response } from 'express';
import { z } from 'zod';
import { createUploadUrl } from '../services/s3Service';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

const uploadUrlSchema = z.object({
  key: z.string().min(1).max(400),                 // destination path, e.g. profiles/<uid>/avatar.jpg
  contentType: z.string().min(1).max(120).optional(),
});

/** POST /api/media/upload-url  (auth required)
 *  Returns a presigned S3 PUT URL the client uploads the file to directly,
 *  plus the stable public URL to store on the record. Replaces Firebase Storage. */
export async function getUploadUrl(req: Request, res: Response) {
  if (!env.s3Bucket) throw new AppError(500, 'S3 storage is not configured on the server.');
  const { key, contentType } = uploadUrlSchema.parse(req.body);

  // Namespace every upload under the signed-in user so keys are owned + unique.
  const cleanKey = key.replace(/^\/+/, '');
  const finalKey = cleanKey.startsWith(`${req.auth!.userId}/`) ? cleanKey : `${req.auth!.userId}/${cleanKey}`;

  const out = await createUploadUrl(finalKey, contentType ?? 'application/octet-stream');
  res.json(out);
}
