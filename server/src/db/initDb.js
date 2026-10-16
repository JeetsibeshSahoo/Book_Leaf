import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  console.log('🚀 Initializing BookLeaf PostgreSQL Schema...');
  try {
    // Read the schema.sql file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Execute the complete schema script in PostgreSQL
    await db.query(schemaSql);

    console.log('✅ All PostgreSQL tables, constraints, and indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    process.exit(1);
  }
}

initializeDatabase();