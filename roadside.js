// Painter for track-bound scenery; units are normalized against a projected prop size.
// Ground origin is at p.y, and graphics are mirrored to sit outside either shoulder.
const TAU = 2 * Math.PI
const mod = (n, m) => ((n % m) + m) % m
function polygon(c, points, fill) {
  c.beginPath()
  c.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1])
  c.closePath()
  c.fillStyle = fill
  c.fill()
}
function rect(c,x,y,w,h,fill) { c.fillStyle = fill; c.fillRect(x,y,w,h) }
function line(c, color, width, points) {
  c.beginPath(); c.strokeStyle = color; c.lineWidth = width
  c.moveTo(points[0][0],points[0][1])
  for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1])
  c.stroke()
}
function ground(c, x, y, rx, ry) {
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle='#120b2555';c.fill()
}
function palm(c, detail) {
  ground(c,.12,0,.27,.04)
  polygon(c,[[-.035,0],[.018,-.63],[.125,-.98],[.17,-.98],[.106,-.53],[.043,0]],'#251735')
  if(detail)line(c,'#a65b80',.013,[[.021,-.06],[.065,-.55],[.143,-.98]])
  c.fillStyle='#542747'
  c.save();c.translate(.145,-.97)
  const leaves=[[-.38,-.08,-.20,-.15],[-.36,.17,-.25,-.015],[-.19,.25,-.15,.06],[-.14,-.25,-.08,-.19],[.17,-.23,.08,-.16],[.40,-.04,.25,-.20],[.36,.16,.24,-.01],[.18,.26,.17,.05]]
  for (const [x,y,a,b] of leaves) {
    c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(a,b,x,y);c.quadraticCurveTo(x*.58,y*.59+.038,0,.025);c.fill()
  }
  c.restore()
}
function hut(c, detail) {
  ground(c,.49,0,.59,.055)
  rect(c,.12,-.36,.065,.36,'#341b39');rect(c,.79,-.36,.065,.36,'#341b39');rect(c,.97,-.29,.044,.27,'#482949')
  polygon(c,[[.03,-.66],[.69,-.71],[.69,-.35],[.03,-.34]],'#e38f99')
  polygon(c,[[.69,-.71],[.89,-.60],[.89,-.36],[.69,-.35]],'#a34d79')
  polygon(c,[[-.08,-.65],[.19,-.91],[.73,-.92],[.98,-.64],[.68,-.67]],'#582c5f')
  polygon(c,[[.22,-.88],[.73,-.89],[.87,-.71],[.69,-.72],[-.01,-.68]],'#f0aab3')
  rect(c,.17,-.63,.39,.18,'#5d3e68')
  rect(c,.196,-.603,.145,.118,'#a9f3ee');rect(c,.365,-.603,.164,.118,'#ffd9a6')
  rect(c,-.005,-.39,.98,.06,'#ffc6a6')
  if(detail){
    line(c,'#703e65',.022,[[.71,-.13],[.97,-.13],[.97,-.30],[.83,-.30]])
    line(c,'#f6bfba',.024,[[.85,-.36],[1.12,-.04]])
    for(let i=1;i<6;i++)rect(c,.84+.037*i,-.35+.05*i,.13,.018,'#a86584')
  }
}
function pier(c, detail) {
  ground(c,.52,0,.58,.05)
  for(let i=0;i<5;i++){
    const x=.14+i*.20,y=-.21-i*.044
    rect(c,x+ .025,y,.032,-y,'#442644');rect(c,x+.12,y-.055,.028,-y+.055,'#6c4465')
  }
  polygon(c,[[.03,-.23],[.89,-.42],[1.1,-.37],[.23,-.14]],'#a9768f')
  line(c,'#f4a695',.018,[[.03,-.23],[.89,-.42],[1.1,-.37]])
  if(detail)for(let i=0;i<6;i++){
    const x=.08+i*.155,y=-.23-i*.029
    rect(c,x,y-.105,.025,.13,'#f4b599')
    line(c,'#d394a6',.011,[[x,y-.080],[x+.146,y-.108]])
  }
}
function gantry(c, detail) {
  ground(c,.49,0,.49,.052)
  rect(c,.64,-1.02,.085,1.02,'#354570')
  rect(c,.705,-1.02,.074,1.02,'#202d55')
  polygon(c,[[.74,-1.03],[.74,-.89],[-.08,-.89],[-.08,-.99]],'#27385a')
  rect(c,-.07,-.986,.80,.018,'#7acbe4')
  polygon(c,[[.53,-.88],[.65,-.72],[.65,-.81],[.57,-.895]],'#465781')
  rect(c,.54,-.06,.31,.06,'#2a304c')
  for(let i=0;i<3;i++)rect(c,.095+.12*i,-.947,.068,.033,i%2?'#f1a6cf':'#90e2f2')
  if(detail){
    line(c,'#819ec0',.015,[[.77,-.032],[.77,-1.02],[.56,-1.08],[.07,-1.027]])
    for(let i=0;i<4;i++)rect(c,.675,-.32-i*.135,.027,.065,'#5c88a5')
  }
}
function sign(c, detail, variant) {
  ground(c,.39,0,.39,.035)
  rect(c,.18,-.56,.043,.56,'#38436d');rect(c,.62,-.52,.045,.52,'#38436d')
  rect(c,.076,-.85,.73,.42,'#293356');rect(c,.101,-.824,.68,.37,'#77c6df')
  rect(c,.122,-.804,.638,.329,'#242047')
  const main=variant===0?'#ffaac9':'#9fe6ea'
  line(c,main,.026,[[.19,-.709],[.31,-.709],[.36,-.736],[.67,-.736]])
  line(c,main,.024,[[.19,-.610],[.271,-.610],[.332,-.646],[.67,-.646]])
  if(detail){
    rect(c,.20,-.549,.42,.015,'#bd74be')
    for(let i=0;i<4;i++)rect(c,.21+.1*i,-.526,.046,.014,'#4d97bb')
  }
}
function bollard(c, detail) {
  ground(c,.08,0,.15,.038)
  polygon(c,[[0,0],[.02,-.35],[.12,-.39],[.17,-.32],[.17,-.01]],'#323a5b')
  rect(c,.048,-.297,.081,.063,'#98e9fc')
  if(detail)rect(c,.058,-.209,.063,.02,'#f3a8e4')
}
function mesa(c, detail, variant) {
  const rock = variant?'#ac5768':'#d58273'
  ground(c,.52,.01,.62,.075)
  polygon(c,[[-.02,0],[.128,-.38],[.20,-.62],[.30,-.85],[.62,-.88],[.78,-.72],[.91,-.31],[1.05,0]],rock)
  polygon(c,[[.31,-.85],[.37,-.58],[.42,-.32],[.48,0],[.71,0],[.687,-.54],[.62,-.88]],'#723d57')
  polygon(c,[[.78,-.72],[.688,-.53],[.71,0],[1.05,0],[.91,-.31]],'#4e284b')
  if(detail){
    line(c,'#fca080',.018,[[.14,-.438],[.292,-.456],[.386,-.481],[.58,-.482],[.69,-.469],[.842,-.515]])
    line(c,'#e48475',.021,[[.069,-.221],[.21,-.262],[.43,-.258],[.52,-.287],[.72,-.267],[.934,-.273]])
    line(c,'#cf7769',.015,[[.214,-.647],[.35,-.678],[.52,-.659],[.62,-.679],[.816,-.639]])
  }
}
function chevron(c, detail) {
  ground(c,.30,0,.29,.038)
  rect(c,.12,-.54,.042,.54,'#5c3b60')
  rect(c,.55,-.55,.042,.55,'#5c3b60')
  rect(c,.035,-.73,.64,.285,'#ffb371')
  rect(c,.054,-.708,.604,.241,'#46273d')
  for(let i=0;i<(detail?3:2);i++){
    const x=.135+i*.17
    // Both shoulders point inward rather than mirroring the traffic message.
    polygon(c,[[x+.097,-.696],[x+.027,-.589],[x+.097,-.483],[x+.027,-.483],[x-.044,-.589],[x+.027,-.696]],'#ffb374')
  }
}
function cactus(c, detail) {
  ground(c,.25,0,.29,.037)
  line(c,'#275150',.076,[[.23,-.02],[.23,-.68]])
  line(c,'#386f5e',.052,[[.23,-.30],[.089,-.39],[.089,-.53]])
  line(c,'#4d7460',.057,[[.23,-.40],[.39,-.46],[.39,-.56]])
  if(detail)line(c,'#d69972',.016,[[.22,-.06],[.22,-.66]])
}

export function drawRoadside(ctx, { p, index = 0, course = 'coast', side = 1 }) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !(p.w >= 6)) return
  const direction = side < 0 ? -1 : 1
  const i = Math.trunc(index)
  const seed = mod(Math.floor(i / 5) + (direction < 0 ? 3 : 0), 11)
  const detail = p.w > 30 && p.scale > .07
  const w = p.w
  const size = w * (course === 'city' ? .34 : course === 'canyon' ? .38 : .34)
  const offset = w * (1.16 + (seed % 3) * .026)
  ctx.save()
  ctx.translate(p.x + direction * offset, p.y)
  ctx.scale(size * direction, size)
  if(course === 'city') {
    if(seed === 0 || seed === 7) gantry(ctx,detail)
    else if(seed % 3 === 0) sign(ctx,detail,seed % 2)
    else if(seed % 3 === 1) bollard(ctx,detail)
  } else if(course === 'canyon') {
    if(seed % 4 === 0 || seed === 7) mesa(ctx,detail,seed % 2)
    else if(seed % 4 === 2) chevron(ctx,detail)
    else if(seed % 4 === 1) cactus(ctx,detail)
  } else {
    if(seed === 0 || seed === 7) hut(ctx,detail)
    else if(seed === 4 || seed === 9) pier(ctx,detail)
    else if(seed % 2 === 0 || seed === 3) palm(ctx,detail)
  }
  ctx.restore()
}
