import { CARS, drawCar } from './cars.js';
import { drawScenery } from './scenery.js';
import { createAudio } from './audio.js';

const $ = id => document.getElementById(id);
const canvas = $('road'), ctx = canvas.getContext('2d', { alpha: false });
const audio = createAudio();
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const keys = new Set();
const routes = [
  {id:'coast', name:'Costa Cassete', note:'Orla · fluida', length:14600, tint:'#67e6dd', road:'#332241', mark:'#7cdeec', bend:.77, seed:31},
  {id:'city', name:'Miragem 88', note:'Metrópole · rápida', length:17100, tint:'#f486d9', road:'#251e3b', mark:'#b9bcff', bend:1.01, seed:84},
  {id:'canyon', name:'Cânion Rosa', note:'Deserto · técnica', length:15400, tint:'#ffb477', road:'#482c48', mark:'#ffd1b4', bend:1.27, seed:150},
];
const modes = [
  {id:'free',name:'Passeio',note:'Sem linha de chegada'},
  {id:'race',name:'Racha',note:'Contra 5 rivais'},
  {id:'time',name:'Contrarrelógio',note:'Bata seu recorde'},
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
  screen=next;
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
    mode,route,car,boost:false,drift:false, inv:0,eventTTL:0,bonus:0, warning:0, rank:count+1,
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
  dom.pause.focus({preventScroll:true});
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
  dom['dialog-title'].textContent='Corrida pausada';
  dom['dialog-info'].textContent='A estrada espera. Retome de onde parou ou volte para trocar de carro.';
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
  dom['dialog-title'].textContent=game.mode==='race'?(game.rank===1?'Vitória na madrugada!':'Linha de chegada'):(isBest?'Novo recorde!':'Tempo registrado');
  dom['dialog-info'].textContent=timeLabel(game.elapsed)+' na '+game.route.name+(game.mode==='race'?' · '+game.rank+'º de 6':'')+(isBest?' · Melhor tempo pessoal.':'.');
  dom.continue.textContent='Correr de novo';
  dom.continue.focus();
}
dom.pause.onclick=pause;
dom.continue.onclick=()=> {
  if(screen==='finished') {startRace();return;}
  if(screen==='paused') {
    setScreen('driving'); if(sound) audio.start();
    (focusBeforePause?.isConnected && focusBeforePause!==document.body?focusBeforePause:dom.pause).focus({preventScroll:true});
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
      !(e.code==='Space'&&document.activeElement?.matches('[data-key]'))) {
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
  const off=Math.abs(g.lateral)>1.02, limit=163+g.car.stats.speed*96+(boosting?41+g.car.stats.boost*22:0);
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
  const old=g.dist;
  g.dist+=dt*g.speed*4.2;
  g.lateral=clamps(g.lateral+dt*(g.velocity - curvature(g.dist,g.route)*g.speed*.0021),-1.32,1.32);
  g.elapsed+=dt; g.inv=Math.max(0,g.inv-dt);
  if(g.eventTTL>0) {g.eventTTL-=dt; if(g.eventTTL<=0)labelEvent('',0,false);}
  if(g.mode==='free') spawnTraffic(g);
  for(const o of [...g.traffic,...g.rivals]) {
    const previous=o.z;
    if(o.pace) o.speed=Math.min(o.pace,o.speed+dt*101);
    o.z+=dt*o.speed*4.2; o.x=o.lane+Math.sin(o.z*.001+o.i)*.12;
    const delta=o.z-g.dist, before=previous-old;
    if(g.inv===0&&(Math.abs(delta)<53||(before*delta<0))&&Math.abs(o.x-g.lateral)<.29&&g.speed>26) {
      g.speed*=.57; g.lateral=clamps(g.lateral+(g.lateral>=o.x?.18:-.18),-1.32,1.32);
      g.inv=.8; labelEvent('CONTATO',.72,false); audio.fx('collision');
    } else if(before>0&&delta<=0&&Math.abs(o.x-g.lateral)<.50) {
      g.charges=Math.min(1,g.charges+.15); g.bonus++;
      if(g.mode==='free') labelEvent('+ NITRO',.65,false);
    }
  }
  if(g.mode==='race') g.rank=1+g.rivals.filter(r=>r.z>g.dist).length;
  if(g.mode!=='free'&&g.dist>=g.route.length) {finish();return;}
  audio.setDrive({speed:g.speed/MAX_SPEED,boost:boosting,drift:drifting});
}
function updateHud() {
  const g=game; if(!g) return;
  const clock=timeLabel(g.elapsed), speed=String(Math.round(g.speed)).padStart(3,'0');
  const rank=g.mode==='race'?g.rank+'º / 6':g.mode==='time'?timeLabel(Number(read(recordKey(),'Infinity'))):(g.dist/4200).toFixed(1).replace('.',',')+' km';
  if(lastClock!==clock)dom['race-clock'].textContent=lastClock=clock;
  if(lastRank!==rank)dom.rank.textContent=lastRank=rank;
  if(lastSpeed!==speed)dom.speed.textContent=lastSpeed=speed;
  dom.nitro.style.transform='scaleX('+g.charges.toFixed(3)+')';
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
  ctx.fillText('C H E G A D A',p.x,p.y-high+height*.45,span*1.7);
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
function effect(g,now) {
  if(!g||!g.boost||reduce.matches)return;
  ctx.save();ctx.strokeStyle='rgba(255,194,169,.22)';ctx.lineWidth=1;
  ctx.beginPath();
  for(let i=0;i<22;i++) {
    const angle=noise(i+17)*Math.PI*2, phase=(now*.0025+noise(i+123))%1;
    const x=W*.5+Math.cos(angle)*W*.8*phase,y=H*.46+Math.sin(angle)*H*.83*phase;
    if(y>H*.84||y<H*.16)continue;
    const l=11+49*phase;ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*l,y+Math.sin(angle)*l);
  }
  ctx.stroke();ctx.restore();
}

function render(now) {
  if(W<2||H<2)return;
  const g=game, zone=g?.route??route, dist=g?.dist??demo, lateral=g?.lateral??(W>680?-.25:0);
  const horizon=H*(W<680?.405:.428);
  drawScenery(ctx,{width:W,height:H,horizon,distance:dist,course:zone.id,steer:lateral*.43,time:now/1000,reducedMotion:reduce.matches});
  const focal=W*(W<680?.67:.49);
  const bend0=trackX(dist,zone);
  function project(z) {
    const scale=1/(1+Math.max(0,z)/155);
    return {x:W*.5+(trackX(dist+z,zone)-bend0-lateral*.74)*focal*scale,
      y:horizon+(H-horizon)*scale,w:focal*scale,scale};
  }
  const step=44, far=3800;
  const first=Math.ceil(dist/step)*step;
  let p=project(far);
  const gates=[];
  for(let world=Math.floor((dist+far)/step)*step;world>=first;world-=step) {
    const z=world-dist, i=Math.floor(world/step),q=project(z);
    block(ctx,p,q,-1.18,1.18,i%4<2?'#53334d':'#4a2d51');
    block(ctx,p,q,-1,1,i%4<2?zone.road:zone.road+'ed');
    block(ctx,p,q,-1.025,-.998, i%4<2?zone.tint:'#d879c8');
    block(ctx,p,q,.998,1.025, i%4<2?zone.tint:'#d879c8');
    if(i%7<3) {
      block(ctx,p,q,-.349,-.320,zone.mark);
      block(ctx,p,q,.320,.349,zone.mark);
    }
    if(g&&g.mode!=='free'&&world>=zone.length&&world-step<zone.length) {
      for(let j=0;j<12;j++) block(ctx,p,q,-1+j/6,-1+(j+1)/6,j%2?'#e8d2e1':'#40344f');
      gates.push({z,gate:true});
    }
    if(i%5===0) gates.push({z,shoulder:true,i});
    p=q;
  }
  const end={...project(0),y:H+1};
  block(ctx,p,end,-1.18,1.18,'#4a2d51');block(ctx,p,end,-1,1,zone.road);
  block(ctx,p,end,-1.025,-.998,zone.tint);block(ctx,p,end,.998,1.025,zone.tint);
  if(Math.floor(dist/step)%7<3) {block(ctx,p,end,-.349,-.320,zone.mark);block(ctx,p,end,.320,.349,zone.mark);}
  const playerZ=52, carW=clamps(W*.138,68,174);
  gates.push({z:playerZ,me:true});
  if(g) for(const o of [...g.traffic,...g.rivals]) {
    const z=o.z-dist+45;
    if(z>5&&z<far)gates.push({z,o});
  }
  gates.sort((a,b)=>b.z-a.z);
  for(const item of gates) {
    const point=project(item.z);
    if(item.gate){drawGate(point,zone);continue;}
    if(item.shoulder){drawShoulder(point,item.i,zone);continue;}
    if(item.me) {
      const x=point.x+lateral*point.w, y=point.y;
      const moving=g?.speed??65, isDrift=g?.drift&&!reduce.matches;
      if(isDrift) {
        ctx.fillStyle='rgba(230,176,222,.19)';
        for(let i=0;i<6;i++){
          ctx.beginPath();
          ctx.ellipse(x+Math.sin(now*.006+i)*carW*.36,y+i*4,6+i*2,4+i,.2,0,2*Math.PI);ctx.fill();
        }
      }
      drawCar(ctx,{x,y,width:carW,car:g?.car??CARS[choice],time:reduce.matches?0:now/1000,steer:clamps((g?.velocity??0)/2.5,-1,1),boost:g?.boost&&!reduce.matches,player:true,speed:moving/MAX_SPEED});
      continue;
    }
    const o=item.o, width=carW*point.scale*(1+playerZ/155);
    if(width<3)continue;
    drawCar(ctx,{x:point.x+o.x*point.w,y:point.y,width,car:o.car,time:reduce.matches?0:now/1000,steer:0,boost:false,player:false,speed:o.speed/MAX_SPEED});
  }
  effect(g,now);
}
function frame(now) {
  const dt=clamps((now-last)/1000,0,.05);last=now;
  if(screen==='garage'&&!reduce.matches)demo+=dt*64;
  if(screen==='driving'&&game) {
    step(dt);hudDue-=dt;
    if(hudDue<=0){updateHud();hudDue=.055;}
  }
  if (screen==='driving'||screen==='garage'||frame.lastScreen!==screen||frame.width!==W||frame.height!==H) {
    render(now);frame.lastScreen=screen;frame.width=W;frame.height=H;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
