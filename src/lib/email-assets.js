export function getPublicEmailAssetOrigin(requestOrigin) {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  const origin = String(configuredOrigin || requestOrigin || 'https://edubreezy.com').trim();

  if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
    return 'https://edubreezy.com';
  }

  return origin.replace(/\/$/, '');
}
