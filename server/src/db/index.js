import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

// Initialize PostgreSQL connection pool
const isCloudDb = config.databaseUrl.includes('neon.tech') || 
                  config.databaseUrl.includes('supabase') || 
                  config.databaseUrl.includes('sslmode=require') || 
                  config.nodeEnv === 'production';
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
});


export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development') {
      // Log slow queries or general debug info in dev mode
      console.log(`[SQL] executed query: { rows: ${res.rowCount}, duration: ${duration}ms }`);
    }
    return res;
  } catch (error) {
    console.error(`[SQL Error] Query failed: "${text.trim().substring(0, 100)}..."`);
    console.error(`[SQL Error] Message:`, error.message);
    throw error;
  }
};

/**
 * Dedicated client helper for multi-query atomic transactions (BEGIN -> COMMIT/ROLLBACK)
 */
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Helper to test the database connection at server startup
 */
export const testConnection = async () => {
  try {
    const res = await query('SELECT NOW() AS current_time, current_database() AS db_name');
    console.log(`✅ PostgreSQL Connected successfully to: "${res.rows[0].db_name}" at ${res.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error.message);
    return false;
  }
};

export default {
  query,
  getClient,
  testConnection,
  pool,
};