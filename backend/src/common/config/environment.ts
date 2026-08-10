export function validateEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const requiredInProd = ['DATABASE_URL', 'JWT_SECRET', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'];

  if (nodeEnv !== 'production') {
    return;
  }

  const missing = requiredInProd.filter((name) => !process.env[name] || process.env[name]?.trim() === '');

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}
