// Cross-platform script to copy frontend/dist to public/
import { cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, 'frontend', 'dist');
const dest = join(__dirname, 'public');

cpSync(src, dest, { recursive: true });
console.log('✓ Copied frontend/dist → public/');
