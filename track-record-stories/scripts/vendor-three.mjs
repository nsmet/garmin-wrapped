// Rebuilds public/vendor/three-dots.mjs: a minified, tree-shaken subset of Three.js
// for the recap's dot layer. public/ is served without a bundler, so the browser
// imports this file directly. Run after changing the three devDependency.
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
const {version}=JSON.parse(readFileSync('node_modules/three/package.json','utf8'));
await build({
 stdin:{contents:"export {WebGLRenderer,Scene,OrthographicCamera,BufferGeometry,BufferAttribute,Points,ShaderMaterial,CustomBlending,NormalBlending,AddEquation,OneFactor,ZeroFactor,SrcAlphaFactor,OneMinusSrcAlphaFactor,Color} from 'three';",resolveDir:process.cwd(),loader:'js'},
 bundle:true,format:'esm',minify:true,target:'es2020',legalComments:'none',
 banner:{js:`/* Three.js ${version} subset · MIT License · Copyright 2010-2026 Three.js Authors · https://threejs.org */`},
 outfile:'public/vendor/three-dots.mjs'
});
console.log('Wrote public/vendor/three-dots.mjs from three',version);
