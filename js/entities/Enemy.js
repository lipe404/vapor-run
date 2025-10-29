import { gameState } from "../gameState.js";
import { GAME_CONFIG } from "../config.js";
import { lerp, map } from "../utils/utils.js";

export class Enemy {
  constructor(roadXNormalized, horizonY) {
    this._roadXNormalized = roadXNormalized;

    this.baseWidth = GAME_CONFIG.ENEMY.WIDTH_FACTOR * gameState.canvas.width;
    this.baseHeight = GAME_CONFIG.ENEMY.HEIGHT_FACTOR * gameState.canvas.height;

    this.speed =
      Math.random() *
        (GAME_CONFIG.ENEMY.MAX_SPEED_FACTOR -
          GAME_CONFIG.ENEMY.INITIAL_SPEED_FACTOR) +
      GAME_CONFIG.ENEMY.INITIAL_SPEED_FACTOR;

    this.lane = null;
    this.spawnTime = performance.now();

    // Parâmetros de perspectiva (consistentes com Renderer.js e GAME_CONFIG)
    this.perspectiveHorizonY = horizonY; // Usa o horizonY passado
    // Ponto Y na tela onde o inimigo atinge a escala máxima
    this.perspectiveNearY =
      gameState.canvas.height * GAME_CONFIG.ENEMY.NEAR_PLAYER_Y_FACTOR;
    this.minEnemyScale = GAME_CONFIG.ENEMY.MIN_SPAWN_SCALE;
    this.maxEnemyScale = GAME_CONFIG.ENEMY.MAX_APPROACH_SCALE;

    // === AJUSTE PARA O SURGIMENTO NO HORIZONTE ===
    // Calcula a altura escalada inicial quando o inimigo está no horizonte
    const initialScaledHeight = this.baseHeight * this.minEnemyScale;
    // Define _screenY (centro do inimigo) de forma que a BASE do inimigo fique exatamente na linha do horizonte (horizonY)
    this._screenY = horizonY - initialScaledHeight / 2;

    // Cálculo inicial de screenX e screenScale com base no _screenY calculado
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
    // Usamos canvas.height aqui para mapear em toda a altura visível da estrada
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
    // === AJUSTE PARA A VELOCIDADE EXPONENCIAL ===
    // 1. Calcula a posição Y normalizada na "zona de aproximação"
    // Este valor vai de 0 (no horizonte) a 1 (na parte inferior da tela)
    const normalizedY = map(
      this._screenY,
      this.perspectiveHorizonY,
      gameState.canvas.height, // Mapeia até a parte inferior da tela para que a velocidade continue aumentando
      0,
      1
    );
    const clampedNormalizedY = Math.max(0, normalizedY); // Garante que o valor não seja negativo

    // 2. Aplica uma curva exponencial para o fator de velocidade
    // Este fator irá de PERSPECTIVE_SPEED_MIN_FACTOR (no horizonte)
    // até PERSPECTIVE_SPEED_MAX_FACTOR (próximo ao jogador),
    // com um crescimento acelerado definido pelo PERSPECTIVE_SPEED_EXPONENT.
    const speedGrowthFactor = lerp(
      GAME_CONFIG.ENEMY.PERSPECTIVE_SPEED_MIN_FACTOR,
      GAME_CONFIG.ENEMY.PERSPECTIVE_SPEED_MAX_FACTOR,
      Math.pow(clampedNormalizedY, GAME_CONFIG.ENEMY.PERSPECTIVE_SPEED_EXPONENT)
    );

    // 3. Calcula a velocidade de movimento real para este frame
    // Move o carro para baixo na tela (aproximando-se do jogador)
    this._screenY +=
      this.speed * // Velocidade inicial aleatória do inimigo
      gameState.gameSpeed * // Velocidade global do jogo, que aumenta com a dificuldade
      GAME_CONFIG.ENEMY.PERSPECTIVE_SPEED_MULTIPLIER * // Multiplicador base de velocidade de perspectiva
      speedGrowthFactor * // NOVO: Fator de crescimento exponencial da velocidade baseado na posição Y
      deltaTime;

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
  const perspectiveHorizonY = canvas.height * 0.6; // Este valor define o horizonte visual da estrada

  const lane = Math.floor(Math.random() * GAME_CONFIG.ROAD_LANES);

  // Calcula a posição X normalizada para a pista
  const laneWidthFraction = 1 / GAME_CONFIG.ROAD_LANES;
  const roadXNormalized = (lane + 0.5) * laneWidthFraction - 0.5;

  // Instancia o inimigo, passando a posição X normalizada e o Y do horizonte
  const enemy = new Enemy(roadXNormalized, perspectiveHorizonY);
  enemy.lane = lane; // Mantém para referência
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
