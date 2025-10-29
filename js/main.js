/**
 * =========================================================
 *                   V A P O R R U N
 *     Um jogo de corrida com estética Vaporwave em JS Puro
 * =========================================================
 */

import { GAME_CONFIG } from "./config.js";
import { gameState, resetGameState } from "./gameState.js";
import { createPlayer, repositionPlayer } from "./entities/Player.js";
import { getRandomSpawnInterval } from "./entities/Enemy.js";
import { loadAssets, handleAssetsError } from "./systems/AssetLoader.js";
import { setupEventListeners } from "./systems/InputHandler.js";
import {
  initUIElements,
  showScreen,
  updateScoreDisplay,
} from "./systems/UIManager.js";
import { setupCanvas, resizeCanvas, render } from "./systems/Renderer.js";
import { gameLoop } from "./systems/GameLoop.js";

/**
 * Inicializa o jogo
 */
async function init() {
  try {
    console.log("🎮 Inicializando V A P O R R U N...");

    // 1. Configurar elementos UI
    initUIElements();

    // 2. Configurar canvas
    setupCanvas();

    // 3. Configurar eventos
    setupEventListeners();
    setupCustomEvents();

    // 4. Mostrar tela de loading
    showScreen("loading-screen");

    // 5. Carregar assets
    console.log("📦 Carregando assets...");
    await loadAssets();

    // 6. Marcar assets como carregados
    gameState.assetsLoaded = true;

    // 7. Finalizar loading
    const loadingBar = document.getElementById("loading-bar");
    if (loadingBar) {
      loadingBar.style.width = "100%";
    }

    // 8. Aguardar um pouco para mostrar 100%
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 9. Mostrar tela inicial
    showScreen("start-screen");

    console.log("✅ Jogo inicializado com sucesso!");
  } catch (error) {
    console.error("❌ Erro na inicialização:", error);
    handleAssetsError(error);
  }
}

/**
 * Configura eventos customizados
 */
function setupCustomEvents() {
  // Evento de redimensionamento do canvas
  window.addEventListener("canvasResize", () => {
    resizeCanvas();
  });

  // Evento para reposicionar player
  window.addEventListener("playerReposition", () => {
    repositionPlayer();
  });
}

/**
 * Inicia o jogo
 */
export function startGame() {
  if (!gameState.assetsLoaded) {
    console.warn("⚠️ Assets ainda não carregados. Aguarde...");
    return;
  }

  console.log("🚀 Iniciando jogo...");

  // Resetar estado
  resetGameState();

  // Configurar estado inicial
  gameState.gameStarted = true;
  gameState.gameOver = false;
  gameState.gameSpeed = GAME_CONFIG.INITIAL_GAME_SPEED;
  gameState.nextEnemySpawnTime = getRandomSpawnInterval();

  // Criar player
  gameState.player = createPlayer();

  // Mostrar UI do jogo
  showScreen("score-display");
  updateScoreDisplay();

  // Iniciar loop do jogo
  gameState.lastFrameTime = performance.now();
  requestAnimationFrame(gameLoopWithRender);

  console.log("🎯 Jogo iniciado!");
}

/**
 * Loop do jogo com renderização
 */
function gameLoopWithRender(timestamp) {
  if (!gameState.gameStarted || gameState.gameOver) {
    return;
  }

  const deltaTime = timestamp - gameState.lastFrameTime;
  gameState.lastFrameTime = timestamp;

  // Atualizar lógica do jogo
  updateGame(deltaTime);

  // Renderizar
  render(deltaTime);

  requestAnimationFrame(gameLoopWithRender);
}

/**
 * Atualiza a lógica do jogo (separado da renderização)
 */
function updateGame(deltaTime) {
  // Atualiza dificuldade
  gameState.difficultyTimer += deltaTime;
  const progress = Math.min(
    1,
    gameState.difficultyTimer / GAME_CONFIG.DIFFICULTY_RAMP_TIME
  );
  gameState.gameSpeed =
    GAME_CONFIG.INITIAL_GAME_SPEED +
    (GAME_CONFIG.MAX_GAME_SPEED - GAME_CONFIG.INITIAL_GAME_SPEED) * progress;

  // Atualiza player
  if (gameState.player) {
    gameState.player.update(deltaTime);
  }

  // Atualiza spawn de inimigos
  updateEnemySpawning(deltaTime);

  // Atualiza inimigos
  updateEnemies(deltaTime);

  // Atualiza partículas
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
    // Importação dinâmica para evitar dependência circular
    import("./entities/Enemy.js").then(
      ({ spawnEnemy, getRandomSpawnInterval }) => {
        spawnEnemy();
        gameState.enemySpawnTimer = 0;
        gameState.nextEnemySpawnTime = getRandomSpawnInterval();
      }
    );
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
      // Importação dinâmica
      import("./entities/Particle.js").then(({ createExplosionParticles }) => {
        createExplosionParticles(enemy.x, enemy.y, gameState.particles);
      });
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

  // Importação dinâmica
  import("./systems/UIManager.js").then(({ showGameOverScreen }) => {
    showGameOverScreen();
  });

  console.log(`💥 Game Over! Pontuação final: ${gameState.score}`);
}

/**
 * Função para pausar/despausar o jogo (futura implementação)
 */
export function togglePause() {
  // TODO: Implementar pausa
  console.log("⏸️ Pausa não implementada ainda");
}

/**
 * Função para reiniciar o jogo
 */
export function restartGame() {
  console.log("🔄 Reiniciando jogo...");
  startGame();
}

/**
 * Função para obter estatísticas do jogo
 */
export function getGameStats() {
  return {
    score: gameState.score,
    gameTime: gameState.difficultyTimer,
    enemiesDestroyed: gameState.score, // Assumindo 1 ponto por inimigo
    gameSpeed: gameState.gameSpeed,
    isPlaying: gameState.gameStarted && !gameState.gameOver,
  };
}

// Inicializar quando a página carregar
window.addEventListener("load", init);

// Exportar funções para debug no console
window.VAPOR_RUN = {
  startGame,
  togglePause,
  restartGame,
  getGameStats,
  gameState,
  GAME_CONFIG,
};

console.log(
  "🌴 V A P O R R U N carregado! Digite VAPOR_RUN no console para debug."
);
