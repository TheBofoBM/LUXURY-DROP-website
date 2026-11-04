import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { products } from '../dist/catalog.js';

const root = new URL('../dist/', import.meta.url);
// Verify both a project subdirectory (GitHub Pages) and a root deployment
// (Cloudflare Pages). The hostname is irrelevant to relative asset resolution.
const bases = [new URL('https://thebofobm.github.io/LUXURY-DROP-website/'),new URL('https://static-host.example/')];
const html = await readFile(new URL('index.html', root), 'utf8');
const cssFiles=(await readdir(root)).filter(file=>file.endsWith('.css'));
const css = (await Promise.all(cssFiles.map(file=>readFile(new URL(file,root),'utf8')))).join('\n');
const jsFiles=(await readdir(root)).filter(file=>file.endsWith('.js'));
const app = (await Promise.all(jsFiles.map(file=>readFile(new URL(file,root),'utf8')))).join('\n');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
refs.push(...[...css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)].map(m => m[1]));
refs.push(...[...app.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]));
refs.push(...[...app.matchAll(/import\(['"]([^'"]+)['"]\)/g)].map(m => m[1]));
refs.push(...products.map(p => `assets/${p.image}`));
refs.push('.nojekyll');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const checked = new Set();
for (const ref of refs) {
  if (/^(https?:|data:|mailto:|tel:)/.test(ref)) continue;
  if (ref.startsWith('#')) {
    assert(ref === '#' || ids.has(ref.slice(1)), `La sección ${ref} no existe`);
    continue;
  }
  assert(!ref.startsWith('/'), `Usar ruta relativa para Pages: ${ref}`);
  for (const base of bases) {
    const hosted = new URL(ref, base);
    assert(hosted.pathname.startsWith(base.pathname), `La ruta sale de la publicación ${base.pathname}: ${ref}`);
  }
  const file = new URL(ref.split(/[?#]/)[0], root);
  assert(file.href.startsWith(root.href), `La ruta sale de dist/: ${ref}`);
  assert((await stat(fileURLToPath(file))).isFile(), `Falta el archivo ${ref}`);
  checked.add(ref);
}
assert(!/https?:\/\/(localhost|127\.0\.0\.1)(?=[:/])/i.test(html+css+app), 'El sitio no debe depender de localhost');
console.log(`Sitio estático válido: ${checked.size} recursos e importaciones verificados en raíz y en /LUXURY-DROP-website/`);
