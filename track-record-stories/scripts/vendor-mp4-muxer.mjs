// Rebuilds public/vendor/mp4-muxer.mjs: the MP4 muxer the share videos use to wrap the browser's
// own H.264 encoder output (WebCodecs). public/ is served without a bundler, so the browser imports
// this file directly, and only when someone chooses to share a video. Run after changing mp4-muxer.
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
const {version}=JSON.parse(readFileSync('node_modules/mp4-muxer/package.json','utf8'));
await build({
 stdin:{contents:"export {Muxer,ArrayBufferTarget} from 'mp4-muxer';",resolveDir:process.cwd(),loader:'js'},
 bundle:true,format:'esm',minify:true,target:'es2020',legalComments:'none',
 banner:{js:`/* mp4-muxer ${version} · MIT License · Copyright (c) 2023 Vanilagy · https://github.com/Vanilagy/mp4-muxer */`},
 outfile:'public/vendor/mp4-muxer.mjs'
});
console.log('Wrote public/vendor/mp4-muxer.mjs from mp4-muxer',version);
