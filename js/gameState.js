/**
 * Estado global do jogo
 */
export const gameState = {
  // Canvas e Contexto
  canvas: null,
  ctx: null,

  // UI Elements
  uiElements: {},

  // Estado do Jogo
  gameStarted: false,
  gameOver: false,
  lastFrameTime: 0,
  score: 0,
  gameSpeed: 0,
  difficultyTimer: 0,

  // Entidades do Jogo
  player: null,
  enemies: [],
  particles: [],

  // Controles
  keys: {
    left: false,
    right: false,
    enter: false,
    space: false,
  },
  playerVelocityX: 0,

  // Assets
  images: {},
  assetsLoaded: false,
  assetsLoadingProgress: 0,

  // Efeitos
  shakeIntensity: 0,
  roadOffset: 0,
  skyOffset: 0,
  enemySpawnTimer: 0,
  nextEnemySpawnTime: 0,
};

/**
 * Reseta o estado do jogo
 */
export function resetGameState() {
  gameState.gameStarted = false;
  gameState.gameOver = false;
  gameState.score = 0;
  gameState.gameSpeed = 0;
  gameState.difficultyTimer = 0;
  gameState.enemies = [];
  gameState.particles = [];
  gameState.playerVelocityX = 0;
  gameState.shakeIntensity = 0;
  gameState.roadOffset = 0;
  gameState.skyOffset = 0;
  gameState.enemySpawnTimer = 0;
  gameState.nextEnemySpawnTime = 0;

  // Player será criado em createPlayer()
  gameState.player = null;
}
