import { gameState } from "../gameState.js";
import { GAME_CONFIG } from "../config.js";
import { lerp } from "../utils/utils.js";

/**
 * Configura o canvas
 */
export function setupCanvas() {
  gameState.canvas = document.getElementById("gameCanvas");
  gameState.ctx = gameState.canvas.getContext("2d");
  resizeCanvas();
}

/**
 * Redimensiona o canvas
 */
export function resizeCanvas() {
  const container = document.getElementById("game-container");
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  let canvasWidth = containerWidth;
  let canvasHeight = containerHeight;

  const currentAspectRatio = containerWidth / containerHeight;

  if (currentAspectRatio > GAME_CONFIG.ASPECT_RATIO) {
    canvasWidth = containerHeight * GAME_CONFIG.ASPECT_RATIO;
  } else {
    canvasHeight = containerWidth / GAME_CONFIG.ASPECT_RATIO;
  }

  gameState.canvas.width = canvasWidth;
  gameState.canvas.height = canvasHeight;

  // Dispara evento para reposicionar player
  window.dispatchEvent(new CustomEvent("playerReposition"));
}

/**
 * Renderiza todos os objetos do jogo
 */
export function render(deltaTime) {
  clearCanvas();

  gameState.ctx.save();
  applyScreenShake();

  drawBackground(deltaTime);
  drawPlayer();
  drawEnemies();
  drawParticles();

  gameState.ctx.restore();
}

/**
 * Limpa o canvas
 */
function clearCanvas() {
  gameState.ctx.clearRect(
    0,
    0,
    gameState.canvas.width,
    gameState.canvas.height
  );
}

/**
 * Aplica efeito de screen shake
 */
function applyScreenShake() {
  if (gameState.shakeIntensity <= 0) return;

  const x = (Math.random() - 0.5) * gameState.shakeIntensity;
  const y = (Math.random() - 0.5) * gameState.shakeIntensity;
  gameState.ctx.translate(x, y);

  gameState.shakeIntensity *= GAME_CONFIG.EFFECTS.SCREEN_SHAKE_DECAY;
  if (gameState.shakeIntensity < 0.1) {
    gameState.shakeIntensity = 0;
  }
}

/**
 * Desenha o fundo completo
 */
function drawBackground(deltaTime) {
  const { ctx, canvas } = gameState;

  drawSky(ctx, canvas);
  drawSun(ctx, canvas);
  drawMountains(ctx, canvas, gameState.skyOffset);
  drawRoad(ctx, canvas, gameState.roadOffset);
  drawPalmTrees(ctx, canvas, gameState.skyOffset);
}

/**
 * Desenha o céu gradiente
 */
function drawSky(ctx, canvas) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, GAME_CONFIG.COLORS.PURPLE_DARK);
  gradient.addColorStop(0.5, GAME_CONFIG.COLORS.PURPLE_MID);
  gradient.addColorStop(1, GAME_CONFIG.COLORS.MAGENTA);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Desenha o sol retrô
 */
function drawSun(ctx, canvas) {
  const sunRadius = canvas.width * 0.2;
  const sunX = canvas.width / 2;
  const sunY = canvas.height * 0.2;

  ctx.save();
  ctx.shadowColor = GAME_CONFIG.COLORS.ORANGE;
  ctx.shadowBlur = 20;

  // Círculo principal do sol
  ctx.fillStyle = GAME_CONFIG.SCENERY.SUN_COLOR;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  // Linhas horizontais do sol
  ctx.strokeStyle = GAME_CONFIG.SCENERY.SUN_LINE_COLOR;
  ctx.lineWidth = 2;
  for (let i = 0; i < GAME_CONFIG.SCENERY.SUN_LINE_COUNT; i++) {
    const y =
      sunY -
      sunRadius +
      i * ((sunRadius * 2) / GAME_CONFIG.SCENERY.SUN_LINE_COUNT);
    const xOffset = Math.sqrt(sunRadius * sunRadius - (y - sunY) * (y - sunY));
    if (xOffset > 0) {
      ctx.beginPath();
      ctx.moveTo(sunX - xOffset, y);
      ctx.lineTo(sunX + xOffset, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Desenha as montanhas wireframe
 */
function drawMountains(ctx, canvas, offset) {
  ctx.save();
  ctx.strokeStyle = GAME_CONFIG.SCENERY.MOUNTAIN_GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.shadowColor = GAME_CONFIG.SCENERY.MOUNTAIN_GRID_COLOR;
  ctx.shadowBlur = 5;

  const mountainHeight = canvas.height * 0.2;
  const horizonY = canvas.height * 0.4;
  const baseLine = canvas.height * 0.6;

  for (let i = 0; i < GAME_CONFIG.SCENERY.MOUNTAIN_COUNT; i++) {
    const xBase =
      (i / GAME_CONFIG.SCENERY.MOUNTAIN_COUNT) * canvas.width * 1.5 -
      ((offset * canvas.width * 0.5) % (canvas.width * 1.5));
    const peakX = xBase + canvas.width * 0.1;
    const peakY =
      horizonY - mountainHeight * (0.5 + Math.sin(xBase / 1000) * 0.2);

    const startX = xBase - canvas.width * 0.08;
    const endX = xBase + canvas.width * 0.2;

    ctx.beginPath();
    ctx.moveTo(startX, baseLine);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(endX, baseLine);
    ctx.stroke();

    // Grid interno
    const gridLines = 5;
    for (let j = 1; j < gridLines; j++) {
      const ratio = j / gridLines;
      ctx.beginPath();
      ctx.moveTo(lerp(startX, peakX, ratio), lerp(baseLine, peakY, ratio));
      ctx.lineTo(lerp(endX, peakX, ratio), lerp(baseLine, peakY, ratio));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Desenha a estrada com perspectiva
 */
function drawRoad(ctx, canvas, offset) {
  const roadConfig = GAME_CONFIG.ROAD;
  const roadWidthAtBottom = canvas.width * roadConfig.WIDTH_FACTOR;
  const roadWidthAtTop = canvas.width * 0.1;
  const horizonY = canvas.height * 0.6;

  // Ombro da estrada
  ctx.fillStyle = roadConfig.SHOULDER_COLOR;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo((canvas.width - roadWidthAtBottom) / 2, canvas.height);
  ctx.lineTo((canvas.width - roadWidthAtTop) / 2 - 20, horizonY);
  ctx.lineTo(0, horizonY - 10);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(canvas.width, canvas.height);
  ctx.lineTo((canvas.width + roadWidthAtBottom) / 2, canvas.height);
  ctx.lineTo((canvas.width + roadWidthAtTop) / 2 + 20, horizonY);
  ctx.lineTo(canvas.width, horizonY - 10);
  ctx.closePath();
  ctx.fill();

  // Estrada principal
  ctx.fillStyle = roadConfig.COLOR;
  ctx.beginPath();
  ctx.moveTo((canvas.width - roadWidthAtTop) / 2, horizonY);
  ctx.lineTo((canvas.width + roadWidthAtTop) / 2, horizonY);
  ctx.lineTo((canvas.width + roadWidthAtBottom) / 2, canvas.height);
  ctx.lineTo((canvas.width - roadWidthAtBottom) / 2, canvas.height);
  ctx.closePath();
  ctx.fill();

  // Linhas da estrada
  ctx.fillStyle = roadConfig.LINE_COLOR;
  ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
  ctx.shadowBlur = 5;

  const numLines = 15;
  for (let i = 0; i < numLines; i++) {
    let zPos = (i / numLines - offset) % 1;
    if (zPos < 0) zPos += 1;

    const lineY = lerp(canvas.height, horizonY, zPos * zPos);
    if (lineY < horizonY + 10) continue;

    const currentRoadWidth = lerp(roadWidthAtBottom, roadWidthAtTop, zPos);
    const lineWidth = currentRoadWidth * roadConfig.LINE_WIDTH_FACTOR;
    const lineHeight = lerp(
      canvas.height * roadConfig.LINE_HEIGHT_FACTOR,
      canvas.height * 0.005,
      zPos
    );

    const centerX = canvas.width / 2;
    ctx.fillRect(
      centerX - lineWidth / 2,
      lineY - lineHeight / 2,
      lineWidth,
      lineHeight
    );

    // Linhas das pistas
    if (GAME_CONFIG.ROAD_LANES > 1) {
      const laneWidth = currentRoadWidth / GAME_CONFIG.ROAD_LANES;
      const numSeparators = GAME_CONFIG.ROAD_LANES - 1;

      for (let j = 0; j < numSeparators; j++) {
        const separatorX = centerX - currentRoadWidth / 2 + (j + 1) * laneWidth;
        if ((zPos * 100) % 20 > 10) {
          ctx.fillRect(
            separatorX - lineWidth / 4,
            lineY - lineHeight / 2,
            lineWidth / 2,
            lineHeight
          );
        }
      }
    }
  }
  ctx.shadowBlur = 0;
}

/**
 * Desenha palmeiras wireframe
 */
function drawPalmTrees(ctx, canvas, offset) {
  ctx.save();
  ctx.strokeStyle = GAME_CONFIG.SCENERY.PALM_TREE_COLOR;
  ctx.lineWidth = 3;
  ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
  ctx.shadowBlur = 8;

  const baseLine = canvas.height * 0.6;

  for (let i = 0; i < GAME_CONFIG.SCENERY.PALM_TREE_COUNT; i++) {
    let xPos =
      (i * 0.73 * canvas.width - offset * canvas.width * 0.3) %
      (canvas.width * 1.2);
    if (xPos < -canvas.width * 0.1) xPos += canvas.width * 1.2;

    const side = i % 2 === 0 ? -1 : 1;
    xPos = side === -1 ? xPos * 0.3 : canvas.width - xPos * 0.3;

    const treeHeight = canvas.height * (0.15 + Math.sin(i) * 0.05);
    const treeY = baseLine - treeHeight;

    // Tronco
    ctx.beginPath();
    ctx.moveTo(xPos, baseLine);
    ctx.lineTo(xPos + treeHeight * 0.1, treeY);
    ctx.stroke();

    // Folhas
    const leafCount = 6;
    for (let j = 0; j < leafCount; j++) {
      const angle = (j / leafCount) * Math.PI * 2;
      const leafLength = treeHeight * 0.4;
      const leafEndX = xPos + Math.cos(angle) * leafLength;
      const leafEndY = treeY + Math.sin(angle) * leafLength * 0.5;

      ctx.beginPath();
      ctx.moveTo(xPos, treeY);
      ctx.lineTo(leafEndX, leafEndY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Desenha o jogador
 */
function drawPlayer() {
  if (gameState.player) {
    gameState.player.draw();
  }
}

/**
 * Desenha todos os inimigos
 */
function drawEnemies() {
  gameState.enemies.forEach((enemy) => enemy.draw());
}

/**
 * Desenha todas as partículas
 */
function drawParticles() {
  gameState.particles.forEach((particle) => particle.draw(gameState.ctx));
}
