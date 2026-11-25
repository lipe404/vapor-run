// All silhouettes and light clusters are built from original vector geometry.
const model = (id, name, tagline, color, stats, shape) => Object.freeze({
  id, name, tagline, color, stats: Object.freeze(stats), shape: Object.freeze(shape),
});

export const CARS = Object.freeze([
  model("ion-gt", "ION GT", "Precisão de pista, sob o neon.", "#4de9ef",
    { speed: .78, handling: .88, boost: .69 },
    { roof: 22, cabin: -50, deck: -31, shoulder: 43, light: "#a1fffa", deep: "#125369", dark: "#0b2e46", stripe: "#9affed", badge: "ION", style: "ribbon" }),
  model("ember-rs", "EMBER RS", "Largo, nervoso e rápido na saída.", "#ff6c53",
    { speed: .92, handling: .64, boost: .82 },
    { roof: 27, cabin: -48, deck: -33, shoulder: 45, light: "#ffb06c", deep: "#842635", dark: "#491b2c", stripe: "#ffe0a0", badge: "RS", style: "slots" }),
  model("nocturne-v12", "NOCTURNE V12", "V12 rente ao chão, rei da reta.", "#bf79fa",
    { speed: .98, handling: .57, boost: .91 },
    { roof: 18, cabin: -43, deck: -32, shoulder: 46, light: "#ff9afc", deep: "#643e99", dark: "#391d5c", stripe: "#f3b3fe", badge: "V12", style: "triple" }),
  model("mirage-rally", "MIRAGE RALLY", "Suspensão alta, ágil nas curvas.", "#cef76c",
    { speed: .66, handling: .97, boost: .76 },
    { roof: 24, cabin: -58, deck: -38, shoulder: 40, light: "#efffac", deep: "#5f7f34", dark: "#354922", stripe: "#e9ff99", badge: "MR", style: "square" }),
]);

const CAR_BY_ID = new Map(CARS.map((car) => [car.id, car]));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const num = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

function path(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index++) ctx.lineTo(points[index][0], points[index][1]);
  ctx.closePath();
}

function fill(ctx, points, color) {
  path(ctx, points);
  ctx.fillStyle = color;
  ctx.fill();
}

function stripe(ctx, points, color, width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index++) ctx.lineTo(points[index][0], points[index][1]);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function grad(ctx, x0, y0, x1, y1, stops) {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [position, color] of stops) gradient.addColorStop(position, color);
  return gradient;
}

function vents(ctx, where, count, spacing, lean = 1) {
  for (let i = 0; i < count; i++) {
    const [x, y] = where;
    const offset = i * spacing;
    fill(ctx, [[x+offset,y],[x+offset+lean,y-4],[x+offset+lean+2,y-4],[x+offset+2,y]], "#0b1020");
  }
}

function rearLights(ctx, kind, color, detailed) {
  const glow = kind === "triple" ? "#f66dfa" : kind === "ribbon" ? "#ff4599" : "#ff394f";
  if (detailed) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 5;
  }
  if (kind === "ribbon") {
    fill(ctx, [[-44,-26],[-16,-26],[-11,-24],[11,-24],[16,-26],[44,-26],[42,-21],[16,-21],[10,-22],[-10,-22],[-16,-21],[-42,-21]], glow);
    stripe(ctx, [[-42,-25],[-17,-25],[-13,-23],[13,-23],[17,-25],[42,-25]], "#ffd8f0", 1.55);
  } else if (kind === "slots") {
    for (const sign of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const y = -27 + i * 4.8;
        fill(ctx, [[sign*43,y],[sign*21,y+1],[sign*19,y+3],[sign*42,y+3]], i ? "#ff5b55" : "#ffba8e");
      }
    }
  } else if (kind === "triple") {
    for (const sign of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const x = sign * (24 + 7.5 * i);
        fill(ctx, [[x-3,-28],[x+3,-27],[x+1,-20],[x-4,-21]], i === 2 ? "#ffc6fd" : glow);
      }
    }
  } else {
    for (const sign of [-1, 1]) {
      const x = sign < 0 ? -42 : 22;
      rect(ctx, x, -29, 20, 7.5, "#501b24");
      rect(ctx, x + 1.3, -28, 10.4, 5.5, glow);
      rect(ctx, x + 12.5, -28, 6, 5.5, "#ffc278");
    }
  }
  ctx.shadowBlur = 0;
  if (detailed) {
    if (kind === "triple") rect(ctx, -4, -33.5, 8, 1.6, color);
    else rect(ctx, -5, -31, 10, 1.25, color);
  }
}

function drawExhaust(ctx, style, phase, boost, detailed) {
  const placements = style === "triple" ? [-11, 0, 11] : style === "slots" ? [-37, -29, 29, 37] : [-31, 31];
  for (let index = 0; index < placements.length; index++) {
    const x = placements[index];
    if (boost > .04 && (style !== "slots" || index === 0 || index === placements.length-1)) {
      const flicker = (Math.sin(phase * 43 + index * 1.4) + 1) * .5;
      const length = (11 + 6 * flicker) * boost;
      const flame = grad(ctx, x, -9, x, length, [[0, "#ffffff"], [.24, "#91fff5"], [.55, "#49a9ff"], [1, "rgba(128,83,255,0)"]]);
      fill(ctx, [[x-3.5,-9],[x+3.5,-9],[x+2.6,1],[x, length],[x-1.7,1]], flame);
      if (detailed) fill(ctx, [[x-1.4,-9],[x+1.7,-9],[x+0.3,3+3*flicker]], "#f3fffb");
    }
    ellipse(ctx, x, -8, 3.8, 2.6, "#252a3a");
    ellipse(ctx, x, -8, 2.75, 1.75, "#070a13");
  }
}

/**
 * Draw a car in rear chase perspective. x is horizontal center; y is the tires'
 * contact point; width is the overall visible width in canvas pixels.
 * steer: -1..1; speed/boost: 0..1 (boolean boost also accepted); time: seconds.
 * Works for static garage previews (omit motion arguments) and in-game traffic.
 */
export function drawCar(ctx, options = {}) {
  const x = num(options.x), y = num(options.y), width = num(options.width);
  if (width <= 0) return;
  const car = typeof options.car === "string" ? CAR_BY_ID.get(options.car) ?? CARS[0] : options.car ?? CARS[0];
  const model = car.shape ?? (CAR_BY_ID.get(car.id) ?? CARS[0]).shape;
  const color = car.color ?? CARS[0].color;
  const { roof, cabin, deck, shoulder, light, deep, dark, badge, style } = model;
  const steering = clamp(num(options.steer), -1, 1);
  const speed = clamp(num(options.speed), 0, 1);
  const boost = clamp(options.boost === true ? 1 : num(options.boost), 0, 1);
  const phase = num(options.time);
  const anim = options.player ? (.22 * speed * (Math.sin(phase * 42) + 1)) : 0;
  const detailed = width >= 30;
  const scale = width / 100;

  ctx.save();
  try {
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ellipse(ctx, 0, -1, 49, detailed ? 8 : 5, "rgba(0,0,0,.56)");
    if (options.player && boost > 0 && detailed) {
      ellipse(ctx, 0, 1, 44, 11, `rgba(42,154,255,${0.12 * boost})`);
    }
    ctx.translate(steering * 1.35, -anim);
    ctx.rotate(steering * .027);
    ctx.lineJoin = "round";
    const lean = steering * 3;
    const body = [
      [-49,-9],[-50,-18],[-47,-28],[-shoulder,deck-2],[-33,deck-5],
      [-roof-6,cabin+7],[-roof,cabin],[roof,cabin],[roof+6,cabin+7],
      [33,deck-5],[shoulder,deck-2],[47,-28],[50,-18],[49,-9],[41,-6],[-41,-6],
    ];
    // Tires beneath the body; the visible strip gives the car its planted stance.
    fill(ctx, [[-49,-21],[-37,-21],[-37,-1],[-46,0],[-49,-3]], "#090a11");
    fill(ctx, [[37,-21],[49,-21],[49,-3],[46,0],[37,-1]], "#090a11");
    if (detailed) {
      rect(ctx,-47,-6,1.2,4.6,"#242836");
      rect(ctx,46,-6,1.2,4.6,"#242836");
    }

    fill(ctx, body, detailed
      ? grad(ctx, 0, cabin, 4, -5, [[0,light],[.30,color],[.64,deep],[1,dark]])
      : color);
    // Side volumes connect the narrow wheelbase perspective to the rear shoulders.
    fill(ctx, [[-47,-27],[-34,deck-4],[-roof-5,cabin+8],[-roof+3,cabin+7],[-25,deck-2],[-40,-22]], deep);
    fill(ctx, [[47,-27],[34,deck-4],[roof+5,cabin+8],[roof-3,cabin+7],[25,deck-2],[40,-22]], deep);

    // Top rear glass has inflected shoulders and a sloping bottom edge.
    const glass = [[-roof+4+lean,cabin+4],[roof-4+lean,cabin+4],[roof+8,deck-5],[-roof-8,deck-5]];
    fill(ctx, glass, detailed
      ? grad(ctx, 0, cabin, 0, deck-4, [[0,"#37486d"],[.54,"#20213a"],[1,"#0b1020"]])
      : "#171b2d");
    if (detailed) {
      stripe(ctx, [[-roof+4+lean,cabin+4],[roof-4+lean,cabin+4]], "rgba(219,244,255,.52)", .85);
      stripe(ctx, [[-roof-3,deck-8],[roof+3,deck-8]], "rgba(102,161,208,.18)", .8);
      fill(ctx, [[-roof+9+lean,cabin+4],[-roof+14+lean,cabin+4],[-roof+22,deck-5],[-roof+12,deck-5]], "rgba(200,234,255,.11)");
    }

    // Rear deck / wing variants anchor each silhouette.
    if (style === "slots") {
      fill(ctx, [[-36,-39],[-32,-37],[-32,-29],[-36,-29]], "#151427");
      fill(ctx, [[32,-37],[36,-39],[36,-29],[32,-29]], "#151427");
      fill(ctx, [[-45,-41],[-40,-44],[40,-44],[45,-41],[43,-38],[-43,-38]], "#1b1729");
      if (detailed) stripe(ctx,[[-42,-41],[42,-41]],color,1.5);
    } else if (style === "triple") {
      fill(ctx, [[-42,-34],[-28,-38],[28,-38],[42,-34],[40,-31],[-40,-31]], dark);
      if (detailed) stripe(ctx,[[-37,-34],[-22,-36],[22,-36],[37,-34]],light,.95);
    } else if (style === "square") {
      fill(ctx, [[-38,-44],[-35,-48],[35,-48],[38,-44],[36,-42],[-36,-42]], "#19242e");
      rect(ctx,-31,-43,3.3,7,"#202533");
      rect(ctx,27.7,-43,3.3,7,"#202533");
      if (detailed) stripe(ctx,[[-35,-46],[35,-46]],color,1.25);
    } else {
      fill(ctx, [[-37,-29],[-29,deck-4],[29,deck-4],[37,-29]], deep);
      if (detailed) stripe(ctx,[[-33,-31],[-24,-34],[24,-34],[33,-31]],light,1.25);
    }

    const panel = [[-46,-29],[-40,-31],[40,-31],[46,-29],[48,-16],[42,-11],[-42,-11],[-48,-16]];
    fill(ctx, panel, detailed
      ? grad(ctx, 0, -31, 0, -11, [[0,deep],[.35,dark],[1,"#151524"]])
      : deep);
    fill(ctx, [[-48,-13],[-24,-14],[24,-14],[48,-13],[44,-7],[31,-4],[-31,-4],[-44,-7]], "#111322");
    rearLights(ctx, style, light, detailed);
    if (detailed) {
      stripe(ctx,[[-44,-17],[-20,-17],[-13,-15],[13,-15],[20,-17],[44,-17]],"rgba(210,225,255,.24)",.75);
      vents(ctx, [-23,-8], 4, 3.1, -.9);
      vents(ctx, [11,-8], 4, 3.1, .9);
      rect(ctx, -7.5, -18.5, 15, 5.5, "#24283e");
      rect(ctx, -6.2, -17.2, 12.4, 2.6, model.stripe);
      if (width >= 58) {
        ctx.font = "800 3px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#101528";
        ctx.fillText(badge, 0, -15.9);
      }
      if (style === "square") {
        fill(ctx,[[-48,-5],[-44,-5],[-44,0],[-48,0]],"#c94f58");
        fill(ctx,[[44,-5],[48,-5],[48,0],[44,0]],"#c94f58");
      }
    }
    drawExhaust(ctx, style, phase, boost, detailed);
  } finally {
    ctx.restore();
  }
}
