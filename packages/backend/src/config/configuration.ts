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
    vlanMapping: {
      opensvitKey: process.env.USERSIDE_VLAN_KEY_OPENSVIT || '134',
      velesKey: process.env.USERSIDE_VLAN_KEY_VELES || '135',
    },
    cacheConfig: {
      customerDataTtl: parseInt(process.env.USERSIDE_CACHE_TTL, 10) || 30, // seconds
    },
  },
  equipment: {
    snmp: {
      timeout: parseInt(process.env.SNMP_TIMEOUT, 10) || 5000, // milliseconds
      retries: parseInt(process.env.SNMP_RETRIES, 10) || 3, // number of retries
    },
    telnet: {
      timeout: parseInt(process.env.TELNET_TIMEOUT, 10) || 10000, // milliseconds
      maxConnections: parseInt(process.env.TELNET_MAX_CONNECTIONS, 10) || 10,
      idleTimeout: parseInt(process.env.TELNET_IDLE_TIMEOUT, 10) || 60000, // milliseconds
      loginPrompt: process.env.TELNET_LOGIN_PROMPT || 'Username:',
      passwordPrompt: process.env.TELNET_PASSWORD_PROMPT || 'Password:',
      shellPrompt: process.env.TELNET_SHELL_PROMPT || /[>#]\s*$/, // Match both > and # prompts
      port: parseInt(process.env.TELNET_PORT, 10) || 23,
    },
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
