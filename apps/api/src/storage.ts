import crypto from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './config/env.js';
import { HttpError } from './http.js';

const allowedContentTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf'
]);

function storageConfig() {
  const required = [
    env.STORAGE_ENDPOINT,
    env.STORAGE_BUCKET,
    env.STORAGE_ACCESS_KEY_ID,
    env.STORAGE_SECRET_ACCESS_KEY,
    env.STORAGE_PUBLIC_BASE_URL
  ];
  if (required.some(v => !v)) {
    throw new HttpError(503, 'Proof file storage is not configured');
  }

  return {
    endpoint: env.STORAGE_ENDPOINT!,
    bucket: env.STORAGE_BUCKET!,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY!,
    publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL!.replace(/\/$/, '')
  };
}

function safeFilename(name: string) {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(-120);
  return cleaned || 'proof';
}

export async function createProofUpload(input: {
  userId: bigint;
  filename: string;
  contentType: string;
  contentLength: number;
}) {
  const cfg = storageConfig();

  if (!allowedContentTypes.has(input.contentType)) {
    throw new HttpError(400, 'Unsupported proof file type');
  }
  if (!Number.isInteger(input.contentLength) || input.contentLength <= 0 || input.contentLength > 10 * 1024 * 1024) {
    throw new HttpError(400, 'Proof file must be between 1 byte and 10 MB');
  }

  const key = [
    'proofs',
    input.userId.toString(),
    new Date().toISOString().slice(0, 10),
    crypto.randomUUID() + '-' + safeFilename(input.filename)
  ].join('/');

  const client = new S3Client({
    region: env.STORAGE_REGION,
    endpoint: cfg.endpoint,
    forcePathStyle: false,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey
    }
  });

  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    Metadata: {
      uploader: input.userId.toString(),
      purpose: 'task-proof'
    }
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicUrl = cfg.publicBaseUrl + '/' + key;

  return {
    uploadUrl,
    publicUrl,
    expiresInSeconds: 300,
    headers: {
      'Content-Type': input.contentType
    }
  };
}
