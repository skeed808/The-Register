import type { NextConfig } from 'next';

// PREVIEW_STATIC=1 builds a static export of the demonstration case (no API routes),
// used for the shareable preview. The normal build is the full server app.
const preview = process.env.PREVIEW_STATIC === '1';

const config: NextConfig = {
  ...(preview ? { output: 'export', trailingSlash: true, images: { unoptimized: true } } : {}),
  env: { NEXT_PUBLIC_PREVIEW: preview ? '1' : '' },
};

export default config;
