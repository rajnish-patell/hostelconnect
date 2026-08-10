export interface AppEnvironment {
  nodeEnv: string;
  port: number;
  corsOrigin: string[];
  jwtSecret: string;
  jwtExpiresIn: string;
  throttleTtl: number;
  throttleLimit: number;
  databaseUrl?: string;
  livekitApiKey?: string;
  livekitApiSecret?: string;
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getAppConfig(env: NodeJS.ProcessEnv = process.env): AppEnvironment {
  const nodeEnv = (env.NODE_ENV || 'development').toLowerCase();
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://web-dashboard-pi-swart.vercel.app',
  ];
  const corsOrigin = toStringArray(env.CORS_ORIGIN);

  return {
    nodeEnv,
    port: toNumber(env.PORT, 4000),
    corsOrigin: corsOrigin.length > 0 ? corsOrigin : defaultOrigins,
    jwtSecret: env.JWT_SECRET?.trim() || (nodeEnv === 'production' ? '' : 'dev-secret-key-12345'),
    jwtExpiresIn: env.JWT_EXPIRES_IN?.trim() || '7d',
    throttleTtl: toNumber(env.THROTTLE_TTL, 60000),
    throttleLimit: toNumber(env.THROTTLE_LIMIT, 120),
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
    livekitApiKey: env.LIVEKIT_API_KEY?.trim() || undefined,
    livekitApiSecret: env.LIVEKIT_API_SECRET?.trim() || undefined,
  };
}

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): AppEnvironment {
  const config = getAppConfig(env);

  if (config.nodeEnv !== 'production') {
    return config;
  }

  const requiredInProd = ['DATABASE_URL', 'JWT_SECRET', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'];
  const missing = requiredInProd.filter((name) => !env[name] || env[name]?.trim() === '');

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  return config;
}
