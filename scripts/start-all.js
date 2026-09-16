#!/usr/bin/env node
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

const isWindows = process.platform === 'win32';

console.log('\x1b[35m====================================================\x1b[0m');
console.log('\x1b[1m\x1b[36m🚀 Starting OLX Marketplace (Server + Client)...\x1b[0m');
console.log('\x1b[35m----------------------------------------------------\x1b[0m');
console.log('\x1b[32m  ➜ Frontend UI:\x1b[0m    http://localhost:3000');
console.log('\x1b[34m  ➜ Backend API:\x1b[0m    http://localhost:5000/api');
console.log('\x1b[33m  ➜ Health Check:\x1b[0m   http://localhost:5000/api/system/health');
console.log('\x1b[35m====================================================\x1b[0m\n');

const children = [];

function killProcess(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (isWindows) {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-proc.pid, 'SIGTERM');
    }
  } catch {
    try {
      proc.kill('SIGTERM');
    } catch {}
  }
}

let isCleaningUp = false;
function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log('\n\x1b[33mGracefully shutting down server and client...\x1b[0m');
  for (const child of children) {
    killProcess(child);
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
  for (const child of children) {
    killProcess(child);
  }
});

function startServer() {
  const tsxCli = path.join(serverDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  let proc;
  if (fs.existsSync(tsxCli)) {
    proc = spawn(process.execPath, [tsxCli, 'watch', '--clear-screen=false', 'src/server.ts'], {
      cwd: serverDir,
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  } else {
    proc = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'dev'], {
      cwd: serverDir,
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: isWindows,
    });
  }
  children.push(proc);
  return proc;
}

function startClient() {
  const rootViteCli = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
  const clientViteCli = path.join(clientDir, 'node_modules', 'vite', 'bin', 'vite.js');
  let proc;
  if (fs.existsSync(rootViteCli)) {
    proc = spawn(process.execPath, [rootViteCli], {
      cwd: rootDir,
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  } else if (fs.existsSync(clientViteCli)) {
    proc = spawn(process.execPath, [clientViteCli], {
      cwd: clientDir,
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  } else {
    proc = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'dev'], {
      cwd: rootDir,
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: isWindows,
    });
  }
  children.push(proc);
  return proc;
}

startServer();
startClient();
