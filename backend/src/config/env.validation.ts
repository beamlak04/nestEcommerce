import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production').required(),

  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),

  JWT_ACCESS_TTL: Joi.string().required(),
  JWT_REFRESH_TTL: Joi.string().required(),
});