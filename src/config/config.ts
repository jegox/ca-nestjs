import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_NAME ?? 'backend_napi',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change_me_in_production',
    expiration: process.env.JWT_EXPIRATION ?? '24h',
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') ?? [],
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  },
}));
