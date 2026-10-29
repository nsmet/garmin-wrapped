// Three.js dot layer: draws a dot buffer (dot-card.mjs) as GPU point sprites with the same
// radial falloff as the 2D sprites. Used on screen for live stories and off screen for
// thumbnails and exports. Callers fall back to drawDots2D when WebGL is unavailable.
let THREE=null,loading=null;
export function loadThree(){return loading||(loading=import('./vendor/three-dots.mjs').then(m=>(THREE=m)).catch(()=>null));}

const vertex=`attribute float aSize;attribute float aAlpha;attribute float aCore;attribute vec3 aColor;
uniform float uScale;varying vec3 vColor;varying float vAlpha;varying float vCore;
void main(){vColor=aColor;vAlpha=aAlpha;vCore=aCore;gl_PointSize=aSize*3.2*uScale;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
// Canvas sprite stops: 0 core/colour α1 · .28 colour α1 · .5 colour α.32 · 1 colour α0
const fragment=`uniform float uPremultiply;varying vec3 vColor;varying float vAlpha;varying float vCore;
void main(){float d=length(gl_PointCoord-vec2(.5))*2.;if(d>1.)discard;
float a=d<.28?1.:d<.5?mix(1.,.32,(d-.28)/.22):mix(.32,0.,(d-.5)/.5);
vec3 c=vCore>.5&&d<.28?mix(vec3(1.),vColor,d/.28):vColor;a*=vAlpha;
gl_FragColor=vec4(c*a,uPremultiply>.5?a:0.);}`;

function supported(){try{const c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl')));}catch{return false;}}

// additive: dots add light (navy cards); otherwise normal "over" blending (light colourways).
export function createDotRenderer(canvas,{opaque=true,preserve=false}={}){
 if(!THREE||!supported())return null;
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,alpha:!opaque,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:preserve||!opaque,powerPreference:'low-power'});}catch{return null;}
 renderer.setClearColor(0x000000,opaque?1:0);renderer.autoClear=false;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,1,0,1,-1,1);
 let cap=0,geometry=null,pos,col,size,alpha,core;
 const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{uScale:{value:1},uPremultiply:{value:1}},transparent:true,depthTest:false,depthWrite:false,
  blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.OneFactor});
 const points=new THREE.Points(new THREE.BufferGeometry(),material);points.frustumCulled=false;scene.add(points);
 function ensure(n){
  if(n<=cap)return;cap=Math.max(1024,1<<Math.ceil(Math.log2(n)));geometry?.dispose();geometry=new THREE.BufferGeometry();
  pos=new THREE.BufferAttribute(new Float32Array(cap*3),3);col=new THREE.BufferAttribute(new Float32Array(cap*3),3);size=new THREE.BufferAttribute(new Float32Array(cap),1);alpha=new THREE.BufferAttribute(new Float32Array(cap),1);core=new THREE.BufferAttribute(new Float32Array(cap),1);
  for(const a of [pos,col,size,alpha,core])a.setUsage(35048);// DynamicDrawUsage
  geometry.setAttribute('position',pos);geometry.setAttribute('aColor',col);geometry.setAttribute('aSize',size);geometry.setAttribute('aAlpha',alpha);geometry.setAttribute('aCore',core);points.geometry=geometry;
 }
 let lost=false,w=1,h=1,dpr=1;
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;});
 return {
  get lost(){return lost;},
  setSize(width,height,ratio){w=width;h=height;dpr=ratio;renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);camera.left=0;camera.right=width;camera.top=0;camera.bottom=height;camera.updateProjectionMatrix();material.uniforms.uScale.value=ratio;},
  // buf: dot buffer; clip: optional {x,y,w,h} in CSS px
  draw(buf,{additive=true,clip=null}={}){
   if(lost)return false;
   ensure(buf.n);
   for(let i=0;i<buf.n;i++){pos.array[i*3]=buf.x[i];pos.array[i*3+1]=buf.y[i];pos.array[i*3+2]=0;size.array[i]=buf.r[i];alpha.array[i]=buf.a[i];core.array[i]=buf.core[i];}
   col.array.set(buf.c.subarray(0,buf.n*3));
   for(const a of [pos,col,size,alpha,core]){a.needsUpdate=true;a.clearUpdateRanges?.();a.addUpdateRange?.(0,buf.n*a.itemSize);}
   geometry.setDrawRange(0,buf.n);
   material.blendDst=additive?THREE.OneFactor:THREE.OneMinusSrcAlphaFactor;material.blendSrcAlpha=additive?THREE.ZeroFactor:THREE.OneFactor;material.blendDstAlpha=additive?THREE.OneFactor:THREE.OneMinusSrcAlphaFactor;
   material.uniforms.uPremultiply.value=additive&&opaque?0:1;material.needsUpdate=false;
   renderer.setScissorTest(false);renderer.clear();
   if(clip){renderer.setScissorTest(true);renderer.setScissor(clip.x,h-clip.y-clip.h,clip.w,clip.h);}
   renderer.render(scene,camera);renderer.setScissorTest(false);return true;
  },
  dispose(){geometry?.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss?.();}
 };
}

// One shared off-screen renderer for thumbnails and exports, drawn into a 2D canvas.
let off=null,offCanvas=null,offAdditive=null;
export function drawDotsOffscreen(target,buf,{width,height,additive=true}){
 if(!THREE)return false;
 if(!off||off.lost||offAdditive!==additive){off?.dispose();offCanvas=document.createElement('canvas');off=createDotRenderer(offCanvas,{opaque:additive,preserve:true});offAdditive=additive;if(!off)return false;}
 off.setSize(width,height,1);if(!off.draw(buf,{additive}))return false;
 target.save();target.setTransform(1,0,0,1,0,0);target.globalCompositeOperation=additive?'lighter':'source-over';target.drawImage(offCanvas,0,0,width,height);target.restore();
 return true;
}
export function threeReady(){return !!THREE;}
