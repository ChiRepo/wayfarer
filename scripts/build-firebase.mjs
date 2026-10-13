import { build } from 'esbuild';
await build({entryPoints:['src/firebase-entry.js'],bundle:true,minify:true,format:'esm',platform:'browser',target:['es2020'],outfile:'dist/vendor/firebase.js',legalComments:'linked'});
