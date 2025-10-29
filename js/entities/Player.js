import { gameState } from "../gameState.js";
import { GAME_CONFIG } from "../config.js";

export class Player {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw() {
    if (!gameState.images.car || !gameState.assetsLoaded) return;

    const ctx = gameState.ctx;
    ctx.save();
    ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
    ctx.shadowBlur = 15;
    ctx.drawImage(
      gameState.images.car,
      this.x,
      this.y,
      this.width,
      this.height
    );
    ctx.restore();
  }

  update(deltaTime) {
    const { keys, canvas } = gameState;
    const { SPEED, ACCEL, DECEL_FACTOR } = GAME_CONFIG.PLAYER;

    let targetVelocityX = 0;

    if (keys.left) {
      targetVelocityX = -SPEED;
    } else if (keys.right) {
      targetVelocityX = SPEED;
    }

    // Aceleração e desaceleração suave
    gameState.playerVelocityX +=
      (targetVelocityX - gameState.playerVelocityX) * ACCEL * deltaTime;
    gameState.playerVelocityX *= DECEL_FACTOR;

    this.x += gameState.playerVelocityX * deltaTime;

    // Limita a posição X dentro do canvas
    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
  }
}

/**
 * Cria uma nova instância do player
 */
export function createPlayer() {
  const { canvas } = gameState;
  const { WIDTH_FACTOR, HEIGHT_FACTOR, Y_POS_FACTOR } = GAME_CONFIG.PLAYER;

  const width = WIDTH_FACTOR * canvas.width;
  const height = HEIGHT_FACTOR * canvas.height;
  const x = (canvas.width - width) / 2;
  const y = canvas.height * Y_POS_FACTOR - height / 2;

  return new Player(x, y, width, height);
}

/**
 * Reposiciona o player (usado quando o canvas é redimensionado)
 */
export function repositionPlayer() {
  if (!gameState.player) return;

  const { canvas } = gameState;
  const { WIDTH_FACTOR, HEIGHT_FACTOR, Y_POS_FACTOR } = GAME_CONFIG.PLAYER;

  gameState.player.width = WIDTH_FACTOR * canvas.width;
  gameState.player.height = HEIGHT_FACTOR * canvas.height;
  gameState.player.x = (canvas.width - gameState.player.width) / 2;
  gameState.player.y =
    canvas.height * Y_POS_FACTOR - gameState.player.height / 2;
}
