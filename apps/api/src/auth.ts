import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { pool } from './db.js';
import { env } from './config/env.js';
import { HttpError } from './http.js';

export type AuthedRequest = Request & { auth?: { userId: bigint; role: string } };

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export function issueToken(userId: bigint, role: string) {
  return jwt.sign({ sub: userId.toString(), role }, env.JWT_SECRET, { expiresIn: '7d' });
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const raw = req.headers.authorization;
    if (!raw?.startsWith('Bearer ')) throw new HttpError(401, 'Unauthorized');
    const payload = jwt.verify(raw.slice(7), env.JWT_SECRET) as jwt.JwtPayload;
    const userId = BigInt(String(payload.sub));
    const result = await pool.query(
      `SELECT id, role, status FROM users WHERE id=$1`,
      [userId.toString()]
    );
    const user = result.rows[0];
    if (!user || user.status !== 'active') throw new HttpError(401, 'Account unavailable');
    req.auth = { userId, role: user.role };
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Unauthorized'));
  }
}

export function requireRole(...roles: string[]) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    await requireAuth(req, res, () => {
      if (!req.auth || !roles.includes(req.auth.role)) return next(new HttpError(403, 'Forbidden'));
      next();
    });
  };
}
