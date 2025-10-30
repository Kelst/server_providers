export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  abills: {
    host: process.env.ABILLS_DB_HOST,
    user: process.env.ABILLS_DB_USER,
    password: process.env.ABILLS_DB_PASSWORD,
    database: process.env.ABILLS_DB_NAME,
    decodeKey: process.env.ABILLS_DB_DECODE_KEY,
  },
  billing: {
    apiUrl: process.env.BILLING_API_URL || 'https://billing.intelekt.cv.ua:9443',
    apiKey: process.env.BILLING_API_KEY,
    adminActionIp: process.env.ADMIN_ACTION_IP || '3166694701',
    adminActionAid: process.env.ADMIN_ACTION_AID || '333',
  },
  userside: {
    apiUrl: process.env.USERSIDE_API_URL,
    apiKey: process.env.USERSIDE_API_KEY,
  },
  notifications: {
    telegram: {
      opticom: process.env.TELEGRAM_API_OPTICOM,
      veles: process.env.TELEGRAM_API_VELES,
      opensvit: process.env.TELEGRAM_API_OPENSVIT,
      intelekt: process.env.TELEGRAM_API_INTELEKT,
    },
    sms: {
      url: process.env.TURBOSMS_URL || 'https://api.turbosms.ua/message/send.json',
      tokens: {
        opticom: process.env.TURBOSMS_TOKEN_OPTICOM,
        veles: process.env.TURBOSMS_TOKEN_VELES,
        opensvit: process.env.TURBOSMS_TOKEN_OPENSVIT,
        intelekt: process.env.TURBOSMS_TOKEN_INTELEKT,
      },
      senders: {
        opticom: process.env.SMS_SENDER_OPTICOM || 'OpticomPlus',
        veles: process.env.SMS_SENDER_VELES || 'VelesISP',
        opensvit: process.env.SMS_SENDER_OPENSVIT || 'Opensvit',
        intelekt: process.env.SMS_SENDER_INTELEKT || 'INTELEKT',
      },
    },
  },
  payments: {
    privat24: {
      staticTokenIntelekt: process.env.STATICTOKEN_PRIVAT24,
      staticTokenVeles: process.env.STATICTOKEN_PRIVAT24_VELES,
      staticTokenOpensvit: process.env.STATICTOKEN_PRIVAT24_OPENSVIT,
    },
  },
});
