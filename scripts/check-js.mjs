import {readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
async function check(directory){for(const item of await readdir(directory,{withFileTypes:true})){const file=join(directory,item.name);if(item.isDirectory())await check(file);else if(file.endsWith('.js'))execFileSync(process.execPath,['--check',file],{stdio:'inherit'});}}
await check('dist');
await import('./validate-site.mjs');
