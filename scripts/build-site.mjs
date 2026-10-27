import {build} from 'esbuild';
import {writeFile,readFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {authConfig} from '../dist/config.js';
const config={...authConfig};
if(process.env.SUPABASE_URL||process.env.SUPABASE_PUBLISHABLE_KEY){
  config.supabaseUrl=process.env.SUPABASE_URL||'';
  config.supabasePublishableKey=process.env.SUPABASE_PUBLISHABLE_KEY||'';
  config.googleEnabled=process.env.SUPABASE_GOOGLE_ENABLED==='true';
}
if(Boolean(config.supabaseUrl)!==Boolean(config.supabasePublishableKey))throw new Error('Configurar URL y clave publicable juntas, o dejar ambas vacías para vista previa.');
if(config.supabaseUrl){
  if(new URL(config.supabaseUrl).protocol!=='https:')throw new Error('La URL de autenticación debe usar HTTPS.');
  const key=config.supabasePublishableKey;
  if(key.startsWith('sb_secret_'))throw new Error('El frontend solo acepta una clave publicable.');
  if(!key.startsWith('sb_publishable_')){let payload;try{payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());}catch{}if(payload?.role!=='anon')throw new Error('Usa una clave publicable o anon. Nunca service_role.');}
}
await build({stdin:{contents:"export { createClient } from '@supabase/supabase-js';",resolveDir:process.cwd(),sourcefile:'supabase-client.js'},outfile:'dist/vendor/supabase.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof'});
await writeFile(new URL('../dist/config.js',import.meta.url),'// Public client configuration. Generated for deployment.\nexport const authConfig = '+JSON.stringify(config,null,2)+';\n');
// Content hashes prevent a fresh HTML page from loading stale modules/styles
// out of GitHub Pages or browser caches after an update.
const siteRoot=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const output=resolve(siteRoot,'assets','build');
if(!output.startsWith(siteRoot+sep)||output!==resolve(siteRoot,'assets','build'))throw new Error('Invalid generated output directory.');
await rm(output,{recursive:true,force:true});
const bundled=await build({entryPoints:{app:'dist/app.js',styles:'dist/site.css'},outdir:output,bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',entryNames:'[name]-[hash]',chunkNames:'chunk-[hash]',minify:true,metafile:true,legalComments:'eof'});
const files=Object.entries(bundled.metafile.outputs);
const script=files.find(([,meta])=>meta.entryPoint==='dist/app.js')?.[0];
const stylesheet=files.find(([,meta])=>meta.entryPoint==='dist/site.css')?.[0];
if(!script||!stylesheet)throw new Error('Missing versioned site entrypoints.');
const relative=file=>file.replaceAll('\\','/').split('/dist/').at(-1).replace(/^dist\//,'');
const indexUrl=new URL('../dist/index.html',import.meta.url);
let html=await readFile(indexUrl,'utf8');
let replacedStyle=false;
html=html.replace(/<link rel="stylesheet" href="[^"]+">/g,()=>{if(replacedStyle)return '';replacedStyle=true;return `<link rel="stylesheet" href="${relative(stylesheet)}">`;});
if(!replacedStyle)html=html.replace('</head>',`  <link rel="stylesheet" href="${relative(stylesheet)}">\n</head>`);
html=html.replace(/<script src="[^"]+" type="module"><\/script>/,`<script src="${relative(script)}" type="module"></script>`);
await writeFile(indexUrl,html);
console.log(config.supabaseUrl?'Autenticación configurada.':'Vista previa: registro real desactivado hasta configurar Supabase.');
await import('./validate-site.mjs');
