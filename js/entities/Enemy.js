// Enemy.js
import { gameState } from "../gameState.js";
import { GAME_CONFIG } from "../config.js";
import { lerp, map } from "../utils/utils.js"; // Importe map e lerp

export class Enemy {
  // roadXNormalized: Posição X relativa na estrada (-0.5 para esquerda, 0 para centro, 0.5 para direita)
  // initialScreenY: Posição Y inicial na tela (geralmente o horizonte)
  constructor(roadXNormalized, initialScreenY) {
    this._roadXNormalized = roadXNormalized; // Propriedade interna para a posição X normalizada na estrada
    this._screenY = initialScreenY; // Propriedade interna para a posição Y na tela

    this.baseWidth = GAME_CONFIG.ENEMY.WIDTH_FACTOR * gameState.canvas.width;
    this.baseHeight = GAME_CONFIG.ENEMY.HEIGHT_FACTOR * gameState.canvas.height;

    this.speed =
      Math.random() *
        (GAME_CONFIG.ENEMY.MAX_SPEED_FACTOR -
          GAME_CONFIG.ENEMY.INITIAL_SPEED_FACTOR) +
      GAME_CONFIG.ENEMY.INITIAL_SPEED_FACTOR;

    this.lane = null; // Ainda útil para lógica de pistas
    this.spawnTime = performance.now();

    // Parâmetros de perspectiva (consistentes com Renderer.js e GAME_CONFIG)
    this.perspectiveHorizonY = gameState.canvas.height * 0.6; // Onde a estrada começa visualmente
    // Ponto Y na tela onde o inimigo atinge sua escala máxima
    this.perspectiveNearY =
      gameState.canvas.height * GAME_CONFIG.ENEMY.NEAR_PLAYER_Y_FACTOR;
    this.minEnemyScale = GAME_CONFIG.ENEMY.MIN_SPAWN_SCALE;
    this.maxEnemyScale = GAME_CONFIG.ENEMY.MAX_APPROACH_SCALE;

    // Cálculo inicial de screenX e screenScale com base no _screenY inicial
    this._screenScale = this._calculateScale();
    this._screenX = this._calculateScreenX();
  }

  // Getters para acesso público (usados por draw, collidesWith, isOutOfBounds)
  get y() {
    return this._screenY;
  }
  get x() {
    return this._screenX;
  }
  get scale() {
    return this._screenScale;
  }

  // Helper para calcular a posição X na tela com base na posição X normalizada da estrada e no Y atual
  _calculateScreenX() {
    const { canvas } = gameState;
    const roadWidthAtBottom = canvas.width * GAME_CONFIG.ROAD.WIDTH_FACTOR;
    const roadWidthAtTop = canvas.width * 0.1; // Consistente com Renderer.js drawRoad

    // 't' representa a profundidade normalizada (0 no horizonte, 1 na parte inferior da tela)
    const t = map(this._screenY, this.perspectiveHorizonY, canvas.height, 0, 1);
    const currentRoadWidth = lerp(roadWidthAtTop, roadWidthAtBottom, t);

    const roadCenterX = canvas.width / 2;

    // Calcula a posição X na tela em relação ao centro da estrada
    return roadCenterX + this._roadXNormalized * currentRoadWidth;
  }

  // Helper para calcular a escala com base na posição Y na tela
  _calculateScale() {
    // Mapeia _screenY do horizonte até nearY para a escala minEnemyScale até maxEnemyScale
    const normalizedY = map(
      this._screenY,
      this.perspectiveHorizonY,
      this.perspectiveNearY,
      0,
      1
    );

    // Aplica uma curva para o crescimento da escala (exponencial) para uma aproximação mais natural
    // normalizedY^1.5 significa que o crescimento é mais lento no início e mais rápido no final
    const curvedNormalizedY = Math.pow(Math.max(0, normalizedY), 1.5); // Experimente com o expoente (1.0 para linear, 2.0 para mais acentuado)

    return lerp(this.minEnemyScale, this.maxEnemyScale, curvedNormalizedY);
  }

  draw() {
    if (!gameState.images.enemy || !gameState.assetsLoaded) return;

    const ctx = gameState.ctx;
    ctx.save();
    ctx.shadowColor = GAME_CONFIG.ENEMY.SHADOW_COLOR;
    ctx.shadowBlur = GAME_CONFIG.ENEMY.SHADOW_BLUR;

    const scaledWidth = this.baseWidth * this.scale;
    const scaledHeight = this.baseHeight * this.scale;

    // Usa as propriedades _screenX e _screenY pré-calculadas
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
    // Move o carro para baixo na tela (aproximando-se do jogador)
    this._screenY +=
      this.speed *
      deltaTime *
      gameState.gameSpeed *
      GAME_CONFIG.ENEMY.PERSPECTIVE_SPEED_MULTIPLIER;

    // Recalcula screenX e screenScale com base no novo _screenY
    this._screenScale = this._calculateScale();
    this._screenX = this._calculateScreenX();

    // Limita a escala para evitar tamanhos excessivos antes de ser removido
    this._screenScale = Math.min(this._screenScale, this.maxEnemyScale * 2); // Permite um pouco maior antes de sair da tela
  }

  isOutOfBounds() {
    const scaledHeight = this.baseHeight * this.scale;
    // Verifica se a parte inferior do inimigo está fora da tela + buffer
    return this.y - scaledHeight / 2 > gameState.canvas.height + 50;
  }

  collidesWith(player) {
    const scaledWidth = this.baseWidth * this.scale;
    const scaledHeight = this.baseHeight * this.scale;
    const enemyX = this.x - scaledWidth / 2;
    const enemyY = this.y - scaledHeight / 2;

    // Hitbox ajustada (não precisa de alterações, usa as propriedades calculadas)
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

  // Define a linha do horizonte Y (consistente com a classe Enemy)
  const perspectiveHorizonY = canvas.height * 0.6;

  const lane = Math.floor(Math.random() * GAME_CONFIG.ROAD_LANES);

  // Calcula a posição X normalizada para a pista
  // Para 3 pistas, por exemplo:
  // pista 0: aproximadamente -0.33 (centro da pista da esquerda)
  // pista 1: 0 (centro da pista do meio)
  // pista 2: aproximadamente 0.33 (centro da pista da direita)
  const laneWidthFraction = 1 / GAME_CONFIG.ROAD_LANES; // Largura fracional de uma única pista (ex: 1/3)
  // roadXNormalized varia de -0.5 a 0.5, onde 0 é o centro da estrada total
  const roadXNormalized = (lane + 0.5) * laneWidthFraction - 0.5;

  const enemy = new Enemy(roadXNormalized, perspectiveHorizonY);
  enemy.lane = lane; // Mantém para referência
  gameState.enemies.push(enemy);
}

/**
 * Retorna um intervalo aleatório para spawn (não precisa de alterações)
 */
export function getRandomSpawnInterval() {
  const { SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX } = GAME_CONFIG.ENEMY;

  const difficultyFactor =
    1 - (gameState.difficultyTimer / GAME_CONFIG.DIFFICULTY_RAMP_TIME) * 0.7;
  const adjustedMin = SPAWN_INTERVAL_MIN * Math.max(0.3, difficultyFactor);
  const adjustedMax = SPAWN_INTERVAL_MAX * Math.max(0.3, difficultyFactor);

  return Math.random() * (adjustedMax - adjustedMin) + adjustedMin;
}
