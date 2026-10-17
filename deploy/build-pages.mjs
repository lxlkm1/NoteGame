import { cpSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, '_site');
const publicFiles = ['index.html', 'style.css', 'src'];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const relative of publicFiles) {
  const source = join(root, relative);
  const target = join(output, relative);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: statSync(source).isDirectory() });
}
console.log(`GitHub Pages site prepared: ${output}`);
