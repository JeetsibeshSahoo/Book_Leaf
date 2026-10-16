import app from './app.js';
import config from './config/index.js';
import db from './db/index.js';

const startServer = async () => {
  console.log('\n===============================================');
  console.log('📚 BookLeaf Author Support Portal - Backend API');
  console.log('===============================================');

  // 1. Verify PostgreSQL Database Connection before binding to port
  console.log('⏳ Connecting to PostgreSQL database...');
  const isDbConnected = await db.testConnection();

  if (!isDbConnected) {
    console.error('❌ Could not connect to PostgreSQL. Please check your DATABASE_URL in .env.');
    process.exit(1);
  }

  // 2. Start HTTP Listener
  const server = app.listen(config.port, () => {
    console.log(`\n🚀 Server is running in [${config.nodeEnv.toUpperCase()}] mode`);
    console.log(`🔗 Local API URL:    http://localhost:${config.port}`);
    console.log(`🩺 Health Check:     http://localhost:${config.port}/health`);
    console.log(`👥 Sample Logins:    http://localhost:${config.port}/api/auth/sample-users`);
    console.log('===============================================\n');
  });

  // 3. Graceful Shutdown Handlers (handles Ctrl+C or Docker/Kubernetes container stops)
  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new incoming requests
    server.close(async () => {
      console.log('🔌 HTTP server closed.');
      try {
        // Drain and close PostgreSQL connection pool
        await db.pool.end();
        console.log('🗄️  PostgreSQL pool drained and closed.');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds if connections refuse to close
    setTimeout(() => {
      console.error('⚠️ Forcefully terminating process after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer();
