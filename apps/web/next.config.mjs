import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel handles its own output layout. Container builds still need the
  // standalone server copied by Dockerfile.web.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  outputFileTracingRoot: path.join(__dirname, '../..')
};

export default nextConfig;
