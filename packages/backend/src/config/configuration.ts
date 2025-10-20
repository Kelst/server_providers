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
});
