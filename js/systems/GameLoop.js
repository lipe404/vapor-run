import { gameState } from "../gameState.js";
import { GAME_CONFIG } from "../config.js";
import { spawnEnemy, getRandomSpawnInterval } from "../entities/Enemy.js";
import { createExplosionParticles } from "../entities/Particle.js";
import { updateScoreDisplay, showGameOverScreen } from "./UIManager.js";

/**
 * Loop principal do jogo
 */
export function gameLoop(timestamp) {
  if (!gameState.gameStarted || gameState.gameOver) {
    return;
  }

  const deltaTime = timestamp - gameState.lastFrameTime;
  gameState.lastFrameTime = timestamp;

  update(deltaTime);

  // Render será chamado externamente
  requestAnimationFrame(gameLoop);
}

/**
 * Atualiza o estado do jogo
 */
function update(deltaTime) {
  // Atualiza dificuldade
  gameState.difficultyTimer += deltaTime;
  const progress = Math.min(
    1,
    gameState.difficultyTimer / GAME_CONFIG.DIFFICULTY_RAMP_TIME
  );
  gameState.gameSpeed =
    GAME_CONFIG.INITIAL_GAME_SPEED +
    (GAME_CONFIG.MAX_GAME_SPEED - GAME_CONFIG.INITIAL_GAME_SPEED) * progress;

  // Atualiza entidades
  if (gameState.player) {
    gameState.player.update(deltaTime);
  }

  updateEnemySpawning(deltaTime);
  updateEnemies(deltaTime);
  updateParticles(deltaTime);

  // Atualiza offsets de cenário
  gameState.roadOffset =
    (gameState.roadOffset + gameState.gameSpeed * deltaTime * 0.1) % 1;
  gameState.skyOffset =
    (gameState.skyOffset + gameState.gameSpeed * deltaTime * 0.01) % 1;
}

/**
 * Controla spawn de inimigos
 */
function updateEnemySpawning(deltaTime) {
  gameState.enemySpawnTimer += deltaTime;

  if (gameState.enemySpawnTimer >= gameState.nextEnemySpawnTime) {
    spawnEnemy();
    gameState.enemySpawnTimer = 0;
    gameState.nextEnemySpawnTime = getRandomSpawnInterval();
  }
}

/**
 * Atualiza todos os inimigos
 */
function updateEnemies(deltaTime) {
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    const enemy = gameState.enemies[i];
    enemy.update(deltaTime);

    // Verifica colisão
    if (gameState.player && enemy.collidesWith(gameState.player)) {
      createExplosionParticles(enemy.x, enemy.y, gameState.particles);
      endGame();
      return;
    }

    // Remove inimigos fora da tela
    if (enemy.isOutOfBounds()) {
      gameState.enemies.splice(i, 1);
      gameState.score += GAME_CONFIG.UI.SCORE_INCREMENT;
      updateScoreDisplay();
    }
  }
}

/**
 * Atualiza partículas
 */
function updateParticles(deltaTime) {
  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const particle = gameState.particles[i];
    particle.update();

    if (particle.life <= 0) {
      gameState.particles.splice(i, 1);
    }
  }
}

/**
 * Termina o jogo
 */
function endGame() {
  gameState.gameOver = true;
  gameState.shakeIntensity = GAME_CONFIG.EFFECTS.SCREEN_SHAKE_DURATION;
  showGameOverScreen();
}
