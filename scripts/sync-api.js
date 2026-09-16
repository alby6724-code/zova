import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcApiDir = path.join(rootDir, 'api');
const targetApiDir = path.join(rootDir, 'client', 'api');
const clientDistDir = path.join(rootDir, 'client', 'dist');
const rootDistDir = path.join(rootDir, 'dist');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Synchronize root api/ to client/api/ so deployments with Root Directory "client" or root both succeed
console.log('🔄 Synchronizing serverless API routes between root and client...');
copyDirRecursive(srcApiDir, targetApiDir);
console.log('✅ Serverless API routes synchronized to client/api');

// 2. Ensure dist exists at root if client/dist exists
if (fs.existsSync(clientDistDir)) {
  copyDirRecursive(clientDistDir, rootDistDir);
  console.log('✅ Static build bundle copied to root dist/');
}
