import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = process.cwd();
const distDir = resolve(rootDir, 'dist');
const assets = [
  'index.html',
  'app.js',
  'db.js',
  'style.css',
  'manifest.json',
  'sw.js',
  'icons'
];

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

for (const asset of assets) {
  const source = resolve(rootDir, asset);
  const target = resolve(distDir, asset);

  if (!existsSync(source)) {
    throw new Error(`Missing expected asset: ${asset}`);
  }

  cpSync(source, target, { recursive: true });
}

console.log(`Copied ${assets.length} app assets into ${distDir}`);
