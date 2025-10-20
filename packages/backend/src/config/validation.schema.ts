import * as Joi from 'joi';

export default Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  CORS_ORIGIN: Joi.string().default('*'),
  ABILLS_DB_HOST: Joi.string().required(),
  ABILLS_DB_USER: Joi.string().required(),
  ABILLS_DB_PASSWORD: Joi.string().required(),
  ABILLS_DB_NAME: Joi.string().required(),
  ABILLS_DB_DECODE_KEY: Joi.string().required(),
});
