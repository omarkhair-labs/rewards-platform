import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function databaseErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  const code=(error as {code?:unknown}).code;
  return typeof code === 'string' ? code : null;
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', issues: error.issues });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  const dbCode=databaseErrorCode(error);
  if (dbCode === '23505') {
    return res.status(409).json({ error: 'Conflict' });
  }
  if (dbCode === '23503' || dbCode === '23514' || dbCode === '22P02') {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  if (
    error instanceof SyntaxError &&
    typeof error === 'object' &&
    (error as {type?:string}).type === 'entity.parse.failed'
  ) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
}
