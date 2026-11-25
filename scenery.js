// Vapor Run scenic layers. Coordinates are CSS pixels; no DOM or network assets required.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const fract = x => x - Math.floor(x)
const mix = (a, b, t) => a + (b - a) * t
const hash = (n, s = 0) => fract(Math.sin(n * 127.1 + s * 311.7) * 43758.5453)

const PALETTES = {
  coast: {
    sky: ['#17123a', '#43236a', '#af437f', '#ff9276'],
    sun: ['#ffed9f', '#ff9273', '#f03a91'], near: '#211633', floor: ['#332650', '#111126'],
    edge: '#fa72b6', distant: '#754477', lagoon: '#9c6298', starColor: '#f7c9f2', placement: .27,
  },
  city: {
    sky: ['#0a1434', '#26396c', '#7862ae', '#ef8ea8'],
    sun: ['#ffe4a9', '#ff8cb0', '#da45db'], near: '#161a34', floor: ['#27355a', '#111526'],
    edge: '#70dfff', distant: '#3b487a', lagoon: '#6b62a6', starColor: '#c3f3ff', placement: .74,
  },
  canyon: {
    sky: ['#210f36', '#51203d', '#ac4a51', '#ffad70'],
    sun: ['#fff197', '#ffb069', '#f04584'], near: '#391731', floor: ['#5a2641', '#210f24'],
    edge: '#ffa15f', distant: '#984658', lagoon: '#b85b62', starColor: '#ffe6b4', placement: .50,
  },
}

function gradient(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  for (const [point, value] of stops) g.addColorStop(point, value)
  return g
}

function poly(ctx, points) {
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
  ctx.closePath()
}

// These positions are world-like phases. They wrap, rather than accumulating screen-space objects.
function worldPhase(distance, speed, offset, span) {
  return ((distance * speed + offset) % span + span) % span
}

function cutSun(ctx, x, y, r, p) {
  ctx.save()
  const glow = ctx.createRadialGradient(x, y, r * .53, x, y, r * 1.8)
  glow.addColorStop(0, p.sun[1] + '48')
  glow.addColorStop(1, p.sun[1] + '00')
  ctx.fillStyle = glow
  ctx.fillRect(x - r * 1.8, y - r * 1.8, r * 3.6, r * 3.6)
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = gradient(ctx, x, y - r, x, y + r, [[0, p.sun[0]], [.52, p.sun[1]], [1, p.sun[2]]])
  ctx.fillRect(x - r, y - r, 2 * r, 1.02 * r)
  for (const [start, thickness] of [[.06,.11], [.25,.105], [.45,.085], [.65,.06], [.84,.045], [.97,.02]]) {
    ctx.fillRect(x - r, y + start * r, 2 * r, thickness * r)
  }
  ctx.restore()
}

function stars(ctx, w, horizon, p) {
  ctx.fillStyle = p.starColor
  for (let i = 0; i < 38; i++) {
    const a = hash(i, 2)
    const x = hash(i, 3) * w
    const y = (.035 + a * .65) * horizon
    const size = hash(i, 4) > .92 ? 1.55 : 1
    ctx.globalAlpha = (1 - a) * (.35 + .52 * hash(i, 5))
    ctx.fillRect(x, y, size, size)
  }
  ctx.globalAlpha = 1
}

function mountains(ctx, w, y, scale, shift, kind, p) {
  const segment = scale * (kind === 'canyon' ? .95 : .63)
  const frac = shift / segment
  const first = Math.floor(frac) - 2
  const far = Math.ceil(w / segment) + 4
  ctx.fillStyle = p.distant
  ctx.beginPath()
  ctx.moveTo(-segment * 2, y + 2)
  for (let i = 0; i < far; i++) {
    const n = first + i, x = (n - frac) * segment
    const tall = (.42 + .6 * hash(n, 7)) * scale
    if (kind === 'canyon') {
      ctx.lineTo(x, y - scale * .08)
      ctx.lineTo(x + segment * .19, y - tall * .63)
      ctx.lineTo(x + segment * .26, y - tall)
      ctx.lineTo(x + segment * .57, y - tall * (.83 + .15 * hash(n, 8)))
      ctx.lineTo(x + segment * .70, y - tall * .58)
      ctx.lineTo(x + segment * .83, y - scale * .08)
    } else {
      ctx.lineTo(x, y - tall * .1)
      ctx.lineTo(x + segment * .35, y - tall * .56)
      ctx.lineTo(x + segment * .62, y - tall)
      ctx.lineTo(x + segment * .79, y - tall * .3)
    }
  }
  ctx.lineTo(w + segment * 2, y + 2)
  ctx.closePath()
  ctx.fill()
}

function skyline(ctx, w, y, unit, phase, p, time) {
  const scroll = phase / unit
  const first = Math.floor(scroll) - 2
  const count = Math.ceil(w / unit) + 5
  const flashes = Math.floor(time / 760)
  const cyan = new Path2D(), pink = new Path2D()
  for (let i = 0; i < count; i++) {
    const n = first + i, x = (n - scroll) * unit
    const tall = unit * (.45 + hash(n, 11) * 3)
    const bw = unit * (.70 + hash(n, 12) * .27)
    const top = y - tall
    const trim = Math.max(1, Math.floor(unit * .038))
    ctx.fillStyle = n % 3 === 0 ? '#26284e' : p.near
    ctx.fillRect(x, top, bw, tall + 1)
    ctx.fillStyle = '#586382'
    ctx.fillRect(x, top, bw, trim)
    if (hash(n, 13) > .71) {
      ctx.fillStyle = '#c490df'
      ctx.fillRect(x + bw * .68, top - unit * .48, trim, unit * .48)
      if (hash(n + flashes, 18) > .42 || n % 2 === 0) {
        pink.rect(x + bw * .68, top - unit * .49, trim + 1, trim + 1)
      }
    }
    const cols = bw > 18 ? 3 : 2, rows = Math.min(9, Math.floor(tall / (unit * .28)))
    for (let j = 1; j < rows; j++) {
      for (let k = 0; k < cols; k++) {
        const lit = hash(n * 17 + j * 3 + k, 14)
        if (lit < .53) continue
        const path = lit > .84 ? pink : cyan
        path.rect(x + (k + .68) * bw / (cols + .2), top + j * unit * .28, trim + 1, trim)
      }
    }
  }
  ctx.fillStyle = '#6388a9'
  ctx.fill(cyan)
  ctx.fillStyle = '#e690c9'
  ctx.fill(pink)
}

function shore(ctx, w, y, allHeight, p, phase, distance) {
  ctx.save()
  ctx.fillStyle = p.lagoon
  ctx.globalAlpha = .19
  ctx.fillRect(0, y, w, allHeight * .43)
  ctx.lineWidth = 1
  for (let i = 0; i < 18; i++) {
    const t = (i + 1) / 19
    const width = mix(.04, .30, t) * w * hash(i, 23)
    const x = fract(hash(i, 21) + distance * .000018 * (t + .15)) * w + phase *.08
    const yy = y + t * t * allHeight * .46
    ctx.globalAlpha = (1 - t) * (.1 + hash(i, 28) * .46)
    ctx.strokeStyle = i % 3 ? '#e49aba' : '#ffcb99'
    ctx.beginPath()
    ctx.moveTo(x - width, yy)
    ctx.lineTo(x, yy)
    ctx.stroke()
  }
  ctx.restore()
}

function palm(ctx, x, bottom, h, lean, alpha = 1) {
  ctx.save()
  ctx.translate(x, bottom)
  ctx.scale(h, h)
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#191426'
  ctx.strokeStyle = '#422044'
  ctx.lineWidth = .013
  ctx.beginPath()
  ctx.moveTo(-.037, 0)
  ctx.quadraticCurveTo(lean * .35 - .013, -.50, lean - .018, -.91)
  ctx.lineTo(lean + .025, -.92)
  ctx.quadraticCurveTo(lean * .59 + .015, -.44, .02, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.translate(lean, -.92)
  const fronds = [
    [-.43,-.10,-.17,-.18,-.34,-.02],
    [-.44,.12,-.26,-.059,-.23,.073],
    [-.33,.30,-.23,.027,-.15,.13],
    [-.18,-.23,-.10,-.18,-.17,-.09],
    [.22,-.23,.12,-.18,.13,-.09],
    [.47,-.03,.27,-.19,.25,-.016],
    [.43,.18,.33,-.027,.25,.10],
    [.26,.30,.23,.041,.12,.14],
  ]
  for (const [ex, ey, cx, cy, loX, loY] of fronds) {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(cx, cy, ex, ey)
    ctx.quadraticCurveTo(loX, loY, .014, .018)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function outcrops(ctx, w, h, horizon, p, phase, depth) {
  const width = Math.max(55, w * .19)
  const unit = width * 1.22
  const scroll = phase / unit
  const start = Math.floor(scroll) - 2
  for (let i = 0; i < Math.ceil(w / unit) + 5; i++) {
    const n = start + i, x = (n - scroll) * unit
    const y = horizon + (h - horizon) * (.31 + hash(n, 30) * .46)
    const tall = (h - horizon) * (.15 + hash(n, 31) * .43)
    const spread = width * (.56 + hash(n, 34) * .45)
    ctx.fillStyle = depth ? '#361731' : '#54283f'
    poly(ctx, [[x,y], [x+spread*.17,y-tall*.63], [x+spread*.27,y-tall*.82], [x+spread*.41,y-tall*.8], [x+spread*.48,y-tall], [x+spread*.73,y-tall*.92], [x+spread*.89,y-tall*.35], [x+spread,y]])
    ctx.fill()
    ctx.strokeStyle = depth ? '#6e354c' : '#994f56'
    ctx.lineWidth = 1.25
    ctx.beginPath()
    ctx.moveTo(x+spread*.14,y-tall*.50)
    ctx.lineTo(x+spread*.55,y-tall*.49)
    ctx.lineTo(x+spread*.86,y-tall*.38)
    ctx.moveTo(x+spread*.25,y-tall*.79)
    ctx.lineTo(x+spread*.42,y-tall*.77)
    ctx.lineTo(x+spread*.53,y-tall*.87)
    ctx.lineTo(x+spread*.75,y-tall*.80)
    ctx.stroke()
  }
}

function floorGrid(ctx, w, h, horizon, p, distance, x) {
  const ground = h - horizon
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, horizon, w, ground)
  ctx.clip()
  ctx.lineWidth = 1
  ctx.strokeStyle = p.edge
  ctx.globalAlpha = .19
  ctx.beginPath()
  for (let i = -9; i <= 9; i++) {
    ctx.moveTo(x + i * w * .008, horizon)
    ctx.lineTo(w * .5 + i * w * .135, h)
  }
  ctx.stroke()

  for (let i = 0; i < 13; i++) {
    const t = fract((i + 1) / 13 + distance * .00036)
    const yy = horizon + ground * t * t * t
    ctx.globalAlpha = .06 + .24 * t
    ctx.fillStyle = p.edge
    ctx.fillRect(0, yy, w, 1)
  }
  ctx.restore()
}

export function drawScenery(ctx, { width, height, horizon, distance = 0, course = 'coast', steer = 0, time = 0, reducedMotion = false }) {
  if (!(width > 0 && height > 0)) return
  const w = width, h = height
  const y = clamp(Number.isFinite(horizon) ? horizon : h * .42, h * .15, h * .8)
  const kind = Object.hasOwn(PALETTES, course) ? course : 'coast'
  const p = PALETTES[kind]
  const camera = clamp(Number.isFinite(steer) ? steer : 0, -1, 1) * (reducedMotion ? w * .008 : w * .026)
  const d = reducedMotion ? distance * .55 : distance
  const step = Math.min(w, h)
  ctx.save()
  ctx.globalAlpha = 1
  ctx.fillStyle = gradient(ctx, 0, 0, 0, y + 5, [[0, p.sky[0]], [.51, p.sky[1]], [.83, p.sky[2]], [1, p.sky[3]]])
  ctx.fillRect(0, 0, w, y + 2)
  stars(ctx, w, y, p)
  const sunSize = step * (kind === 'city' ? .105 : .132)
  cutSun(ctx, w * p.placement - camera * .14, y - sunSize * .62, sunSize, p)
  ctx.globalAlpha = .56
  mountains(ctx, w, y, step * (kind === 'canyon' ? .138 : .081), worldPhase(d, .068, camera, step * 40), kind, p)
  ctx.globalAlpha = 1

  if (kind === 'city') {
    skyline(ctx, w, y, Math.max(11, step * .038), worldPhase(d, .085, camera * .44, step * 44), p, reducedMotion ? 0 : time)
  } else if (kind === 'canyon') {
    ctx.globalAlpha = .77
    mountains(ctx, w, y, step * .083, worldPhase(d, .11, camera * 1.2 + step, step * 52), kind, { ...p, distant: '#692e4a' })
    ctx.globalAlpha = 1
  } else {
    ctx.globalAlpha = .86
    mountains(ctx, w, y, step * .048, worldPhase(d, .086, camera * .55 + step, step * 45), kind, { ...p, distant: '#543457' })
    ctx.globalAlpha = 1
  }

  ctx.fillStyle = gradient(ctx, 0, y, 0, h, [[0, p.floor[0]], [1, p.floor[1]]])
  ctx.fillRect(0, y, w, h - y)
  if (kind === 'coast') shore(ctx, w, y, h - y, p, camera, d)
  floorGrid(ctx, w, h, y, p, d, w * .5 - camera * .68)

  if (kind === 'coast') {
    const side = step * .23
    const lightScroll = Math.sin(d * .009) * side * .055
    palm(ctx, w * .08 - camera * .78 + lightScroll, y + (h - y) * .70, side * 1.24, .23)
    palm(ctx, w * .93 - camera * .94 - lightScroll, y + (h - y) * .64, side * 1.1, -.20, .96)
    palm(ctx, w * .14 - camera * .51, y + (h - y) * .30, side * .63, .17, .8)
    palm(ctx, w * .88 - camera * .55, y + (h - y) * .27, side * .60, -.13, .82)
  } else if (kind === 'canyon') {
    outcrops(ctx, w, h, y, p, worldPhase(d, .30, camera * 1.4, step * 42), true)
  } else {
    // Sparse light trails under the skyline, leaving the gameplay corridor uncluttered.
    for (let i = 0; i < 7; i++) {
      const a = hash(i, 73), t = .1 + .85 * hash(i, 71)
      const px = fract(a + d * .00015 * t) * w
      ctx.globalAlpha = .14 + t * .3
      ctx.fillStyle = i % 2 ? '#b898f9' : '#5ad6f5'
      ctx.fillRect(px, y + (h - y) * t * t, (8 + 31 * t) * Math.min(1, w / 560), 1 + (t > .7 ? 1 : 0))
    }
    ctx.globalAlpha = 1
  }

  const rim = ctx.createRadialGradient(w * .5, h * .52, step * .48, w * .5, h * .52, Math.hypot(w,h) * .62)
  rim.addColorStop(0, '#0d0c1b00')
  rim.addColorStop(1, '#0c0a1d53')
  ctx.fillStyle = rim
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}
