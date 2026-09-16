import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

/**
 * ForAntigravity Enterprise Admin Provisioning CLI
 * Usage:
 *   npx tsx scripts/create-admin.ts --email admin@olx.com --password "SecureAdminPass2026!" [--name "Super Admin"] [--role SUPER_ADMIN]
 */

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

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
  const email = args.email || process.env.ADMIN_EMAIL || 'admin@olx.com';
  const rawPassword = args.password || process.env.INITIAL_ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  const name = args.name || 'System Administrator';
  const role = (args.role || 'SUPER_ADMIN').toUpperCase();

  console.log('\n========================================================');
  console.log('🛡️  ForAntigravity Admin Provisioning & Hash Generator');
  console.log('========================================================\n');

  if (!rawPassword) {
    console.error('❌ Error: Password must be supplied via --password <secret> or INITIAL_ADMIN_SECRET environment variable.');
    console.log('\nExample:');
    console.log('  npx tsx scripts/create-admin.ts --email admin@domain.com --password "MySecretPass!2026"\n');
    process.exit(1);
  }

  if (rawPassword.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long for enterprise security compliance.');
    process.exit(1);
  }

  console.log(`Computing bcrypt hash (12 salt rounds) for account: ${email}...`);
  const saltRounds = 12;
  const passwordHash = bcrypt.hashSync(rawPassword, saltRounds);

  console.log('\n✅ Admin Credentials Successfully Prepared:');
  console.log(`   Email:        ${email}`);
  console.log(`   Name:         ${name}`);
  console.log(`   Role:         ${role}`);
  console.log(`   Salt Rounds:  ${saltRounds}`);
  console.log(`   Bcrypt Hash:  ${passwordHash}`);

  console.log('\n📝 Instructions for Production / Kubernetes / Docker deployment:');
  console.log('   Add the following line to your .env or Kubernetes Secret:');
  console.log(`   INITIAL_ADMIN_PASSWORD_HASH='${passwordHash}'\n`);
  console.log('========================================================\n');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
