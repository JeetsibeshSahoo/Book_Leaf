import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ WARNING: DATABASE_URL is not defined in .env! Database connection will fail.');
}

const config = Object.freeze({
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bookleaf_db',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_dev_secret_never_use_in_prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    modelName: 'gemini-3.8-flash', // Exactly as recommended by Google API response
  },
});

export default config;