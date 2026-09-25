import * as THREE from './vendor/three.module.min.js';
import { advanceNavigation } from './space-motion.js';

const { works, images } = window.FRAME_DATA;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.createElement('section');
root.className = 'webgl-portfolio';
root.hidden = true;
root.setAttribute('role', 'dialog');
root.setAttribute('aria-modal', 'true');
root.setAttribute('aria-label', '沉浸式三维作品展厅');
root.innerHTML = `<canvas class="space-canvas" tabindex="0" aria-label="三维作品空间。滚轮或上下滑动推进，方向键切换，回车打开项目，Escape 返回。"></canvas><div class="space-top"><button class="space-logo" aria-label="返回公司首页">FR<span>Λ</span>ME</button><nav class="space-nav" aria-label="展厅导航"><button id="space-index-open">作品索引 ↗</button><a href="#talent">模特与演员</a><a href="#contact">合作咨询</a><button id="space-exit">退出展厅 ↗</button></nav></div><div class="space-label">SELECTED WORLDS / 2024—2026<span>INDEPENDENT MINDS. INFINITE POSSIBILITIES.</span></div><div class="space-filters" role="group" aria-label="三维作品分类"><button data-space-filter="all" aria-pressed="true">全部</button><button data-space-filter="品牌影片" aria-pressed="false">品牌影片</button><button data-space-filter="纪录片" aria-pressed="false">纪录片</button><button data-space-filter="创意短片" aria-pressed="false">创意短片</button></div><div class="space-title"><div class="space-kicker" id="space-category"></div><h2 id="space-title"></h2><p id="space-english"></p></div><div class="space-bottom"><div class="space-controls"><button id="space-prev" aria-label="上一个三维项目">←</button><span class="space-count"></span><button id="space-next" aria-label="下一个三维项目">→</button><div class="space-progress" aria-label="项目导航"></div></div><span class="space-hint">滚轮 / 上下滑动穿行 · 移动鼠标探索 · 点击影像进入</span><button class="space-open">进入项目 ↗</button></div><div class="space-crosshair" aria-hidden="true"></div><div class="space-loader"><strong>FRAME / SPACE</strong><p>正在构建影像空间…</p><button class="space-load-exit">返回网站</button></div><section class="space-detail" aria-label="作品介绍" inert><button class="space-back">← 返回三维展厅</button><div class="space-detail-content"></div></section><section class="space-index" hidden aria-label="作品索引"><div class="space-index-head"><h3>选择一个世界。</h3><button id="space-index-close">关闭索引 ✕</button></div><div class="space-index-list"></div></section><div class="sr-only" id="space-status" aria-live="polite"></div>`;
document.body.append(root);
const $ = selector => root.querySelector(selector);
const canvas = $('.space-canvas');
const loaderUI = $('.space-loader');
const detailUI = $('.space-detail');
const indexUI = $('.space-index');
const backgroundNodes = [...document.body.children].filter(el => el !== root && el.tagName !== 'SCRIPT');
let priorInert = [], priorFocus, active = false, renderer, scene, camera, particles, trail, route;
let raf = 0, lastTime = 0, elapsed = 0, progress = 0, velocity = 0, lastInput = 0, target = null;
let current = -1, hover = -1, detail = 0, detailTarget = 0, chosen = -1, contextLost = false;
let detailOrigin = null;
let entries = [], meshes = [], visibleIds = works.map((_,i)=>i), textures = new Map(), videos = new Map();
let pointer = new THREE.Vector2(), smoothPointer = new THREE.Vector2(), cursorEnergy = 0, lastPointer = null, gesture = null;
const raycaster = new THREE.Raycaster();
const motion = { response: .018 };
const clamp = THREE.MathUtils.clamp;
const damp = (a,b,k,dt) => THREE.MathUtils.damp(a,b,k,dt);
const anchor = i => new THREE.Vector3(Math.sin(i*1.16)*15, Math.cos(i*.88)*3.6, -i*13);
const cameraPoint = new THREE.Vector3(), desiredCamera = new THREE.Vector3(), lookAt = new THREE.Vector3();
const tempPos = new THREE.Vector3(), tempQuat = new THREE.Quaternion();

const vertex = `varying vec2 vUv; uniform float uTime,uSpeed,uHover,uCursor,uDetail; uniform vec2 uPointer;
void main(){vUv=uv;vec3 p=position;float edge=sin(uv.x*3.14159)*sin(uv.y*3.14159);float wave=sin(uv.x*7.0+uTime*1.3)+cos(uv.y*6.0-uTime);p.z+=edge*wave*(uSpeed*.055+uHover*.10+uCursor*.08)*(1.0-uDetail);p.z+=edge*dot(uv-.5,uPointer)*uHover*.45;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`;
const fragment = `varying vec2 vUv; uniform sampler2D uMap; uniform float uTime,uSpeed,uHover,uCursor,uOpacity,uAspect,uImageAspect,uDetail; uniform vec2 uPointer;
vec2 cover(vec2 uv){vec2 ratio=vec2(min(uAspect/uImageAspect,1.0),min(uImageAspect/uAspect,1.0));return (uv-.5)*ratio+.5;}
void main(){vec2 uv=cover(vUv);float radius=distance(vUv,uPointer*.5+.5);float wave=sin(radius*24.0-uTime*4.0)*exp(-radius*5.0);uv+=wave*(uHover*.004+uCursor*.003)*(1.0-uDetail);float split=(uSpeed*.0018+uCursor*.0012+uHover*.0007)*(1.0-uDetail);vec3 c=vec3(texture2D(uMap,clamp(uv+vec2(split,0.),0.,1.)).r,texture2D(uMap,clamp(uv,0.,1.)).g,texture2D(uMap,clamp(uv-vec2(split,0.),0.,1.)).b);c+=vec3(.035,.022,.065)*uHover*(1.0-uDetail);float border=1.0-smoothstep(.001,.004,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));c=mix(c,vec3(.63,.52,.95),border*(.4+.5*uHover)*(1.0-uDetail));gl_FragColor=vec4(c,uOpacity);}`;
const starVertex = `attribute float aSize,aLayer; uniform float uTime,uSpeed,uCursor,uPixelRatio;uniform vec2 uPointer;varying float vAlpha;varying float vSpeed;
void main(){vec3 p=position;p.x+=sin(uTime*.11+p.z*.06)*aLayer*.5+uPointer.x*aLayer*.18;p.y+=cos(uTime*.09+p.x)*.15+uPointer.y*aLayer*.14;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uPixelRatio*(95./max(2.,-mv.z))*(1.+uSpeed*.18+uCursor*.2),1.,28.);vAlpha=clamp((-mv.z)/3.,0.,1.)*clamp((180.+mv.z)/55.,0.,1.)*(.25+aLayer*.12);vSpeed=uSpeed;}`;
const starFragment = `varying float vAlpha,vSpeed;void main(){vec2 p=gl_PointCoord-.5;p.x*=1.+vSpeed*.6;float a=exp(-dot(p,p)*18.);if(a<.025)discard;gl_FragColor=vec4(.57,.64,.94,a*vAlpha);}`;

function fallback(message) {
  cancelAnimationFrame(raf);
  loaderUI.hidden=false;
  loaderUI.querySelector('p').textContent=message;
  document.body.classList.add('space-webgl-failed');
  window.framePortfolio = null;
}
function init() {
  if (renderer) return true;
  try {
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
    renderer.setClearColor(0x060810);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    scene=new THREE.Scene();
    scene.fog=new THREE.FogExp2(0x060810,.011);
    camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,240);
    const count=innerWidth<650?750:1700;
    const positions=new Float32Array(count*3), sizes=new Float32Array(count),layers=new Float32Array(count);
    let seed=19261; const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
    for(let i=0;i<count;i++){positions[i*3]=(random()-.5)*100;positions[i*3+1]=(random()-.5)*65;positions[i*3+2]=18-random()*155;sizes[i]=.6+random()*1.4;layers[i]=1+Math.floor(random()*3);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geo.setAttribute('aLayer',new THREE.BufferAttribute(layers,1));
    particles=new THREE.Points(geo,new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uSpeed:{value:0},uCursor:{value:0},uPointer:{value:smoothPointer},uPixelRatio:{value:renderer.getPixelRatio()}},vertexShader:starVertex,fragmentShader:starFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(particles);
    const points=[];for(let i=0;i<140;i++){const p=i/139*6.8;const a=anchor(p);points.push(new THREE.Vector3(a.x+Math.cos(p*2)*10,a.y-5+Math.sin(p*2)*2,a.z));}
    trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x8e6dd4,transparent:true,opacity:.15}));scene.add(trail);
    buildScene();resize();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(raf);loaderUI.hidden=false;loaderUI.querySelector('p').textContent='图形连接暂时中断，正在等待恢复。你也可以返回网站浏览作品。';});
    canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;loaderUI.hidden=true;lastTime=0;if(active)raf=requestAnimationFrame(frame);});
    return true;
  } catch(error) { fallback('当前浏览器无法启用 WebGL 2。请返回网站，使用作品列表继续浏览。');return false; }
}
function getTexture(id,material) {
  const work=works[id];
  if(textures.has(id)){const t=textures.get(id);material.uniforms.uMap.value=t;const img=t.image;material.uniforms.uImageAspect.value=img?(img.videoWidth||img.width)/(img.videoHeight||img.height):16/9;return;}
  const assign=t=>{textures.set(id,t);material.uniforms.uMap.value=t;const img=t.image;material.uniforms.uImageAspect.value=(img.videoWidth||img.width)/(img.videoHeight||img.height);};
  // Set works[id].video to a licensed, CORS-enabled URL to activate real video textures.
  if(work.video){const video=document.createElement('video');video.crossOrigin='anonymous';video.src=work.video;video.muted=true;video.loop=true;video.playsInline=true;video.preload='metadata';videos.set(id,video);video.addEventListener('loadeddata',()=>{const texture=new THREE.VideoTexture(video);assign(texture);});video.addEventListener('error',()=>loadImage());if(active)video.play().catch(()=>{});}
  else loadImage();
  function loadImage(){new THREE.TextureLoader().load(images[work.image],t=>{t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;assign(t);},undefined,()=>{ $('#space-status').textContent='部分影像未能加载，可通过作品索引继续查看项目介绍。';});}
}
function buildScene() {
  entries.forEach(e=>{scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();});
  entries=[];meshes=[];
  const placeholder=new THREE.DataTexture(new Uint8Array([37,35,58,255]),1,1);placeholder.needsUpdate=true;
  visibleIds.forEach((id,i)=>{
    const material=new THREE.ShaderMaterial({uniforms:{uMap:{value:placeholder},uTime:{value:0},uSpeed:{value:0},uHover:{value:0},uCursor:{value:0},uDetail:{value:0},uOpacity:{value:1},uPointer:{value:smoothPointer},uAspect:{value:16/9},uImageAspect:{value:16/9}},vertexShader:vertex,fragmentShader:fragment,transparent:true,side:THREE.DoubleSide,depthWrite:true});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1,32,20),material);mesh.position.copy(anchor(i));const width=Math.min(8.6,20*Math.tan(THREE.MathUtils.degToRad(26))*camera.aspect*.86);mesh.scale.set(width,width/(16/9),1);mesh.userData.index=i;mesh.userData.workId=id;scene.add(mesh);meshes.push(mesh);entries.push({mesh,id,base:anchor(i),hover:0});getTexture(id,material);
  });
  const routePoints=visibleIds.map((_,i)=>anchor(i).add(new THREE.Vector3(0,0,10)));
  if(routePoints.length===1)routePoints.push(routePoints[0].clone().add(new THREE.Vector3(0,0,-.01)));
  route=new THREE.CatmullRomCurve3(routePoints,false,'catmullrom',.4);
  progress=0;velocity=0;target=null;current=-1;hover=-1;chosen=-1;detail=0;detailTarget=0;
  camera.position.copy(route.getPoint(0));camera.lookAt(anchor(0));
  $('.space-progress').innerHTML=visibleIds.map((id,i)=>`<button data-space-index="${i}" aria-label="前往${works[id].title}" aria-current="false"></button>`).join('');
  $('.space-index-list').innerHTML=visibleIds.map((id,i)=>`<button data-space-index="${i}" aria-label="前往${works[id].title}项目">${String(i+1).padStart(2,'0')} / ${works[id].title}<small>${works[id].type} · ${works[id].year} / ${works[id].en}</small></button>`).join('');
  updateLabel(0);loaderUI.hidden=true;
}
function updateLabel(index){
  if(index===current)return;current=index;const w=works[visibleIds[index]];
  $('#space-title').textContent=w.title;$('#space-english').textContent=w.en;$('#space-category').textContent=`${w.type} / ${w.year} / CONCEPT PROJECT`;
  $('.space-count').textContent=`${String(index+1).padStart(2,'0')} / ${String(visibleIds.length).padStart(2,'0')}`;
  $('#space-prev').disabled=index===0;$('#space-next').disabled=index===visibleIds.length-1;
  $('.space-progress').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
  $('#space-status').textContent=`${index+1} / ${visibleIds.length}：${w.title}`;
}
function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
function navigate(index){if(detailTarget||detail>.001)return;target=clamp(index,0,entries.length-1);velocity=0;lastInput=performance.now();if(reduced.matches)progress=target;}
function impulse(delta){if(detailTarget||detail>.001||!indexUI.hidden)return;lastInput=performance.now();target=null;velocity=clamp(velocity+delta*motion.response,-4.6,4.6);if(reduced.matches){progress=clamp(progress+delta*.0015,0,entries.length-1);velocity=0;}}
function openProject(id){
  if(!Number.isInteger(id)||!works[id])return;
  if(!active)enter();if(!renderer||contextLost)return;
  if(!visibleIds.includes(id)){visibleIds=works.map((_,i)=>i);buildScene();root.querySelectorAll('[data-space-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.spaceFilter==='all')));}
  if(detailTarget||detail>.001)return;
  chosen=visibleIds.indexOf(id);velocity=0;target=null;
  // Capture the exact rendered pose. The same GPU mesh becomes the full-screen hero.
  detailOrigin={camera:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov,
    poses:entries.map(e=>({position:e.mesh.position.clone(),quaternion:e.mesh.quaternion.clone(),scale:e.mesh.scale.clone(),opacity:e.mesh.material.uniforms.uOpacity.value}))};
  detailTarget=1;indexUI.hidden=true;
  const w=works[id];$('.space-detail-content').innerHTML=`<span class="mini">${w.en} / CONCEPT PROJECT</span><h2 tabindex="-1">${w.title}</h2><p>${w.desc}</p><p>${w.approach}</p><div class="space-detail-meta"><span>项目方向<b>${w.client}</b></span><span>影片类型<b>${w.type} / ${w.year}</b></span><span>概念时长<b>${w.duration}</b></span></div><a class="space-detail-link" href="#contact">一起创作这样的故事 ↗</a><p class="space-detail-disclaimer">概念项目 · 当前使用灵感图片纹理，非真实客户成片。</p>`;
  detailUI.classList.add('is-visible');detailUI.inert=false;root.classList.add('space-muted');
  $('.space-top').inert=true;$('.space-filters').inert=true;$('.space-bottom').inert=true;
  $('.space-back').focus({preventScroll:true});
  history.replaceState(null,'',`#project-${id+1}`);
}
function closeProject(){detailTarget=0;detailUI.inert=true;root.classList.remove('space-muted');$('.space-top').inert=false;$('.space-filters').inert=false;$('.space-bottom').inert=false;canvas.focus({preventScroll:true});history.replaceState(null,'','#work');}
function frame(now){
  if(!active||contextLost)return;
  raf=requestAnimationFrame(frame);
  const dt=Math.min((now-(lastTime||now))/1000,.035);lastTime=now;elapsed+=dt;
  if(!detailTarget&&detail<.005&&indexUI.hidden){
    const next=advanceNavigation({position:progress,velocity,target},dt,now-lastInput,entries.length-1);
    progress=next.position;velocity=next.velocity;target=next.target;
  }
  detail=damp(detail,detailTarget,reduced.matches?30:4.2,dt);
  if(Math.abs(detail-detailTarget)<.0005)detail=detailTarget;
  cursorEnergy=damp(cursorEnergy,0,4.5,dt);smoothPointer.lerp(pointer,1-Math.exp(-5*dt));
  const speed=reduced.matches?0:Math.abs(velocity);
  camera.fov=damp(camera.fov,52+Math.min(speed*3.8,14)*(1-detail),4,dt);camera.updateProjectionMatrix();
  route.getPoint(clamp(progress/Math.max(entries.length-1,1),0,1),cameraPoint);
  cameraPoint.x+=reduced.matches?0:smoothPointer.x*.26*(1-detail);cameraPoint.y+=reduced.matches?0:smoothPointer.y*.18*(1-detail);
  desiredCamera.copy(cameraPoint);
  if(chosen>=0&&detailOrigin){
    desiredCamera.copy(detailOrigin.camera).lerp(entries[chosen].base.clone().add(new THREE.Vector3(0,0,1.95)),detail);
    camera.position.copy(desiredCamera);
  }else camera.position.lerp(desiredCamera,1-Math.exp(-(reduced.matches?35:9)*dt));
  lookAt.copy(camera.position).add(new THREE.Vector3(smoothPointer.x*.07*(1-detail),smoothPointer.y*.045*(1-detail),-10));camera.lookAt(lookAt);camera.rotation.z=(reduced.matches?0:-velocity*.012)*(1-detail);
  if(detailOrigin&&chosen>=0){camera.quaternion.copy(detailOrigin.quaternion).slerp(new THREE.Quaternion(),detail);camera.fov=THREE.MathUtils.lerp(detailOrigin.fov,52,detail);camera.updateProjectionMatrix();}
  const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  entries.forEach((e,i)=>{
    const offset=i-progress, distance=Math.abs(offset),selected=i===chosen;
    e.hover=damp(e.hover,hover===i&&!detailTarget?1:0,7,dt);
    tempPos.copy(e.base);
    tempPos.x+=(reduced.matches?0:Math.sin(elapsed*.32+i)*.055*(1-detail)+smoothPointer.x*.12*e.hover);
    tempPos.y+=(reduced.matches?0:Math.cos(elapsed*.29+i)*.055*(1-detail)+smoothPointer.y*.08*e.hover);
    if(detailOrigin&&chosen>=0)tempPos.copy(detailOrigin.poses[i].position).lerp(e.base,detail);
    if(!selected){tempPos.x+=Math.sign(offset||1)*detail*22;tempPos.z-=detail*19;}
    e.mesh.position.copy(tempPos);
    const face=new THREE.Euler(-smoothPointer.y*.035*e.hover,clamp(offset*.12,-.3,.3)+smoothPointer.x*.06*e.hover,Math.sin(i)*.025*(1-detail));
    tempQuat.setFromEuler(face);if(selected)tempQuat.slerp(camera.quaternion,detail);e.mesh.quaternion.copy(tempQuat);
    if(detailOrigin&&chosen>=0)e.mesh.quaternion.copy(detailOrigin.poses[i].quaternion).slerp(selected?camera.quaternion:tempQuat,detail);
    const baseWidth=Math.min(8.6,20*tan*camera.aspect*.86);
    let width=baseWidth*(1-Math.min(distance,3)*.025)*(1+e.hover*.027),height=width/1.77778;
    if(detailOrigin&&chosen>=0){width=detailOrigin.poses[i].scale.x;height=detailOrigin.poses[i].scale.y;}
    if(selected&&detail>0){const depth=Math.max(.2,camera.position.z-e.mesh.position.z);const fullscreenHeight=2*depth*tan*1.018;width=THREE.MathUtils.lerp(width,fullscreenHeight*camera.aspect,detail);height=THREE.MathUtils.lerp(height,fullscreenHeight,detail);}
    e.mesh.scale.set(width,height,1);
    const u=e.mesh.material.uniforms;u.uTime.value=elapsed;u.uSpeed.value=speed;u.uCursor.value=reduced.matches?0:cursorEnergy;u.uHover.value=reduced.matches?0:e.hover;u.uDetail.value=selected?detail:0;u.uAspect.value=width/height;
    const frontFade=clamp((camera.position.z-e.mesh.position.z-.2)/2,0,1);
    u.uOpacity.value=selected?THREE.MathUtils.lerp(frontFade,1,detail):frontFade*Math.max(.16,1-distance*.15)*Math.pow(1-detail,2);
    e.mesh.visible=u.uOpacity.value>.005;
  });
  camera.updateMatrixWorld();scene.updateMatrixWorld(true);
  if(!gesture&&!detailTarget&&detail<.01&&indexUI.hidden){raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(meshes).filter(h=>h.object.visible);hover=hits.length?hits[0].object.userData.index:-1;canvas.style.cursor=hover>=0?'pointer':'grab';$('.space-crosshair').classList.toggle('is-hover',hover>=0);}
    particles.material.uniforms.uTime.value=reduced.matches?0:elapsed;particles.material.uniforms.uSpeed.value=speed;particles.material.uniforms.uCursor.value=reduced.matches?0:cursorEnergy;particles.visible=detail<.99;trail.material.opacity=.15*(1-detail);
  detailUI.style.opacity=String(clamp((detail-.52)/.48,0,1));
  if(detail===0&&!detailTarget){detailUI.classList.remove('is-visible');chosen=-1;detailOrigin=null;}
  updateLabel(detailTarget&&chosen>=0?chosen:clamp(Math.round(progress),0,entries.length-1));
  renderer.render(scene,camera);
  // DOM diagnostics expose rendered interaction state for accessibility/QA, not app internals.
  canvas.dataset.project=String(current+1);canvas.dataset.motion=Math.abs(velocity)>.015?'moving':'settled';canvas.dataset.view=detail>.99?'detail':detail>.001?'transition':'gallery';
  canvas.dataset.velocity=velocity.toFixed(4);canvas.dataset.position=progress.toFixed(4);canvas.dataset.renderer='webgl';
}
function enter(){
  if(active)return;
  priorFocus=document.activeElement;priorInert=backgroundNodes.map(n=>n.inert);backgroundNodes.forEach(n=>n.inert=true);
  active=true;root.hidden=false;document.body.classList.add('space-mode');
  history.replaceState(null,'','#work');
  if(init()){resize();lastTime=0;raf=requestAnimationFrame(frame);videos.forEach(v=>v.play().catch(()=>{}));}
  canvas.focus({preventScroll:true});
}
function exit(hash='#work'){
  active=false;cancelAnimationFrame(raf);videos.forEach(v=>v.pause());root.hidden=true;document.body.classList.remove('space-mode');
  backgroundNodes.forEach((n,i)=>n.inert=priorInert[i]||false);detailTarget=0;detail=0;chosen=-1;detailUI.inert=true;detailUI.classList.remove('is-visible');root.classList.remove('space-muted');$('.space-top').inert=false;$('.space-filters').inert=false;$('.space-bottom').inert=false;
  detailOrigin=null;indexUI.hidden=true;velocity=0;target=null;
  const destination=hash==='#home'?document.querySelector('.hero'):document.getElementById(hash.slice(1));
  history.replaceState(null,'',hash);destination?.scrollIntoView({behavior:'instant'});priorFocus?.focus({preventScroll:true});
}
window.framePortfolio={open:enter,openProject,exit};
$('#space-prev').onclick=()=>navigate(current-1);$('#space-next').onclick=()=>navigate(current+1);$('.space-open').onclick=()=>openProject(visibleIds[current]);$('.space-back').onclick=closeProject;
$('#space-exit').onclick=()=>exit();$('.space-logo').onclick=()=>exit('#home');$('.space-load-exit').onclick=()=>exit();
$('#space-index-open').onclick=()=>{indexUI.hidden=false;velocity=0;indexUI.querySelector('button').focus();};$('#space-index-close').onclick=()=>{indexUI.hidden=true;$('#space-index-open').focus();};
root.addEventListener('click',e=>{
  const b=e.target.closest('[data-space-index]');if(b){indexUI.hidden=true;navigate(Number(b.dataset.spaceIndex));canvas.focus({preventScroll:true});}
  const f=e.target.closest('[data-space-filter]');if(f&&!detailTarget){root.querySelectorAll('[data-space-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===f)));visibleIds=works.map((_,i)=>i).filter(i=>f.dataset.spaceFilter==='all'||works[i].type===f.dataset.spaceFilter);buildScene();}
  const a=e.target.closest('a[href^="#"]');if(a){e.preventDefault();exit(a.getAttribute('href'));}
});
canvas.addEventListener('wheel',e=>{if(e.ctrlKey)return;e.preventDefault();impulse(clamp((e.deltaY||e.deltaX)*(e.deltaMode===1?20:e.deltaMode===2?innerHeight:1),-180,180));},{passive:false});
canvas.addEventListener('pointermove',e=>{
  pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
  if(lastPointer){const dist=Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y);const seconds=Math.max(.008,(e.timeStamp-lastPointer.time)/1000);cursorEnergy=clamp(dist/seconds/1200,0,2);}
  lastPointer={x:e.clientX,y:e.clientY,time:e.timeStamp};const cursor=$('.space-crosshair');cursor.style.left=`${e.clientX}px`;cursor.style.top=`${e.clientY}px`;cursor.style.opacity=e.pointerType==='mouse'?'1':'0';
  if(gesture){const dy=gesture.y-e.clientY;gesture.distance+=Math.hypot(gesture.x-e.clientX,dy);gesture.x=e.clientX;gesture.y=e.clientY;impulse(dy*1.6);}
});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);gesture={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,distance:0,id:e.pointerId};});
canvas.addEventListener('pointerup',e=>{const tapped=gesture&&gesture.id===e.pointerId&&gesture.distance<8&&Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)<8;gesture=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(tapped&&!detailTarget&&detail<.001){pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(meshes).find(h=>h.object.visible);if(hit)openProject(hit.object.userData.workId);}});
canvas.addEventListener('lostpointercapture',()=>{gesture=null;});
canvas.addEventListener('pointercancel',()=>{gesture=null;});canvas.addEventListener('pointerleave',()=>{$('.space-crosshair').style.opacity='0';lastPointer=null;});
root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();if(!indexUI.hidden){indexUI.hidden=true;$('#space-index-open').focus();}else if(detailTarget)closeProject();else exit();return;}
  if(e.key==='Tab'){const scope=!indexUI.hidden?indexUI:detailTarget?detailUI:root;const nodes=[...scope.querySelectorAll('button:not(:disabled),a,canvas[tabindex]')].filter(n=>n.getClientRects().length&&!n.closest('[inert]')&&getComputedStyle(n).visibility!=='hidden');const first=nodes[0],last=nodes.at(-1);if(!first)return;if(e.shiftKey&&(document.activeElement===first||!scope.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!scope.contains(document.activeElement))){e.preventDefault();first.focus();}return;}
  if(detailTarget||!indexUI.hidden)return;
  if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();navigate(e.key==='Home'?0:e.key==='End'?entries.length-1:current+(['ArrowDown','ArrowRight'].includes(e.key)?1:-1));}
  if(e.key==='Enter'&&e.target===canvas){e.preventDefault();openProject(visibleIds[current]);}
});
document.addEventListener('click',e=>{const a=e.target.closest('a[href="#work"],button[data-enter-space]');if(a){e.preventDefault();enter();}});
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);videos.forEach(v=>v.pause());}else if(active&&!contextLost){lastTime=0;raf=requestAnimationFrame(frame);videos.forEach(v=>v.play().catch(()=>{}));}});
window.addEventListener('hashchange',()=>{if(location.hash==='#work')enter();else if(active)exit(location.hash||'#work');});
const initialHash=location.hash;
function start(){if(document.querySelector('.cinema-intro')){setTimeout(start,100);return;}if(!initialHash||initialHash==='#work'||/^#project-\d+$/.test(initialHash)){enter();const id=Number(initialHash.split('-')[1])-1;if(Number.isInteger(id)&&id>=0&&id<works.length)openProject(id);}}
start();
