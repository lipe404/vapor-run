import { gameState } from "../gameState.js";
import { GAME_CONFIG } from "../config.js";

export class Enemy {
  constructor(x, y, initialScale = 0.1) {
    this.x = x;
    this.y = y;
    this.initialY = y;
    this.baseWidth = GAME_CONFIG.ENEMY.WIDTH_FACTOR * gameState.canvas.width;
    this.baseHeight = GAME_CONFIG.ENEMY.HEIGHT_FACTOR * gameState.canvas.height;
    this.speed =
      Math.random() *
        (GAME_CONFIG.ENEMY.MAX_SPEED_FACTOR -
          GAME_CONFIG.ENEMY.INITIAL_SPEED_FACTOR) +
      GAME_CONFIG.ENEMY.INITIAL_SPEED_FACTOR;
    this.scale = initialScale;
    this.lane = null;
    this.spawnTime = performance.now();
  }

  draw() {
    if (!gameState.images.enemy || !gameState.assetsLoaded) return;

    const ctx = gameState.ctx;
    ctx.save();
    ctx.shadowColor = GAME_CONFIG.ENEMY.SHADOW_COLOR;
    ctx.shadowBlur = GAME_CONFIG.ENEMY.SHADOW_BLUR;

    const scaledWidth = this.baseWidth * this.scale;
    const scaledHeight = this.baseHeight * this.scale;
    const drawX = this.x - scaledWidth / 2;
    const drawY = this.y - scaledHeight / 2;

    ctx.drawImage(
      gameState.images.enemy,
      drawX,
      drawY,
      scaledWidth,
      scaledHeight
    );
    ctx.restore();
  }

  update(deltaTime) {
    this.y += this.speed * deltaTime * gameState.gameSpeed * 100;
    this.scale += GAME_CONFIG.ENEMY.GROWTH_FACTOR * deltaTime;

    if (this.scale > 2) this.scale = 2;
  }

  isOutOfBounds() {
    const scaledWidth = this.baseWidth * this.scale;
    const scaledHeight = this.baseHeight * this.scale;
    return (
      this.y - scaledHeight / 2 > gameState.canvas.height + 50 ||
      this.x + scaledWidth / 2 < -50 ||
      this.x - scaledWidth / 2 > gameState.canvas.width + 50
    );
  }

  collidesWith(player) {
    const scaledWidth = this.baseWidth * this.scale;
    const scaledHeight = this.baseHeight * this.scale;
    const enemyX = this.x - scaledWidth / 2;
    const enemyY = this.y - scaledHeight / 2;

    // Hitbox ajustada
    const playerHitboxX = player.x + player.width * 0.1;
    const playerHitboxWidth = player.width * 0.8;
    const playerHitboxY = player.y + player.height * 0.1;
    const playerHitboxHeight = player.height * 0.8;

    const enemyHitboxX = enemyX + scaledWidth * 0.1;
    const enemyHitboxWidth = scaledWidth * 0.8;
    const enemyHitboxY = enemyY + scaledHeight * 0.1;
    const enemyHitboxHeight = scaledHeight * 0.8;

    return !(
      enemyHitboxX + enemyHitboxWidth < playerHitboxX ||
      enemyHitboxX > playerHitboxX + playerHitboxWidth ||
      enemyHitboxY + enemyHitboxHeight < playerHitboxY ||
      enemyHitboxY > playerHitboxY + playerHitboxHeight
    );
  }
}

/**
 * Cria um novo inimigo em uma pista aleatória
 */
export function spawnEnemy() {
  const { canvas } = gameState;
  const roadWidth = canvas.width * GAME_CONFIG.ROAD.WIDTH_FACTOR;
  const laneWidth = roadWidth / GAME_CONFIG.ROAD_LANES;

  const lane = Math.floor(Math.random() * GAME_CONFIG.ROAD_LANES);
  const laneCenter = (canvas.width - roadWidth) / 2 + (lane + 0.5) * laneWidth;
  const initialY = canvas.height * 0.6 - 50;

  const enemy = new Enemy(laneCenter, initialY, 0.1);
  enemy.lane = lane;
  gameState.enemies.push(enemy);
}

/**
 * Retorna um intervalo aleatório para spawn
 */
export function getRandomSpawnInterval() {
  const { SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX } = GAME_CONFIG.ENEMY;

  const difficultyFactor =
    1 - (gameState.difficultyTimer / GAME_CONFIG.DIFFICULTY_RAMP_TIME) * 0.7;
  const adjustedMin = SPAWN_INTERVAL_MIN * Math.max(0.3, difficultyFactor);
  const adjustedMax = SPAWN_INTERVAL_MAX * Math.max(0.3, difficultyFactor);

  return Math.random() * (adjustedMax - adjustedMin) + adjustedMin;
}
