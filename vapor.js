import { CARS, drawCar } from './cars.js';
import { drawScenery } from './scenery.js';
import { createAudio } from './audio.js';
import { sweptContact, collisionResponse } from './contact.mjs';
import { drawRoadside } from './roadside.js';

const $ = id => document.getElementById(id);
const canvas = $('road'), ctx = canvas.getContext('2d', { alpha: false });
const audio = createAudio();
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const keys = new Set();
const routes = [
  {id:'coast', name:'Costa Cassete', note:'À beira-mar', length:14600, tint:'#67e6dd', road:'#332241', mark:'#7cdeec', bend:.77, grade:.40, fog:'#6d487d', seed:31},
  {id:'city', name:'Miragem 88', note:'Retas e viadutos', length:17100, tint:'#f486d9', road:'#251e3b', mark:'#b9bcff', bend:1.01, grade:.62, fog:'#404978', seed:84},
  {id:'canyon', name:'Cânion Rosa', note:'Curvas fechadas', length:15400, tint:'#ffb477', road:'#482c48', mark:'#ffd1b4', bend:1.27, grade:1.0, fog:'#89536f', seed:150},
];
const modes = [
  {id:'free',name:'Passeio',note:'Sem fim'},
  {id:'race',name:'Racha',note:'5 rivais'},
  {id:'time',name:'Contrarrelógio',note:'Melhor tempo'},
];
const meters = [['speed','Velocidade'],['handling','Controle'],['boost','Nitro']];
const allowed = new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space']);
const clamps = (x,a,b) => Math.max(a,Math.min(b,x));
const mix = (a,b,t) => a + (b-a)*t;
const noise = n => {const x = Math.sin(n*127.1 + 311.7)*43758.5453123; return x-Math.floor(x);};
function read(k, fallback) {try {return localStorage.getItem(k) ?? fallback;} catch {return fallback;}}
function write(k,v) {try {localStorage.setItem(k,String(v));} catch {/* private mode */}}
let mode = read('vr-mode','free'), route = routes.find(r=>r.id===read('vr-route','coast')) ?? routes[0];
if (!modes.some(m=>m.id===mode)) mode='free';
let choice = Math.max(0,CARS.findIndex(c=>c.id===read('vr-car','')));
let sound = read('vr-sound','1')==='1';
let W=0,H=0,dpr=1, game=null, screen='garage', last=0, demo=0, hudDue=0, focusBeforePause=null;
let carry=0;
let lastClock='', lastRank='', lastSpeed='';
const dom = Object.fromEntries(['race','stage','garage','race-mode','race-route','race-clock','race-progress','race-progress-fill','event','status','speed','tach','nitro','rank','rank-label','modal','dialog-title','dialog-info','continue','pause','exit','sound','start'].map(k=>[k,$(k)]));

function addOptions(el, options, kind, selected) {
  for (const option of options) {
    const wrapper=document.createElement('label'), input=document.createElement('input'), title=document.createElement('strong'), note=document.createElement('small');
    input.type='radio'; input.name=kind; input.value=option.id; input.checked=option.id===selected;
    title.textContent=option.name; note.textContent=option.note;
    wrapper.append(input,title,note); el.append(wrapper);
    input.addEventListener('change',()=> {
      if(kind==='mode') mode=option.id; else {route=option; demo=0;}
      write('vr-'+kind,option.id); audio.fx('select');
    });
  }
}
addOptions($('mode-options'),modes,'mode',mode);
addOptions($('route-options'),routes,'route',route);
for (const [,label] of meters) {
  const row=document.createElement('span'), meter=document.createElement('meter');
  row.textContent=label; meter.min=0; meter.max=1; meter.setAttribute('aria-label',label);
  row.append(meter); $('car-stats').append(row);
}
function selectCar(direction=0) {
  choice=(choice+direction+CARS.length)%CARS.length;
  const car=CARS[choice]; write('vr-car',car.id);
  $('car-name').textContent=car.name; $('car-tag').textContent=car.tagline;
  Array.from($('car-stats').querySelectorAll('meter')).forEach((el,i)=>{el.value=car.stats[meters[i][0]];});
  const preview=$('preview'), p=preview.getContext('2d');
  p.clearRect(0,0,preview.width,preview.height);
  drawCar(p,{x:84,y:82,width:133,car,time:0,steer:0,boost:false,player:true,speed:0});
  if(direction) audio.fx('select');
}
$('prev').onclick=()=>selectCar(-1);
$('next').onclick=()=>selectCar(1);
selectCar();
function soundUI() {
  dom.sound.setAttribute('aria-pressed',String(sound));
  dom.sound.textContent=sound?'Som ligado':'Som desligado';
}
audio.setEnabled(sound); soundUI();
dom.sound.onclick=()=> {
  sound=!sound; write('vr-sound',Number(sound)); audio.setEnabled(sound); soundUI();
  if (sound && (screen==='driving'||screen==='garage')) audio.start();
};

function resize() {
  const box=dom.stage.getBoundingClientRect();
  W=Math.round(box.width); H=Math.round(box.height); dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.max(1,Math.round(W*dpr)); canvas.height=Math.max(1,Math.round(H*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
new ResizeObserver(resize).observe(dom.stage);
resize();

function setScreen(next) {
  screen=next; carry=0;
  dom.garage.hidden=next!=='garage';
  dom.race.hidden=next==='garage';
  dom.stage.classList.toggle('is-playing',next!=='garage');
  dom.modal.hidden=next!=='paused'&&next!=='finished';
  dom.race.inert=!dom.modal.hidden;
  dom.sound.inert=!dom.modal.hidden;
  keys.clear();
  document.querySelectorAll('[data-held="true"]').forEach(el=>delete el.dataset.held);
}
function labelEvent(value,ttl=0,announce=true) {
  dom.event.textContent=value;
  if(announce) dom.status.textContent=value;
  if(game) game.eventTTL=ttl;
}
function startRace() {
  const car=CARS[choice], count=mode==='race'?5:0;
  game={dist:0,lateral:0,velocity:0,speed:0,charges:.63,elapsed:0,countdown:3,shown:0,
    mode,route,car,boost:false,drift:false,eventTTL:0,bonus:0,rank:count+1,
    particles:[],emitter:0,camSpeed:0,shake:0,contactAt:-10,marks:[],markAt:0,
    nextTraffic:500, spawn:0, traffic:[],
    rivals:Array.from({length:count},(_,i)=>({z:18+i*31,x:[-.54,.52,.0,-.48,.56][i],lane:[-.54,.52,.0,-.48,.56][i],speed:0, pace:168+8*i + noise(i+route.seed)*8, car:CARS[(choice+1+i)%CARS.length],i})),
  };
  setScreen('driving');
  dom['race-mode'].textContent=modes.find(m=>m.id===mode).name.toUpperCase(); dom['race-route'].textContent=route.name;
  dom['race-progress'].hidden=mode==='free';
  dom['rank-label'].textContent=mode==='race'?'POSIÇÃO':mode==='free'?'DISTÂNCIA':'RECORDE';
  hudDue=0; lastSpeed=lastRank=lastClock='';
  if(sound) audio.start();
  updateHud();
  dom.stage.focus({preventScroll:true});
}
$('setup').onsubmit=e=>{e.preventDefault();startRace();};
function garage() {
  game=null;
  audio.stop();
  setScreen('garage');
  dom.status.textContent='';
  dom.start.focus();
}
dom.exit.onclick=garage; $('return').onclick=garage;
function pause() {
  if (screen!=='driving') return;
  focusBeforePause=document.activeElement;
  setScreen('paused');
  audio.stop();
  dom['dialog-title'].textContent='Pausa';
  dom['dialog-info'].hidden=true;
  dom.continue.textContent='Continuar';
  dom.continue.focus();
}
function timeLabel(t) {
  if(!Number.isFinite(t)) return '–';
  const cs=Math.floor(t*100), min=Math.floor(cs/6000), sec=Math.floor(cs/100)%60;
  return String(min).padStart(2,'0')+':'+String(sec).padStart(2,'0')+'.'+String(cs%100).padStart(2,'0');
}
function recordKey() {return 'vr-record-'+game.mode+'-'+game.route.id;}
function finish() {
  const prev=Number(read(recordKey(),'Infinity')), isBest=game.elapsed<prev;
  if(isBest) write(recordKey(),game.elapsed);
  audio.setDrive({speed:0,boost:false,drift:false}); audio.fx('finish');
  setScreen('finished');
  dom['dialog-title'].textContent=game.mode==='race'?(game.rank===1?'Vitória!':'Fim da corrida'):(isBest?'Novo recorde!':'Tempo final');
  dom['dialog-info'].hidden=false;
  dom['dialog-info'].textContent=game.route.name+' · '+timeLabel(game.elapsed)+(game.mode==='race'?' · '+game.rank+'º de 6':'');
  dom.continue.textContent='Correr de novo';
  dom.continue.focus();
}
dom.pause.onclick=pause;
dom.continue.onclick=()=> {
  if(screen==='finished') {startRace();return;}
  if(screen==='paused') {
    setScreen('driving'); if(sound) audio.start();
    (focusBeforePause?.isConnected && focusBeforePause!==document.body?focusBeforePause:dom.stage).focus({preventScroll:true});
  }
};
document.addEventListener('keydown', e=> {
  if (e.code==='Tab'&&!dom.modal.hidden) {
    const first=dom.continue,lastButton=$('return');
    if ((e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===lastButton)) {
      e.preventDefault(); (e.shiftKey?lastButton:first).focus();
    }
  }
  if(e.code==='Escape'&&(screen==='driving'||screen==='paused')) {
    e.preventDefault();
    if(!e.repeat) {if(screen==='driving') pause(); else dom.continue.click();}
  }
  if(screen==='driving'&&allowed.has(e.code)&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&
      !(e.code==='Space'&&document.activeElement?.matches('button,a,input,select,textarea,[contenteditable]'))) {
    e.preventDefault(); keys.add(e.code);
  }
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{if(screen==='driving') pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='driving') pause();});
for(const el of document.querySelectorAll('[data-key]')) {
  const key=el.dataset.key, activePointers=new Set();
  el.addEventListener('pointerdown',e=> {
    if (e.button!==0||screen!=='driving') return;
    e.preventDefault(); el.setPointerCapture(e.pointerId); activePointers.add(e.pointerId); keys.add(key); el.dataset.held='true';
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']) {
    el.addEventListener(type,e=> {
      activePointers.delete(e.pointerId);
      if (!activePointers.size) { keys.delete(key); delete el.dataset.held;}
    });
  }
  el.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter') {e.preventDefault();if(screen==='driving')keys.add(key);}});
  el.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter') {e.preventDefault();keys.delete(key);}});
  el.addEventListener('blur',()=>keys.delete(key));
}

function spawnTraffic(g) {
  while(g.nextTraffic<g.dist+3950) {
    const i=g.spawn++, seed=g.route.seed, lane=[-.57,0,.57][Math.floor(noise(i+seed)*3)];
    g.traffic.push({z:g.nextTraffic,x:lane,lane, speed:65+noise(i+seed*3)*57, car:CARS[(i+2)%CARS.length], i});
    g.nextTraffic+=450+noise(i+seed*7)*740;
  }
  g.traffic=g.traffic.filter(o=>o.z>g.dist-320);
}
const MAX_SPEED=322;
const STEP=1/120;
const MAX_PARTICLES=140;
function emitParticles(g,kind,count,x,z,side=0,power=1) {
  if (reduce.matches) {
    if (kind!=='spark') return;
    count=Math.min(count,5);
  }
  for(let i=0;i<count;i++){
    const a=Math.random(), b=Math.random(), life=kind==='spark'?.22+.36*a:.36+.54*a;
    if(g.particles.length>=MAX_PARTICLES)g.particles.shift();
    g.particles.push({kind,x:x+(b-.5)*.06,z:z+(a-.5)*22,life,max:life,
      vx:(b-.5)*(kind==='spark'?2.45:.71)+(kind==='spark'?side*.94:0),
      vz:kind==='spark'?(g.speed*3.6+90+a*240)*power:g.speed*.22,
      size:.65+b*.75, lift:kind==='spark'?16+a*35:7+a*20});
  }
}
function tickParticles(g,dt) {
  for(let i=g.particles.length-1;i>=0;i--){
    const p=g.particles[i];
    p.life-=dt;
    if(p.life<=0||p.z<g.dist-40){g.particles.splice(i,1);continue;}
    p.x+=p.vx*dt; p.z+=p.vz*dt;
    p.vx*=Math.pow(.40,dt); p.vz*=Math.pow(p.kind==='spark'?.28:.06,dt);
  }
}
function surfaceEffect(g,off,dt) {
  g.shake=Math.max(0,g.shake-dt*3.5);
  g.camSpeed=mix(g.camSpeed,g.speed/MAX_SPEED+(g.boost?.16:0),Math.min(1,dt*5.4));
  tickParticles(g,dt);
  if(g.speed<60||(!g.drift&&!off)) {g.emitter=0; return;}
  g.emitter+=dt*(g.drift?47:34);
  while(g.emitter>=1){
    g.emitter--; const side=Math.random()<.5?-1:1;
    emitParticles(g,off?'dust':'smoke',1,g.lateral+side*.115,g.dist-5);
  }
  if(!reduce.matches&&g.drift&&!off&&g.dist>=g.markAt){
    g.marks.push({x:g.lateral,z:g.dist});g.markAt=g.dist+27;
    if(g.marks.length>130)g.marks.shift();
  }
}

function step(dt) {
  const g=game, directional=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
  if(g.mode==='free'&&g.traffic.length===0) spawnTraffic(g);
  if(g.countdown>0) {
    const n=Math.ceil(g.countdown);
    if (n!==g.shown) {g.shown=n; labelEvent(String(n)); audio.fx('countdown');}
    g.countdown-=dt;
    if(g.countdown<=0){labelEvent('VAI!',.8);audio.fx('start');}
    return;
  }
  const accel=keys.has('ArrowUp')||keys.has('KeyW'), brake=keys.has('ArrowDown')||keys.has('KeyS');
  const drifting=(keys.has('Space')||(brake&&accel))&&directional!==0&&g.speed>74;
  const boosting=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&g.charges>.013&&g.speed>30&&!brake;
  if(boosting&&!g.boost) audio.fx('boost');
  g.boost=boosting; g.drift=drifting;
  const off=Math.abs(g.lateral)>1.0, limit=163+g.car.stats.speed*96+(boosting?41+g.car.stats.boost*22:0);
  if(accel&&!brake) g.speed+=dt*(112-g.speed*.235+(boosting?58:0));
  if(boosting&&!accel) g.speed+=dt*(58-g.speed*.05);
  if(brake) g.speed-=dt*(drifting?44:142);
  if(!accel&&!boosting&&!brake) g.speed-=dt*(32+g.speed*.025);
  if(off) g.speed-=dt*(78+g.speed*.11);
  g.speed=clamps(g.speed,0,g.speed>limit?Math.max(limit,g.speed-100*dt):limit);
  g.charges=clamps(g.charges + dt*(boosting?-.29+(g.car.stats.boost*.06):drifting?.24:.014),0,1);
  const grip=.62+g.car.stats.handling*.50;
  const steer=directional*(1.05+g.speed*.004)*grip*(drifting?1.40:1);
  g.velocity=mix(g.velocity,steer,Math.min(1,dt*(drifting?4:8)));
  const old=g.dist, oldX=g.lateral;
  g.dist+=dt*g.speed*4.2;
  g.lateral=clamps(g.lateral+dt*(g.velocity - curvature(g.dist,g.route)*g.speed*.0021),-1.37,1.37);
  g.elapsed+=dt;
  const wall=g.route.id==='city'?1.16:g.route.id==='coast'?1.26:1.35;
  if(Math.abs(g.lateral)>wall){
    const side=Math.sign(g.lateral), impact=Math.abs(g.velocity);
    g.lateral=side*wall; g.velocity=-side*Math.max(.13,impact*.36);
    if(g.elapsed-g.contactAt>.28&&g.speed>40){
      g.contactAt=g.elapsed;
      g.speed*=impact>1.25?.83:.94;
      g.shake=Math.max(g.shake,.26+impact*.09);
      emitParticles(g,'spark',impact>1.25?17:8,g.lateral+side*.11,g.dist, -side,.83);
      audio.fx('collision');
    }
  }
  if(g.eventTTL>0) {g.eventTTL-=dt; if(g.eventTTL<=0)labelEvent('',0,false);}
  if(g.mode==='free') spawnTraffic(g);
  for(const o of [...g.traffic,...g.rivals]) {
    const previous=o.z, previousX=o.x;
    if(o.pace) o.speed=Math.min(o.pace,o.speed+dt*101);
    o.z+=dt*o.speed*4.2;
    o.x=clamps(o.lane+Math.sin(o.z*.001+o.i)*.12+(o.push??0),-.93,.93);
    o.push=(o.push??0)*Math.pow(.08,dt);
    const delta=o.z-g.dist,before=previous-old;
    const contact=sweptContact({dx0:previousX-oldX,dz0:before,dx1:o.x-g.lateral,dz1:delta,halfX:.245,halfZ:39});
    if(!contact&&Math.abs(delta)>48)o.inContact=false;
    if(!contact&&Math.abs(o.x-g.lateral)>.30)o.inContact=false;
    if(contact&&!o.inContact&&g.elapsed>=(o.cooldown??0)&&(g.speed>22||o.speed>28)){
      o.inContact=true;
      const isLongitudinal=contact.axis==='z';
      const hit=collisionResponse({contact,speed:g.speed,otherSpeed:o.speed,lateralSpeed:g.velocity,otherLateralSpeed:(o.x-previousX)/dt});
      const side=isLongitudinal?Math.sign(mix(previousX-oldX,o.x-g.lateral,contact.t)||g.velocity||1):contact.side;
      const shove=isLongitudinal?-side*(.033+hit.energy*.050):hit.shove;
      g.lateral=clamps(g.lateral+shove,-wall,wall);
      g.velocity=clamps((isLongitudinal?g.velocity*.47:g.velocity*.23)+shove*6,-2.4,2.4);
      g.speed=clamps(hit.speed,0,MAX_SPEED);
      o.push=clamps((o.push??0)+side*(hit.severity==='hit'?.19:.08),-.35,.35);
      if(isLongitudinal&&before>0&&hit.severity==='hit')o.speed+=Math.min(16,hit.energy*13);
      o.cooldown=g.elapsed+(hit.severity==='hit'?.60:.35);
      o.touched=true;
      g.contactAt=g.elapsed; g.shake=Math.max(g.shake,hit.severity==='hit'? .78 : .24);
      emitParticles(g,'spark',hit.severity==='hit'?24:9,g.lateral+side*.13,g.dist+13,-side,hit.severity==='hit'?1:.7);
      labelEvent(hit.severity==='hit'?'BATIDA':'RASPÃO',hit.severity==='hit'?.52:.37,false);
      audio.fx('collision');
    } else if(!contact&&!o.touched&&!o.passed&&before>0&&delta<=0&&Math.abs(o.x-g.lateral)<.44&&g.speed>o.speed+20) {
      o.passed=true; g.charges=Math.min(1,g.charges+.15); g.bonus++;
      if(g.mode==='free') labelEvent('+15% NITRO',.55,false);
    }
  }
  surfaceEffect(g,off,dt);
  if(g.mode==='race') g.rank=1+g.rivals.filter(r=>r.z>g.dist).length;
  if(g.mode!=='free'&&g.dist>=g.route.length) {finish();return;}
}
function updateHud() {
  const g=game; if(!g) return;
  const clock=timeLabel(g.elapsed), speed=String(Math.round(g.speed)).padStart(3,'0');
  const rank=g.mode==='race'?g.rank+'º / 6':g.mode==='time'?timeLabel(Number(read(recordKey(),'Infinity'))):(g.dist/4200).toFixed(1).replace('.',',')+' km';
  if(lastClock!==clock)dom['race-clock'].textContent=lastClock=clock;
  if(lastRank!==rank)dom.rank.textContent=lastRank=rank;
  if(lastSpeed!==speed)dom.speed.textContent=lastSpeed=speed;
  dom.nitro.style.transform='scaleX('+g.charges.toFixed(3)+')';
  dom.nitro.parentElement.setAttribute('aria-valuenow',String(Math.round(g.charges*100)));
  dom.tach.style.transform='scaleX('+(g.speed/MAX_SPEED).toFixed(3)+')';
  if(g.mode!=='free')dom['race-progress-fill'].style.transform='scaleX('+Math.min(1,g.dist/g.route.length).toFixed(4)+')';
}

function trackX(z,r) {
  return r.bend*(1.05*Math.sin(z*.00073)+.54*Math.sin(z*.00131+r.seed*.07)+.36*Math.sin(z*.0019+r.seed));
}
function curvature(z,r){return (trackX(z+480,r)-trackX(z-100,r))*.88;}
function block(ctx,p,q,a,b,color) {
  ctx.fillStyle=color;ctx.beginPath();
  ctx.moveTo(p.x+p.w*a,p.y);ctx.lineTo(p.x+p.w*b,p.y);
  ctx.lineTo(q.x+q.w*b,q.y);ctx.lineTo(q.x+q.w*a,q.y);ctx.closePath();ctx.fill();
}
function paintRoad(p,q,i,zone,z) {
    block(ctx,p,q,-1.18,1.18,i%4<2?'#553957':'#4a3355');
    block(ctx,p,q,-1,1,zone.road);
    if(i%4<2) {
      block(ctx,p,q,-.997,.997,'#b69bbe08');
      block(ctx,p,q,-.97,-.81,'#bca4be0a');block(ctx,p,q,.81,.97,'#bca4be0a');
    }
    if(i%4<2) {
      block(ctx,p,q,-1.097,-1.032,zone.tint);block(ctx,p,q,1.032,1.097,zone.tint);
    } else {
      block(ctx,p,q,-1.097,-1.032,'#ead0db');block(ctx,p,q,1.032,1.097,'#ead0db');
    }
    block(ctx,p,q,-1.018,-.994,zone.tint+'c9');block(ctx,p,q,.994,1.018,zone.tint+'c9');
    if(i%8<3) {
      block(ctx,p,q,-.349,-.320,zone.mark);block(ctx,p,q,.320,.349,zone.mark);
    }
    if(zone.id==='city'&&i%12<2&&z<1500) {
      block(ctx,p,q,-.73,-.705,'#e0a1df44');block(ctx,p,q,.705,.73,'#e0a1df44');
    }
    if(z>200) {
      const haze=Math.round(Math.min(.78,Math.pow(z/4620,.75)*.77)*255).toString(16).padStart(2,'0');
      block(ctx,p,q,-1.18,1.18,zone.fog+haze);
    }
}
function drawGate(p,zone) {
  if(p.w<20)return;
  const span=p.w*1.20, high=Math.min(p.w*.64,H*.45), side=Math.max(2,p.w*.018);
  ctx.fillStyle='#1a122a';
  ctx.fillRect(p.x-span,p.y-high,side,p.y-(p.y-high)); ctx.fillRect(p.x+span-side,p.y-high,side,high);
  ctx.fillStyle=zone.tint; ctx.fillRect(p.x-span,p.y-high,side*.26,high);ctx.fillRect(p.x+span-side*.22,p.y-high,side*.22,high);
  const height=Math.max(11,high*.23);
  ctx.fillStyle='#1a122a';ctx.fillRect(p.x-span,p.y-high-height*.1,span*2,height);
  ctx.strokeStyle=zone.tint;ctx.lineWidth=Math.max(1,side*.185);ctx.strokeRect(p.x-span,p.y-high-height*.1,span*2,height);
  const font=Math.max(8,Math.floor(height*.59));
  ctx.fillStyle='#fff1e3';ctx.font='900 '+font+'px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('CHEGADA',p.x,p.y-high+height*.45,span*1.7);
}
function drawShoulder(p,i,r) {
  if(p.w<24)return;
  const size=clamps(p.w*.028,1.5,11), side=i%3===0?-1:1, x=p.x + side*p.w*(1.12+noise(i+r.seed)*.07);
  if(i%9===0) {
    const high=p.w*.31, right=x+side*p.w*.08;
    ctx.fillStyle='#151026';ctx.fillRect(x-size*.3,p.y-high,size*.7,high);
    ctx.strokeStyle=r.tint;ctx.lineWidth=Math.max(1,size*.20);
    ctx.beginPath();ctx.moveTo(x,p.y-high);ctx.lineTo(right,p.y-high*.91);ctx.stroke();
    ctx.fillStyle=r.tint;ctx.fillRect(right-size*.8,p.y-high*.94,size*1.6,size*.37);
    if(!reduce.matches) {
      ctx.fillStyle=r.tint+'29';ctx.beginPath();ctx.moveTo(right,p.y-high*.91);ctx.lineTo(right-size*2.6,p.y);ctx.lineTo(right+size*2.6,p.y);ctx.fill();
    }
  } else {
    ctx.fillStyle='#211634';ctx.fillRect(x-size*.65,p.y-size*2.85,size*1.3,size*2.85);
    ctx.fillStyle=i%2?r.tint:'#ffc192';ctx.fillRect(x-size*.54,p.y-size*2.65,size*1.08,size*.42);
  }
}
function slipstream(g,now) {
  if(!g||reduce.matches||g.speed<122)return;
  const boost=g.boost||false, intensity=clamps((g.speed-122)/170+(boost?.37:0),0,1);
  ctx.save();
  ctx.lineWidth=boost?1.45:1;
  ctx.strokeStyle='rgba(255,210,212,'+(.23*intensity).toFixed(2)+')';
  ctx.beginPath();
  const stamp=g.dist*.00082;
  for(let i=0;i<(boost?24:14);i++) {
    const angle=(i%2===0?1:-1)*(2.67+noise(i+104)*.44) + (i%2===0?0:Math.PI);
    const phase=(stamp+noise(i+123))%1;
    const extent=(.41+phase*.64), x=W*.5+Math.cos(angle)*W*extent;
    const y=H*.46+Math.abs(Math.sin(angle))*H*extent*(.45+noise(i+756));
    if(y>H*.94||y<H*.43)continue;
    const l=(6+39*phase)*intensity;ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*l,y+Math.abs(Math.sin(angle))*l);
  }
  ctx.stroke();
  if(boost) {
    const wash=ctx.createLinearGradient(0,H*.43,0,H);
    wash.addColorStop(0,'#6cb4f400');wash.addColorStop(1,'#7a4ce021');
    ctx.fillStyle=wash;ctx.fillRect(0,H*.43,W,H*.57);
  }
  ctx.restore();
}
function paintParticle(p,project,dist,playerZ,zone) {
  const z=p.z-dist+playerZ;
  if(z<0||z>900)return;
  const point=project(z), elapsed=1-p.life/p.max, scale=point.scale, x=point.x+point.w*p.x;
  const y=point.y-(p.kind==='spark'? (Math.sin(elapsed*Math.PI)*p.lift+2) : p.lift*elapsed+2)*scale;
  const size=(p.kind==='spark'?3:6+elapsed*16)*p.size*scale;
  ctx.save();
  ctx.globalAlpha=(1-elapsed)*(p.kind==='spark'?.94:p.kind==='smoke'?.19:.31);
  if(p.kind==='spark'){
    ctx.strokeStyle=elapsed<.30?'#fff3ba':elapsed<.61?'#ffbc68':'#ff766f';ctx.lineWidth=Math.max(.8,size*.57);
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-p.vx*size*3,y-size*(1.4+elapsed*2));ctx.stroke();
  } else {
    ctx.fillStyle=p.kind==='smoke'?'#ebcde5':zone.id==='canyon'?'#ffab7a':'#be9bce';
    ctx.beginPath();ctx.ellipse(x,y,size,size*.56,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function hill(z,zone) {
  return zone.grade*(Math.sin(z*.00087+zone.seed)+.47*Math.sin(z*.00191+zone.seed*.13));
}

function render(now) {
  if(W<2||H<2)return;
  const g=game, zone=g?.route??route, dist=g?.dist??demo, lateral=g?.lateral??(W>680?-.25:0);
  const reduced=reduce.matches, cam=reduced?0:g?.camSpeed??.22;
  const horizon=H*((W<680?.405:.428) + (g ? cam*.033 : 0));
  const shake=reduced?0:(g?.shake??0);
  const shakeX=Math.sin(now*.069)*shake*6, shakeY=Math.cos(now*.046)*shake*3;
  drawScenery(ctx,{width:W,height:H,horizon,distance:dist,course:zone.id,steer:lateral*.43+shakeX*.003,time:now/1000,reducedMotion:reduced});
  const focal=W*(W<680?.67:.49)*(1-.083*cam);
  const view=155-22*cam, rough=hill(dist,zone), bend0=trackX(dist,zone);
  function project(z) {
    const scale=1/(1+Math.max(0,z)/view);
    const terrainY=(hill(dist+z,zone)-rough)*H*.032*(1-scale)*Math.min(1,scale*5.5);
    return {x:W*.5+(trackX(dist+z,zone)-bend0-lateral*.74)*focal*scale+shakeX*scale,
      y:horizon+(H-horizon)*scale+terrainY+shakeY*scale,w:focal*scale,scale};
  }
  const step=35, far=4590;
  const first=Math.ceil(dist/step)*step;
  let p=project(far);
  const gates=[];
  for(let world=Math.floor((dist+far)/step)*step;world>=first;world-=step) {
    const z=world-dist, i=Math.floor(world/step),q=project(z);
    paintRoad(p,q,i,zone,z);
    if(g&&g.mode!=='free'&&world>=zone.length&&world-step<zone.length) {
      for(let j=0;j<12;j++) block(ctx,p,q,-1+j/6,-1+(j+1)/6,j%2?'#e8d2e1':'#40344f');
      gates.push({z,gate:true});
    }
    if(i%4===0) gates.push({z,shoulder:true,i});
    if(i%10===0){gates.push({z,roadside:true,i,side:-1},{z,roadside:true,i,side:1});}
    p=q;
  }
  const end={...project(0),y:H+1};
  paintRoad(p,end,Math.floor(dist/step),zone,0);
  const playerZ=W<680?87:52, carW=clamps(W*.138,68,174)*(1-.07*cam);
  if(g){
    ctx.strokeStyle='#140f27a8';
    for(let i=g.marks.length-1;i>0;i--){
      const b=g.marks[i],a=g.marks[i-1],z=b.z-dist+playerZ;
      if(z<=1||b.z-a.z>43)continue;
      const point=project(z),past=project(Math.max(0,a.z-dist+playerZ));
      ctx.lineWidth=Math.max(.8,point.w*.017);
      for(const j of [-.14,.14]){ctx.beginPath();ctx.moveTo(past.x+(a.x+j)*past.w,past.y);ctx.lineTo(point.x+(b.x+j)*point.w,point.y);ctx.stroke();}
    }
    for(const particle of g.particles)gates.push({z:particle.z-dist+playerZ,particle});
  }

  gates.push({z:playerZ,me:true});
  if(g) for(const o of [...g.traffic,...g.rivals]) {
    const z=o.z-dist+playerZ-7;
    if(z>5&&z<far)gates.push({z,o});
  }
  gates.sort((a,b)=>b.z-a.z);
  for(const item of gates) {
    const point=project(item.z);
    if(item.particle){paintParticle(item.particle,project,dist,playerZ,zone);continue;}
    if(item.roadside){
      if(item.z<2300&&point.w>9){ctx.save();ctx.globalAlpha=clamps(1-item.z/3100,.20,1);drawRoadside(ctx,{p:point,index:item.i,course:zone.id,side:item.side,reducedMotion:reduced});ctx.restore();}
      continue;
    }
    if(item.gate){drawGate(point,zone);continue;}
    if(item.shoulder){drawShoulder(point,item.i,zone);continue;}
    if(item.me) {
      const x=point.x+lateral*point.w, y=point.y;
      const moving=g?.speed??65;
      drawCar(ctx,{x,y,width:carW,car:g?.car??CARS[choice],time:reduce.matches?0:now/1000,steer:clamps((g?.velocity??0)/2.5,-1,1),boost:g?.boost&&!reduce.matches,player:true,speed:moving/MAX_SPEED});
      continue;
    }
    const o=item.o, width=carW*point.scale*(1+playerZ/155);
    if(width<3)continue;
    drawCar(ctx,{x:point.x+o.x*point.w,y:point.y,width,car:o.car,time:reduce.matches?0:now/1000,steer:0,boost:false,player:false,speed:o.speed/MAX_SPEED});
  }
  slipstream(g,now);
}
function frame(now) {
  const dt=last?clamps((now-last)/1000,0,.10):0;last=now;
  if(screen==='garage'&&!reduce.matches)demo+=dt*64;
  if(screen==='driving'&&game) {
    carry+=dt;
    while(carry>=STEP&&screen==='driving'){carry-=STEP;step(STEP);}
    if(screen==='driving')audio.setDrive({speed:game.speed/MAX_SPEED,boost:game.boost,drift:game.drift});
    hudDue-=dt;
    if(hudDue<=0){updateHud();hudDue=.055;}
  }
  if (screen==='driving'||screen==='garage'||frame.lastScreen!==screen||frame.width!==W||frame.height!==H) {
    render(now);frame.lastScreen=screen;frame.width=W;frame.height=H;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
