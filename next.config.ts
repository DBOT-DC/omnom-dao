import type { NextConfig } from 'next';

const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
const siteUrl = rawUrl || vercelUrl;

const nextConfig: NextConfig = {
  ...(siteUrl && siteUrl.startsWith('http') ? { assetPrefix: siteUrl } : {}),
};

export default nextConfig;
