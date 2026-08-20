const path = require('path');
const fs = require('fs');

let dbReady = false;
let dbInitPromise = null;

/**
 * Initialize the database for Vercel serverless environment.
 * Uses /tmp/dev.db which is writable on Vercel lambda instances.
 * Creates tables & seeds demo data if DB is uninitialized.
 */
async function initDatabase() {
  if (dbReady) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = _doInit();
  return dbInitPromise;
}

async function _doInit() {
  try {
    const prisma = require('./prisma');
    const isVercel = !!process.env.VERCEL;

    console.log(`⚡ Checking database state (Vercel: ${isVercel})...`);

    // First check if DB already has records
    let needsSeeding = false;
    try {
      const adminCount = await prisma.superAdmin.count();
      if (adminCount === 0) {
        needsSeeding = true;
      }
    } catch (err) {
      // Table doesn't exist yet
      needsSeeding = true;
    }

    if (needsSeeding) {
      console.log('⚡ Initializing database schema & seed data...');

      // Read and execute migration SQL to create tables
      const migrationPath = path.resolve(__dirname, '../../prisma/migrations/20260811170406_init/migration.sql');
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        const statements = migrationSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
          try {
            await prisma.$executeRawUnsafe(stmt);
          } catch (err) {
            // Table might already exist — ignore
          }
        }

        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE "call_sessions" ADD COLUMN "meet_link" TEXT`);
        } catch (err) {}

        console.log('✅ Database tables created');
      }

      // Seed database
      try {
        const { seedDatabase } = require('../../prisma/seed');
        await seedDatabase(prisma);
        console.log('✅ Database seeded with demo accounts');
      } catch (err) {
        console.error('⚠️ Seed error:', err.message);
      }
    }

    dbReady = true;
    console.log('🚀 Database initialization complete');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    dbReady = true;
  }
}

/**
 * Express middleware that ensures DB is initialized before handling any request
 */
function ensureDbReady(req, res, next) {
  if (dbReady) return next();

  initDatabase()
    .then(() => next())
    .catch((err) => {
      console.error('DB init error in middleware:', err.message);
      next();
    });
}

module.exports = { initDatabase, ensureDbReady };
