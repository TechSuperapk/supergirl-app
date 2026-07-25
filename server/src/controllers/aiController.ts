/**
 * aiController — thin request/response layer over the AI services. All routes
 * are JWT-protected (see aiRoutes) so only signed-in users can spend AI credits.
 */
import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { detectSchema, removeBgSchema, suggestSchema, ootdSchema } from '../validators/aiValidators';
import { detectClothing, suggestOutfits, generateOutfitOfTheDay } from '../services/openaiService';
import { removeBackground } from '../services/removeBgService';

function parse<T>(schema: { safeParse: (v: unknown) => any }, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) throw new AppError(422, r.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data as T;
}

// POST /api/ai/detect  { imageUrl } → DetectedClothing
export async function detect(req: Request, res: Response) {
  const { imageUrl } = parse<{ imageUrl: string }>(detectSchema, req.body);
  const result = await detectClothing(imageUrl);
  res.json(result);
}

// POST /api/ai/remove-bg  { imageUrl } → { pngDataUrl }
export async function removeBg(req: Request, res: Response) {
  const { imageUrl } = parse<{ imageUrl: string }>(removeBgSchema, req.body);
  const pngDataUrl = await removeBackground(imageUrl);
  res.json({ pngDataUrl });
}

// POST /api/ai/suggest  { wardrobe, occasion?, weather?, ... } → { outfits }
export async function suggest(req: Request, res: Response) {
  const input = parse<any>(suggestSchema, req.body);
  const outfits = await suggestOutfits(input.wardrobe, input);
  res.json({ outfits });
}

// POST /api/ai/ootd  { wardrobe, ... } → { outfit }
export async function ootd(req: Request, res: Response) {
  const input = parse<any>(ootdSchema, req.body);
  const outfit = await generateOutfitOfTheDay(input.wardrobe, input);
  res.json({ outfit });
}
