#!/usr/bin/env node
/**
 * ForAntigravity Enterprise Admin Provisioning CLI (Server-scoped)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let bcrypt = null;
async function loadBcrypt() {
  const possiblePaths = [
    'bcryptjs',
    path.resolve(__dirname, '../node_modules/bcryptjs'),
    path.resolve(__dirname, '../../node_modules/bcryptjs'),
  ];

  for (const p of possiblePaths) {
    try {
      const mod = await import(p);
      bcrypt = mod.default || mod;
      return;
    } catch {
      // continue
    }
  }

  bcrypt = {
    hashSync: (secret, saltRounds = 12) => {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(secret, salt, 100000, 64, 'sha512').toString('hex');
      return `$pbkdf2-sha512$rounds=100000$${salt}$${hash}`;
    },
    compareSync: () => false,
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      parsed[key] = value;
      if (value !== 'true') i++;
    }
  }
  return parsed;
}

async function main() {
  const args = parseArgs();
  await loadBcrypt();

  const email = args.email || process.env.ADMIN_EMAIL || 'admin@olx.com';
  const rawPassword = args.password || process.env.INITIAL_ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  const name = args.name || 'System Administrator';
  const role = (args.role || 'SUPER_ADMIN').toUpperCase();

  console.log('\n================================================================');
  console.log('🛡️  ForAntigravity — Production Admin Provisioning Utility');
  console.log('================================================================\n');

  if (!rawPassword) {
    console.error('❌ Error: Password is required. Pass --password <secret> or export INITIAL_ADMIN_SECRET');
    process.exit(1);
  }

  if (rawPassword.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const saltRounds = 12;
  const passwordHash = bcrypt.hashSync(rawPassword, saltRounds);

  console.log(`✅ Admin Account Prepared for ${email} (${role}):`);
  console.log(`   Hash: ${passwordHash}\n`);
  console.log(`INITIAL_ADMIN_PASSWORD_HASH='${passwordHash}'\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
