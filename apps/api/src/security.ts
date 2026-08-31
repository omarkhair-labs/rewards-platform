import { HttpError } from './http.js';

export function assertHttpUrl(value: string, label = 'URL') {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(400, `Invalid ${label}`);
  }
  if (!['http:','https:'].includes(parsed.protocol)) {
    throw new HttpError(400, `${label} must use http or https`);
  }
  return parsed.toString();
}

export function parsePositiveId(value: unknown, label = 'ID') {
  const raw = String(value ?? '');
  if (!/^\d+$/.test(raw)) throw new HttpError(400, `Invalid ${label}`);
  const id = BigInt(raw);
  if (id <= 0n) throw new HttpError(400, `Invalid ${label}`);
  return id;
}
