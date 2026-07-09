import { Request, Response } from 'express';
import { NoteModel } from '../models/Note';
import { noteSchema, noteUpdateSchema, noteListQuerySchema } from '../validators/noteValidators';
import { AppError } from '../utils/AppError';

export async function list(req: Request, res: Response) {
  const q = noteListQuerySchema.parse(req.query);
  const userId = req.auth!.userId;

  const filter: Record<string, any> = { userId, deletedAt: null };
  if (q.since) filter.updatedAt = { $gt: q.since };
  if (q.search) filter.$text = { $search: q.search };

  const notes = await NoteModel.find(filter).sort({ updatedAt: -1 }).skip(q.offset).limit(q.limit);
  res.json({ notes: notes.map(n => n.toJSON()), count: notes.length });
}

export async function getOne(req: Request, res: Response) {
  const note = await NoteModel.findOne({ _id: req.params.id, userId: req.auth!.userId, deletedAt: null });
  if (!note) throw new AppError(404, 'Note not found');
  res.json({ note: note.toJSON() });
}

export async function create(req: Request, res: Response) {
  const body = noteSchema.parse(req.body);
  const userId = req.auth!.userId;
  const { id, ...rest } = body;

  const note = await NoteModel.findOneAndUpdate(
    { _id: id, userId },
    { $set: { ...rest, userId }, $setOnInsert: { _id: id } },
    { new: true, upsert: true },
  );
  res.status(201).json({ note: note.toJSON() });
}

export async function update(req: Request, res: Response) {
  const body = noteUpdateSchema.parse(req.body);
  const note = await NoteModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.auth!.userId, deletedAt: null },
    { $set: body },
    { new: true },
  );
  if (!note) throw new AppError(404, 'Note not found');
  res.json({ note: note.toJSON() });
}

export async function remove(req: Request, res: Response) {
  const note = await NoteModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.auth!.userId },
    { $set: { deletedAt: new Date().toISOString() } },
    { new: true },
  );
  if (!note) throw new AppError(404, 'Note not found');
  res.status(204).send();
}
