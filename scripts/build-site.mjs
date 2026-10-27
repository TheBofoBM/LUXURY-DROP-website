import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
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
console.log(config.supabaseUrl?'Autenticación configurada.':'Vista previa: registro real desactivado hasta configurar Supabase.');
await import('./validate-site.mjs');
