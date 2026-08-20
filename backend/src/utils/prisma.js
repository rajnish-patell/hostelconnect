const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const isVercel = !!process.env.VERCEL;

if (isVercel) {
  const tmpDbPath = '/tmp/dev.db';
  if (!fs.existsSync(tmpDbPath)) {
    const bundledDbPath = path.resolve(__dirname, '../../prisma/dev.db');
    try {
      if (fs.existsSync(bundledDbPath)) {
        fs.copyFileSync(bundledDbPath, tmpDbPath);
        console.log('✅ Copied bundled SQLite DB to /tmp/dev.db');
      } else {
        console.log('⚠️ Bundled DB not found at', bundledDbPath);
      }
    } catch (err) {
      console.error('⚠️ Could not copy bundled DB to /tmp:', err.message);
    }
  }
  process.env.DATABASE_URL = `file:${tmpDbPath}`;
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.resolve(__dirname, '../../prisma/dev.db')}`;
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

module.exports = prisma;

