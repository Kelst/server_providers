import Joi from 'joi';

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

  // Billing API Configuration
  BILLING_API_URL: Joi.string().default('https://billing.intelekt.cv.ua:9443'),
  BILLING_API_KEY: Joi.string().required(),
  ADMIN_ACTION_IP: Joi.string().default('3166694701'),
  ADMIN_ACTION_AID: Joi.string().default('333'),

  // Userside API Configuration
  USERSIDE_API_URL: Joi.string().required(),
  USERSIDE_API_KEY: Joi.string().required(),
  USERSIDE_VLAN_KEY_OPENSVIT: Joi.string().default('134'),
  USERSIDE_VLAN_KEY_VELES: Joi.string().default('135'),
  USERSIDE_CACHE_TTL: Joi.number().default(30),

  // Telegram Bot API URLs
  TELEGRAM_API_OPTICOM: Joi.string().optional(),
  TELEGRAM_API_VELES: Joi.string().optional(),
  TELEGRAM_API_OPENSVIT: Joi.string().optional(),
  TELEGRAM_API_INTELEKT: Joi.string().optional(),

  // TurboSMS Configuration
  TURBOSMS_URL: Joi.string().default('https://api.turbosms.ua/message/send.json'),
  TURBOSMS_TOKEN_OPTICOM: Joi.string().optional(),
  TURBOSMS_TOKEN_VELES: Joi.string().optional(),
  TURBOSMS_TOKEN_OPENSVIT: Joi.string().optional(),
  TURBOSMS_TOKEN_INTELEKT: Joi.string().optional(),

  // SMS Senders
  SMS_SENDER_OPTICOM: Joi.string().default('OpticomPlus'),
  SMS_SENDER_VELES: Joi.string().default('VelesISP'),
  SMS_SENDER_OPENSVIT: Joi.string().default('Opensvit'),
  SMS_SENDER_INTELEKT: Joi.string().default('INTELEKT'),

  // Equipment Telnet Configuration
  TELNET_TIMEOUT: Joi.number().default(10000),
  TELNET_MAX_CONNECTIONS: Joi.number().default(10),
  TELNET_IDLE_TIMEOUT: Joi.number().default(60000),
  TELNET_LOGIN_PROMPT: Joi.string().default('login:'),
  TELNET_PASSWORD_PROMPT: Joi.string().default('Password:'),
  TELNET_SHELL_PROMPT: Joi.string().default('#'),
  TELNET_PORT: Joi.number().default(23),

  // Payment Systems Configuration
  // Privat24
  STATICTOKEN_PRIVAT24: Joi.string().optional(),
  STATICTOKEN_PRIVAT24_VELES: Joi.string().optional(),
  STATICTOKEN_PRIVAT24_OPENSVIT: Joi.string().optional(),
});
