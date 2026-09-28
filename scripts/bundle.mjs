import { build } from 'esbuild';
await build({entryPoints:['src/index.ts'],bundle:true,format:'iife',globalName:'EventLanes',target:'es2022',outfile:'dist/event-lanes.global.js',sourcemap:true,minify:true});
