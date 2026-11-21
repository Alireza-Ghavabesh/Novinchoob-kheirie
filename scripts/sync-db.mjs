import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const prismaDir = path.join(rootDir, 'prisma');
const schemaPath = path.join(prismaDir, 'schema.prisma');
const dbPath = path.join(prismaDir, 'charity.db');
const backupsDir = path.join(prismaDir, 'backups');
const hashPath = path.join(prismaDir, '.schema-sync.hash');
const generatedClientIndex = path.join(rootDir, 'node_modules', '.prisma', 'client', 'index.js');

const generateOnly = process.argv.includes('--generate-only');

function runPrisma(args) {
  const isWin = process.platform === 'win32';
  const localBin = path.join(rootDir, 'node_modules', '.bin', isWin ? 'prisma.cmd' : 'prisma');
  const cmd = fs.existsSync(localBin) ? localBin : isWin ? 'npx.cmd' : 'npx';
  const finalArgs = fs.existsSync(localBin) ? args : ['prisma', ...args];
  return spawnSync(cmd, finalArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });
}

if (!fs.existsSync(schemaPath)) {
  process.exit(0);
}

const schemaHash = crypto
  .createHash('sha256')
  .update(fs.readFileSync(schemaPath))
  .digest('hex');

const savedHash = fs.existsSync(hashPath) ? fs.readFileSync(hashPath, 'utf8').trim() : '';
const hasClient = fs.existsSync(generatedClientIndex);
const hasDb = fs.existsSync(dbPath);
const schemaChanged = savedHash !== schemaHash;

if (generateOnly) {
  if (!hasClient || schemaChanged) {
    console.log('[DB Sync] Regenerating Prisma Client...');
    const genRes = runPrisma(['generate']);
    if (genRes.status !== 0) process.exit(genRes.status || 1);
  }
  process.exit(0);
}

if (!hasClient || schemaChanged) {
  console.log('[DB Sync] Syncing Prisma Client with latest schema...');
  const genRes = runPrisma(['generate']);
  if (genRes.status !== 0) process.exit(genRes.status || 1);
}

if (!hasDb || schemaChanged) {
  if (hasDb) {
    try {
      fs.mkdirSync(backupsDir, { recursive: true });
      const backupFile = path.join(backupsDir, 'charity-before-sync.db');
      fs.copyFileSync(dbPath, backupFile);
      console.log('[DB Sync] Existing database backed up safely to prisma/backups/charity-before-sync.db');
    } catch (err) {
      console.warn('[DB Sync] Could not create pre-sync backup:', err?.message || err);
    }
  }

  console.log('[DB Sync] Applying non-destructive schema updates (existing data will be preserved)...');
  // Strictly non-destructive: NEVER uses --force-reset or --accept-data-loss
  const pushRes = runPrisma(['db', 'push', '--skip-generate']);
  if (pushRes.status !== 0) {
    console.warn(
      '[DB Sync] prisma db push exited with warnings; continuing startup so server.ts additive column migration can preserve existing data.'
    );
  } else {
    try {
      fs.writeFileSync(hashPath, schemaHash, 'utf8');
    } catch {
      // Non-fatal
    }
  }
}
