import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  PORT: Joi.number().default(3000),

  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),

  // JWT
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRATION: Joi.string().default('24h'),

  // CORS
  CORS_ORIGINS: Joi.string().required(),

  // Rate limiting
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // AI
  OPENAI_API_KEY: Joi.string().allow('').default(''),
});
