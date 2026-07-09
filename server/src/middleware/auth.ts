import { NextFunction, Request, Response } from 'express';
import { verifySessionToken, JwtPayload } from '../utils/jwt';
import { AppError } from '../utils/AppError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

/** Requires a valid `Authorization: Bearer <jwt>` header issued by /auth/verify.
 *  Attaches the decoded payload (userId/uid/phone) to req.auth. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing bearer token');
  }
  const token = header.slice('Bearer '.length);
  try {
    req.auth = verifySessionToken(token);
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired session token');
  }
}
