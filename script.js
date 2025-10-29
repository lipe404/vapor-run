// 1. CONFIGURAÇÕES DO JOGO
const GAME_CONFIG = {
  // Configurações Globais
  FPS_TARGET: 60,
  ASPECT_RATIO: 16 / 9, // Proporção mais widescreen
  BASE_HEIGHT: 720, // Altura base para cálculos proporcionais
  ROAD_LANES: 3, // Número de pistas para inimigos
  INITIAL_GAME_SPEED: 0.005, // Velocidade base do cenário
  MAX_GAME_SPEED: 0.015, // Velocidade máxima do cenário
  DIFFICULTY_RAMP_TIME: 120000, // Tempo em ms para atingir a dificuldade máxima (2 minutos)

  // Cores Vaporwave
  COLORS: {
    PURPLE_DARK: "#20002c",
    PURPLE_MID: "#6f00ff",
    PINK: "#ff00ff",
    MAGENTA: "#ff1493",
    CYAN: "#00ffff",
    BLUE: "#0000ff",
    ORANGE: "#ffa500",
    WHITE: "#ffffff",
    GRAY: "#cccccc",
  },

  // Player
  PLAYER_SPEED: 0.5, // Velocidade de movimento lateral
  PLAYER_ACCEL: 0.05, // Aceleração/Desaceleração
  PLAYER_DECEL_FACTOR: 0.9, // Fator de desaceleração
  PLAYER_WIDTH_FACTOR: 0.08, // Largura relativa ao canvas
  PLAYER_HEIGHT_FACTOR: 0.12, // Altura relativa ao canvas
  PLAYER_Y_POS_FACTOR: 0.85, // Posição Y relativa ao canvas

  // Inimigos
  ENEMY_SPAWN_INTERVAL_MIN: 1000, // Intervalo mínimo de spawn (ms)
  ENEMY_SPAWN_INTERVAL_MAX: 3000, // Intervalo máximo de spawn (ms)
  ENEMY_INITIAL_SPEED_FACTOR: 0.003, // Velocidade inicial relativa ao cenário
  ENEMY_MAX_SPEED_FACTOR: 0.008, // Velocidade máxima relativa ao cenário
  ENEMY_WIDTH_FACTOR: 0.05, // Largura inicial relativa
  ENEMY_HEIGHT_FACTOR: 0.08, // Altura inicial relativa
  ENEMY_GROWTH_FACTOR: 0.002, // Quão rápido o inimigo cresce com a profundidade
  ENEMY_SHADOW_BLUR: 10,
  ENEMY_SHADOW_COLOR: "#ff00ff",

  // Road
  ROAD_WIDTH_FACTOR: 0.6, // Largura da estrada relativa ao canvas
  ROAD_LINE_WIDTH_FACTOR: 0.01,
  ROAD_LINE_HEIGHT_FACTOR: 0.05,
  ROAD_LINE_GAP_FACTOR: 0.08,
  ROAD_COLOR: "#333344",
  ROAD_LINE_COLOR: "#ffffff",
  ROAD_SHOULDER_COLOR: "#444455",

  // Cenário (Parallax)
  PALM_TREE_COUNT: 10,
  PALM_TREE_COLOR: "#ff00ff",
  MOUNTAIN_GRID_COLOR: "#ff00ff",
  MOUNTAIN_COUNT: 5,
  SUN_COLOR: "#ff8800",
  SUN_LINE_COLOR: "#ff00ff",
  SUN_LINE_COUNT: 20,

  // Efeitos
  SCREEN_SHAKE_DURATION: 15,
  SCREEN_SHAKE_DECAY: 0.9,
  PARTICLE_COUNT: 30,
  PARTICLE_LIFE: 30, // frames
  GLITCH_EFFECT_INTENSITY: 5, // Pixels de offset para glitch

  // UI
  SCORE_INCREMENT: 1,
};

// 2. ESTADO DO JOGO
const gameState = {
  // Canvas e Contexto
  canvas: null,
  ctx: null,

  // UI Elements (referências a elementos HTML)
  uiElements: {
    loadingScreen: null,
    loadingBar: null,
    startScreen: null,
    startButton: null,
    gameOverScreen: null,
    restartButton: null,
    scoreDisplay: null,
    currentScore: null,
    finalScore: null,
  },

  // Estado do Jogo
  gameStarted: false,
  gameOver: false,
  lastFrameTime: 0,
  score: 0,
  gameSpeed: GAME_CONFIG.INITIAL_GAME_SPEED, // Velocidade atual do cenário
  difficultyTimer: 0, // Tempo de jogo para aumentar a dificuldade

  // Entidades do Jogo
  player: null,
  enemies: [],
  particles: [], // Para explosões

  // Controles
  keys: {
    left: false,
    right: false,
    enter: false,
    space: false, // Adicionado para um futuro boost
  },
  playerVelocityX: 0,

  // Assets
  images: {},
  assetsLoaded: false,
  assetsLoadingProgress: 0,

  // Efeitos
  shakeIntensity: 0,
  roadOffset: 0, // Para rolagem da estrada
  skyOffset: 0, // Para parallax do céu/montanhas
  enemySpawnTimer: 0,
  nextEnemySpawnTime: 0, // Quando o próximo inimigo deve spawnar
};

// 3. CLASSES DO JOGO

// Representa o carro do jogador.
class Player {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  // Desenha o player no canvas.
  draw() {
    if (!gameState.images.car || !gameState.assetsLoaded) return;

    const ctx = gameState.ctx;
    ctx.save();
    ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
    ctx.shadowBlur = 15; // Brilho neon do carro
    ctx.drawImage(
      gameState.images.car,
      this.x,
      this.y,
      this.width,
      this.height
    );
    ctx.restore();
  }

  /**
   * Atualiza a posição e estado do player.
   * @param {number} deltaTime - Tempo desde o último frame em milissegundos.
   */
  update(deltaTime) {
    const { keys, playerVelocityX, canvas } = gameState;
    const { PLAYER_SPEED, PLAYER_ACCEL, PLAYER_DECEL_FACTOR } = GAME_CONFIG;

    let targetVelocityX = 0;

    if (keys.left) {
      targetVelocityX = -PLAYER_SPEED;
    } else if (keys.right) {
      targetVelocityX = PLAYER_SPEED;
    }

    // Aceleração e desaceleração suave
    gameState.playerVelocityX +=
      (targetVelocityX - playerVelocityX) * PLAYER_ACCEL * deltaTime;
    gameState.playerVelocityX *= PLAYER_DECEL_FACTOR; // Aplica desaceleração constante

    this.x += gameState.playerVelocityX * deltaTime;

    // Limita a posição X dentro do canvas
    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
  }
}

// Representa um carro inimigo.
class Enemy {
  constructor(x, y, initialScale) {
    this.x = x;
    this.y = y;
    this.initialY = y;
    this.baseWidth = GAME_CONFIG.ENEMY_WIDTH_FACTOR * gameState.canvas.width;
    this.baseHeight = GAME_CONFIG.ENEMY_HEIGHT_FACTOR * gameState.canvas.height;
    this.speed =
      Math.random() *
        (GAME_CONFIG.ENEMY_MAX_SPEED_FACTOR -
          GAME_CONFIG.ENEMY_INITIAL_SPEED_FACTOR) +
      GAME_CONFIG.ENEMY_INITIAL_SPEED_FACTOR;
    this.scale = initialScale || 0.1; // Começa pequeno
    this.lane = null; // A pista será definida na hora do spawn
    this.spawnTime = performance.now(); // Marca o tempo de criação para calcular a profundidade
  }

  // Desenha o inimigo no canvas, aplicando escala e perspectiva.
  draw() {
    if (!gameState.images.enemy || !gameState.assetsLoaded) return;

    const ctx = gameState.ctx;
    ctx.save();
    ctx.shadowColor = GAME_CONFIG.ENEMY_SHADOW_COLOR;
    ctx.shadowBlur = GAME_CONFIG.ENEMY_SHADOW_BLUR;

    const scaledWidth = this.baseWidth * this.scale;
    const scaledHeight = this.baseHeight * this.scale;
    const drawX = this.x - scaledWidth / 2; // Centraliza o inimigo
    const drawY = this.y - scaledHeight / 2; // Centraliza o inimigo (opcional, pode ser base)

    ctx.drawImage(
      gameState.images.enemy,
      drawX,
      drawY,
      scaledWidth,
      scaledHeight
    );
    ctx.restore();
  }

  /**
   * Atualiza a posição, escala e estado do inimigo.
   * @param {number} deltaTime - Tempo desde o último frame em milissegundos.
   */
  update(deltaTime) {
    this.y += this.speed * deltaTime * gameState.gameSpeed * 100; // Multiplicador para sensibilidade
    this.scale += GAME_CONFIG.ENEMY_GROWTH_FACTOR * deltaTime; // Cresce com o tempo

    // Movimento lateral sutil para simular desvio
    // this.x += Math.sin((performance.now() - this.spawnTime) / 500) * (this.speed * 0.5); // Descomente para inimigos que balançam

    // Garante que o inimigo não fique grande demais
    if (this.scale > 2) this.scale = 2;
  }

  /**
   * Verifica se o inimigo está fora dos limites visíveis do canvas.
   * @returns {boolean} True se fora dos limites, false caso contrário.
   */
  isOutOfBounds() {
    const scaledWidth = this.baseWidth * this.scale;
    const scaledHeight = this.baseHeight * this.scale;
    return (
      this.y - scaledHeight / 2 > gameState.canvas.height + 50 || // 50px de margem
      this.x + scaledWidth / 2 < -50 ||
      this.x - scaledWidth / 2 > gameState.canvas.width + 50
    );
  }

  /**
   * Verifica colisão com o jogador.
   * @param {Player} player - O objeto Player.
   * @returns {boolean} True se houver colisão, false caso contrário.
   */
  collidesWith(player) {
    const scaledWidth = this.baseWidth * this.scale;
    const scaledHeight = this.baseHeight * this.scale;
    const enemyX = this.x - scaledWidth / 2;
    const enemyY = this.y - scaledHeight / 2;

    // Ajustar hitbox para carros
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

// Representa uma partícula para efeitos de explosão.
class Particle {
  constructor(x, y, color, size, speedX, speedY, life) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.speedX = speedX;
    this.speedY = speedY;
    this.life = life;
    this.maxLife = life;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife; // Fading effect
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 4. FUNÇÕES GERAIS E DE RENDERIZAÇÃO

// Inicializa o jogo: configura canvas, eventos, carrega assets.
function init() {
  // 4.1. Obter referências aos elementos UI
  gameState.uiElements.loadingScreen =
    document.getElementById("loading-screen");
  gameState.uiElements.loadingBar = document.getElementById("loading-bar");
  gameState.uiElements.startScreen = document.getElementById("start-screen");
  gameState.uiElements.startButton = document.getElementById("start-button");
  gameState.uiElements.gameOverScreen =
    document.getElementById("game-over-screen");
  gameState.uiElements.restartButton =
    document.getElementById("restart-button");
  gameState.uiElements.scoreDisplay = document.getElementById("score-display");
  gameState.uiElements.currentScore = document.getElementById("current-score");
  gameState.uiElements.finalScore = document.getElementById("final-score");

  setupCanvas();
  setupEventListeners();

  // 4.2. Inicia o carregamento e mostra a tela de loading
  showScreen("loading-screen");
  loadAssets()
    .then(() => {
      gameState.assetsLoaded = true;
      // Se o carregamento for rápido, garante que a barra chegue a 100% visivelmente
      gameState.uiElements.loadingBar.style.width = "100%";
      setTimeout(() => {
        showStartScreen(); // Mostra tela inicial após carregar
        resetGame(); // Reseta o estado do jogo para começar limpo
      }, 500); // Pequeno atraso para a barra de loading
    })
    .catch(handleAssetsError);
}

// Configura o canvas para a resolução e o contexto 2D.
function setupCanvas() {
  gameState.canvas = document.getElementById("gameCanvas");
  gameState.ctx = gameState.canvas.getContext("2d");
  resizeCanvas(); // Define o tamanho inicial do canvas
}

// Configura os listeners de eventos (teclado, redimensionamento).
function setupEventListeners() {
  document.addEventListener("keydown", keyDownHandler);
  document.addEventListener("keyup", keyUpHandler);
  window.addEventListener("resize", resizeCanvas);

  // Eventos para botões HTML
  gameState.uiElements.startButton.addEventListener("click", () => {
    if (!gameState.gameStarted && !gameState.gameOver) startGame();
  });
  gameState.uiElements.restartButton.addEventListener("click", () => {
    if (gameState.gameOver) startGame();
  });
}

// Redimensiona o canvas para preencher a área do game-container, mantendo a proporção.
function resizeCanvas() {
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

  // Reposiciona o player e outros elementos se o jogo já estiver ativo
  if (gameState.player) {
    repositionPlayer();
  }
}

// Reposiciona o player na tela após um redimensionamento do canvas.
function repositionPlayer() {
  gameState.player.width =
    GAME_CONFIG.PLAYER_WIDTH_FACTOR * gameState.canvas.width;
  gameState.player.height =
    GAME_CONFIG.PLAYER_HEIGHT_FACTOR * gameState.canvas.height;
  gameState.player.x = (gameState.canvas.width - gameState.player.width) / 2;
  gameState.player.y =
    gameState.canvas.height * GAME_CONFIG.PLAYER_Y_POS_FACTOR -
    gameState.player.height / 2;
}

/**
 * Carrega todos os assets do jogo (imagens).
 * @returns {Promise<void>} Uma promessa que resolve quando todos os assets forem carregados.
 */
function loadAssets() {
  return new Promise((resolve, reject) => {
    const assets = {
      // startScreen: 'imgs/fundo2.jpg', // Usaremos HTML para tela inicial, então não precisa de imagem de fundo
      road: "imgs/roadest.jpg", // Exemplo, você pode gerar proceduralmente depois
      car: "imgs/car.png",
      enemy: "imgs/enemy.png",
      palmTree: "imgs/palm_tree.jpg", // Exemplo de asset para palmeira
    };

    let loadedCount = 0;
    const totalAssets = Object.keys(assets).length;

    if (totalAssets === 0) {
      resolve();
      return;
    }

    for (const key in assets) {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        gameState.assetsLoadingProgress = (loadedCount / totalAssets) * 100;
        if (gameState.uiElements.loadingBar) {
          gameState.uiElements.loadingBar.style.width = `${gameState.assetsLoadingProgress}%`;
        }
        if (loadedCount === totalAssets) {
          resolve();
        }
      };
      img.onerror = () => {
        console.error(`Falha ao carregar asset: ${assets[key]}`);
        loadedCount++;
        if (loadedCount === totalAssets) {
          // Ainda resolve, mas com aviso, ou pode rejeitar se for crítico
          reject(
            new Error(`Falha ao carregar um ou mais assets. (${assets[key]})`)
          );
        }
      };
      img.src = assets[key];
      gameState.images[key] = img;
    }
  });
}

/**
 * Lida com erros no carregamento de assets.
 * @param {Error} error - O erro ocorrido.
 */
function handleAssetsError(error) {
  console.error("Erro ao carregar assets:", error);
  gameState.assetsLoaded = false;
  // Tenta mostrar tela inicial mesmo com erro nos assets
  showStartScreen();
  resetGame();
}

// Inicia o ciclo principal do jogo.
function startGame() {
  if (!gameState.assetsLoaded) {
    console.warn("Assets ainda não carregados. Tentando iniciar...");
    return;
  }
  gameState.gameStarted = true;
  gameState.gameOver = false;
  showScreen("score-display"); // Mostra apenas o score
  resetGame();
  gameState.lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// Reseta o estado do jogo para um novo início.
function resetGame() {
  repositionPlayer(); // Garante que o player esteja na posição inicial correta
  gameState.enemies = [];
  gameState.particles = [];
  gameState.score = 0;
  gameState.gameSpeed = GAME_CONFIG.INITIAL_GAME_SPEED;
  gameState.difficultyTimer = 0;
  gameState.enemySpawnTimer = 0;
  gameState.nextEnemySpawnTime = getRandomSpawnInterval(); // Define o primeiro spawn
  updateScoreDisplay(); // Atualiza o score na UI
}

// Termina o jogo e mostra a tela de Game Over.
function endGame() {
  gameState.gameOver = true;
  gameState.shakeIntensity = GAME_CONFIG.SCREEN_SHAKE_DURATION;
  showScreen("game-over-screen");
  gameState.uiElements.finalScore.textContent = gameState.score;
  // Opcional: Adicionar um som de game over
  // playSound('game_over');
}

/**
 * O ciclo principal do jogo, chamado em cada frame.
 * @param {DOMHighResTimeStamp} timestamp - O tempo atual em milissegundos.
 */
function gameLoop(timestamp) {
  if (!gameState.gameStarted || gameState.gameOver) {
    return; // Pára o loop se o jogo não está ativo ou acabou
  }

  const deltaTime = timestamp - gameState.lastFrameTime;
  gameState.lastFrameTime = timestamp;

  update(deltaTime);
  render(deltaTime); // Render também pode usar deltaTime para animações baseadas em tempo

  requestAnimationFrame(gameLoop);
}

/**
 * Atualiza o estado de todos os objetos do jogo.
 * @param {number} deltaTime - Tempo desde o último frame em milissegundos.
 */
function update(deltaTime) {
  // 4.3. Atualiza a dificuldade e velocidade do jogo
  gameState.difficultyTimer += deltaTime;
  const progress = Math.min(
    1,
    gameState.difficultyTimer / GAME_CONFIG.DIFFICULTY_RAMP_TIME
  );
  gameState.gameSpeed =
    GAME_CONFIG.INITIAL_GAME_SPEED +
    (GAME_CONFIG.MAX_GAME_SPEED - GAME_CONFIG.INITIAL_GAME_SPEED) * progress;

  gameState.player.update(deltaTime);
  spawnEnemies(deltaTime);
  updateEnemies(deltaTime);
  updateParticles(deltaTime);

  // 4.4. Rolagem do cenário
  gameState.roadOffset =
    (gameState.roadOffset + gameState.gameSpeed * deltaTime * 0.1) % 1; // 0.1 é um fator de velocidade
  gameState.skyOffset =
    (gameState.skyOffset + gameState.gameSpeed * deltaTime * 0.01) % 1; // Mais lento
}

/**
 * Renderiza todos os objetos do jogo no canvas.
 * @param {number} deltaTime - Tempo desde o último frame em milissegundos.
 */
function render(deltaTime) {
  clearCanvas();

  gameState.ctx.save(); // Salva o estado antes de aplicar o shake
  applyScreenShake(); // Aplica o efeito de shake

  drawBackground(deltaTime);
  drawPlayer();
  drawEnemies();
  drawParticles(); // Desenha partículas por cima

  gameState.ctx.restore(); // Restaura o estado para remover o shake

  // Pontuação é atualizada no HTML, não no canvas
}

// Limpa todo o canvas.
function clearCanvas() {
  gameState.ctx.clearRect(
    0,
    0,
    gameState.canvas.width,
    gameState.canvas.height
  );
}

/**
 * Desenha o fundo completo do jogo (céu, sol, montanhas, estrada).
 * @param {number} deltaTime - Tempo desde o último frame em milissegundos.
 */
function drawBackground(deltaTime) {
  const { ctx, canvas } = gameState;

  drawSky(ctx, canvas);
  drawSun(ctx, canvas);
  drawMountains(ctx, canvas, gameState.skyOffset);
  drawRoad(ctx, canvas, gameState.roadOffset);
  drawPalmTrees(ctx, canvas, gameState.skyOffset); // Desenha as palmeiras
}

// Desenha o céu gradiente.
function drawSky(ctx, canvas) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, GAME_CONFIG.COLORS.PURPLE_DARK);
  gradient.addColorStop(0.5, GAME_CONFIG.COLORS.PURPLE_MID);
  gradient.addColorStop(1, GAME_CONFIG.COLORS.MAGENTA);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Desenha o sol retrô.
function drawSun(ctx, canvas) {
  const sunRadius = canvas.width * 0.2;
  const sunX = canvas.width / 2;
  const sunY = canvas.height * 0.2; // Posição do sol

  ctx.save();
  ctx.shadowColor = GAME_CONFIG.COLORS.ORANGE;
  ctx.shadowBlur = 20;

  // Círculo principal do sol
  ctx.fillStyle = GAME_CONFIG.COLORS.SUN_COLOR;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  // Linhas horizontais do sol
  ctx.strokeStyle = GAME_CONFIG.COLORS.SUN_LINE_COLOR;
  ctx.lineWidth = 2;
  for (let i = 0; i < GAME_CONFIG.SUN_LINE_COUNT; i++) {
    const y =
      sunY - sunRadius + i * ((sunRadius * 2) / GAME_CONFIG.SUN_LINE_COUNT);
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
 * Desenha as montanhas wireframe com efeito parallax.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {number} offset - Offset para parallax
 */
function drawMountains(ctx, canvas, offset) {
  ctx.save();
  ctx.strokeStyle = GAME_CONFIG.COLORS.MOUNTAIN_GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.shadowColor = GAME_CONFIG.COLORS.MOUNTAIN_GRID_COLOR;
  ctx.shadowBlur = 5;

  const mountainHeight = canvas.height * 0.2;
  const horizonY = canvas.height * 0.4;
  const baseLine = canvas.height * 0.6; // Linha base das montanhas

  for (let i = 0; i < GAME_CONFIG.MOUNTAIN_COUNT; i++) {
    const xBase =
      (i / GAME_CONFIG.MOUNTAIN_COUNT) * canvas.width * 1.5 -
      ((offset * canvas.width * 0.5) % (canvas.width * 1.5)); // Com parallax
    const peakX = xBase + canvas.width * 0.1;
    const peakY =
      horizonY - mountainHeight * (0.5 + Math.sin(xBase / 1000) * 0.2); // Varia a altura

    // Base da montanha
    const startX = xBase - canvas.width * 0.08;
    const endX = xBase + canvas.width * 0.2;

    ctx.beginPath();
    ctx.moveTo(startX, baseLine);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(endX, baseLine);
    ctx.stroke();

    // Linhas internas (grid)
    const gridLines = 5;
    for (let j = 1; j < gridLines; j++) {
      const ratio = j / gridLines;
      ctx.beginPath();
      // Linhas da base para o topo
      ctx.moveTo(lerp(startX, peakX, ratio), lerp(baseLine, peakY, ratio));
      ctx.lineTo(lerp(endX, peakX, ratio), lerp(baseLine, peakY, ratio));
      ctx.stroke();

      // Linhas horizontais
      ctx.moveTo(lerp(startX, endX, ratio), lerp(baseLine, baseLine, ratio)); // Pode ser mais complexo para grid real
      // ctx.lineTo(lerp(startX, peakX, ratio), lerp(baseLine, peakY, ratio));
      // ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Desenha a estrada com efeito de perspectiva e linhas rolantes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {number} offset - Offset para rolagem da estrada
 */
function drawRoad(ctx, canvas, offset) {
  const {
    ROAD_WIDTH_FACTOR,
    ROAD_LINE_WIDTH_FACTOR,
    ROAD_LINE_HEIGHT_FACTOR,
    ROAD_LINE_GAP_FACTOR,
    ROAD_COLOR,
    ROAD_LINE_COLOR,
    ROAD_SHOULDER_COLOR,
  } = GAME_CONFIG;

  const roadWidthAtBottom = canvas.width * ROAD_WIDTH_FACTOR;
  const roadWidthAtTop = canvas.width * 0.1; // Largura da estrada no horizonte
  const horizonY = canvas.height * 0.6; // Onde a estrada encontra o horizonte

  // Ombro da estrada
  ctx.fillStyle = ROAD_SHOULDER_COLOR;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo((canvas.width - roadWidthAtBottom) / 2, canvas.height);
  ctx.lineTo((canvas.width - roadWidthAtTop) / 2 - 20, horizonY); // Linha esquerda do ombro
  ctx.lineTo(0, horizonY - 10);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(canvas.width, canvas.height);
  ctx.lineTo((canvas.width + roadWidthAtBottom) / 2, canvas.height);
  ctx.lineTo((canvas.width + roadWidthAtTop) / 2 + 20, horizonY); // Linha direita do ombro
  ctx.lineTo(canvas.width, horizonY - 10);
  ctx.closePath();
  ctx.fill();

  // Estrada principal
  ctx.fillStyle = ROAD_COLOR;
  ctx.beginPath();
  ctx.moveTo((canvas.width - roadWidthAtTop) / 2, horizonY);
  ctx.lineTo((canvas.width + roadWidthAtTop) / 2, horizonY);
  ctx.lineTo((canvas.width + roadWidthAtBottom) / 2, canvas.height);
  ctx.lineTo((canvas.width - roadWidthAtBottom) / 2, canvas.height);
  ctx.closePath();
  ctx.fill();

  // Linhas da estrada
  ctx.fillStyle = ROAD_LINE_COLOR;
  ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
  ctx.shadowBlur = 5;

  const numLines = 15;
  const totalLineLength = ROAD_LINE_HEIGHT_FACTOR + ROAD_LINE_GAP_FACTOR; // Proporção da linha + gap

  for (let i = 0; i < numLines; i++) {
    // Calcula a posição Z baseada no offset de rolagem
    let zPos = (i / numLines - offset) % 1;
    if (zPos < 0) zPos += 1; // Garante que zPos seja positivo (0 a 1)

    const yBottom = canvas.height;
    const yTop = horizonY;

    // Posição Y da linha no canvas
    const lineY = lerp(yBottom, yTop, zPos * zPos); // zPos*zPos para curva de perspectiva

    // Ignora linhas que estão muito no horizonte
    if (lineY < yTop + 10) continue;

    // Largura da linha e espaço entre elas, com perspectiva
    const currentRoadWidth = lerp(roadWidthAtBottom, roadWidthAtTop, zPos);
    const lineWidth = currentRoadWidth * ROAD_LINE_WIDTH_FACTOR;
    const lineHeight = lerp(
      canvas.height * ROAD_LINE_HEIGHT_FACTOR,
      canvas.height * 0.005,
      zPos
    ); // Linhas menores no horizonte

    const lineGap = lerp(
      canvas.height * ROAD_LINE_GAP_FACTOR,
      canvas.height * 0.01,
      zPos
    );

    // Posição X central da linha
    const centerX = canvas.width / 2;

    ctx.fillRect(
      centerX - lineWidth / 2,
      lineY - lineHeight / 2,
      lineWidth,
      lineHeight
    );

    // Desenhar linhas laterais da pista (se for 3 pistas, por exemplo)
    if (GAME_CONFIG.ROAD_LANES > 1) {
      const laneWidth = currentRoadWidth / GAME_CONFIG.ROAD_LANES;
      const numSeparators = GAME_CONFIG.ROAD_LANES - 1;

      for (let j = 0; j < numSeparators; j++) {
        const separatorX = centerX - currentRoadWidth / 2 + (j + 1) * laneWidth;
        // Linhas pontilhadas (ou contínuas se preferir)
        if ((zPos * 100) % 20 > 10) {
          // Cria um efeito de pontilhado simples que scrolla
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
  ctx.shadowBlur = 0; // Desativa o shadow para não afetar outros desenhos
}

/**
 * Desenha palmeiras wireframe com parallax.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {number} offset - Offset para parallax
 */
function drawPalmTrees(ctx, canvas, offset) {
  if (!gameState.images.palmTree || !gameState.assetsLoaded) return;

  ctx.save();
  ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
  ctx.shadowBlur = 8;

  const baseLine = canvas.height * 0.6; // A mesma linha base das montanhas para consistência
  const playerY = gameState.player.y;

  for (let i = 0; i < GAME_CONFIG.PALM_TREE_COUNT; i++) {
    // Posição inicial da palmeira
    let xPos =
      (i * 0.73 * canvas.width - offset * canvas.width * 0.3) %
      (canvas.width * 1.2);
    if (xPos < -canvas.width * 0.1) xPos += canvas.width * 1.2;

    // Alterna entre lado esquerdo e direito
    const side = i % 2 === 0 ? -1 : 1;
    xPos = side === -1 ? xPos * 0.3 : canvas.width - xPos * 0.3;

    const treeHeight = canvas.height * (0.15 + Math.sin(i) * 0.05);
    const treeY = baseLine - treeHeight;

    // Desenha o tronco da palmeira
    ctx.strokeStyle = GAME_CONFIG.COLORS.PALM_TREE_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xPos, baseLine);
    ctx.lineTo(xPos + treeHeight * 0.1, treeY); // Leve curva no tronco
    ctx.stroke();

    // Desenha as folhas (linhas simples)
    const leafCount = 6;
    for (let j = 0; j < leafCount; j++) {
      const angle = (j / leafCount) * Math.PI * 2;
      const leafLength = treeHeight * 0.4;
      const leafEndX = xPos + Math.cos(angle) * leafLength;
      const leafEndY = treeY + Math.sin(angle) * leafLength * 0.5; // Achatado verticalmente

      ctx.beginPath();
      ctx.moveTo(xPos, treeY);
      ctx.lineTo(leafEndX, leafEndY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Desenha o jogador no canvas.
function drawPlayer() {
  if (gameState.player) {
    gameState.player.draw();
  }
}

// Desenha todos os inimigos no canvas.
function drawEnemies() {
  gameState.enemies.forEach((enemy) => enemy.draw());
}

// Desenha todas as partículas no canvas.
function drawParticles() {
  gameState.particles.forEach((particle) => particle.draw(gameState.ctx));
}

// Aplica o efeito de screen shake ao contexto do canvas.
function applyScreenShake() {
  if (gameState.shakeIntensity <= 0) return;

  const x = (Math.random() - 0.5) * gameState.shakeIntensity;
  const y = (Math.random() - 0.5) * gameState.shakeIntensity;
  gameState.ctx.translate(x, y);

  gameState.shakeIntensity *= GAME_CONFIG.SCREEN_SHAKE_DECAY;
  if (gameState.shakeIntensity < 0.1) {
    gameState.shakeIntensity = 0;
  }
}

// 5. LÓGICA DE SPAWN E ATUALIZAÇÃO DE ENTIDADES

/**
 * Controla o spawn de inimigos baseado em intervalos de tempo.
 * @param {number} deltaTime - Tempo desde o último frame em milissegundos.
 */
function spawnEnemies(deltaTime) {
  gameState.enemySpawnTimer += deltaTime;

  if (gameState.enemySpawnTimer >= gameState.nextEnemySpawnTime) {
    spawnEnemy();
    gameState.enemySpawnTimer = 0;
    gameState.nextEnemySpawnTime = getRandomSpawnInterval();
  }
}

// Cria um novo inimigo em uma pista aleatória.
function spawnEnemy() {
  const { canvas } = gameState;
  const roadWidth = canvas.width * GAME_CONFIG.ROAD_WIDTH_FACTOR;
  const laneWidth = roadWidth / GAME_CONFIG.ROAD_LANES;

  // Escolhe uma pista aleatória
  const lane = Math.floor(Math.random() * GAME_CONFIG.ROAD_LANES);
  const laneCenter = (canvas.width - roadWidth) / 2 + (lane + 0.5) * laneWidth;

  // Posição Y inicial (acima da tela)
  const initialY = canvas.height * 0.6 - 50; // Começa no horizonte

  const enemy = new Enemy(laneCenter, initialY, 0.1); // Escala inicial pequena
  enemy.lane = lane;
  gameState.enemies.push(enemy);
}

/**
 * Retorna um intervalo aleatório para o próximo spawn de inimigo.
 * @returns {number} Intervalo em milissegundos.
 */
function getRandomSpawnInterval() {
  const { ENEMY_SPAWN_INTERVAL_MIN, ENEMY_SPAWN_INTERVAL_MAX } = GAME_CONFIG;

  // Reduz o intervalo baseado na dificuldade
  const difficultyFactor =
    1 - (gameState.difficultyTimer / GAME_CONFIG.DIFFICULTY_RAMP_TIME) * 0.7; // Reduz até 70%
  const adjustedMin =
    ENEMY_SPAWN_INTERVAL_MIN * Math.max(0.3, difficultyFactor);
  const adjustedMax =
    ENEMY_SPAWN_INTERVAL_MAX * Math.max(0.3, difficultyFactor);

  return Math.random() * (adjustedMax - adjustedMin) + adjustedMin;
}

/**
 * Atualiza todos os inimigos: movimento, colisão, remoção.
 * @param {number} deltaTime - Tempo desde o último frame em milissegundos.
 */
function updateEnemies(deltaTime) {
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    const enemy = gameState.enemies[i];
    enemy.update(deltaTime);

    // Verifica colisão com o jogador
    if (enemy.collidesWith(gameState.player)) {
      createExplosionParticles(enemy.x, enemy.y);
      endGame();
      return;
    }

    // Remove inimigos que saíram da tela
    if (enemy.isOutOfBounds()) {
      gameState.enemies.splice(i, 1);
      gameState.score += GAME_CONFIG.SCORE_INCREMENT;
      updateScoreDisplay();
    }
  }
}

/**
 * Atualiza todas as partículas.
 * @param {number} deltaTime - Tempo desde o último frame em milissegundos.
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
 * Cria partículas de explosão em uma posição específica.
 * @param {number} x - Posição X da explosão.
 * @param {number} y - Posição Y da explosão.
 */
function createExplosionParticles(x, y) {
  const colors = [
    GAME_CONFIG.COLORS.PINK,
    GAME_CONFIG.COLORS.CYAN,
    GAME_CONFIG.COLORS.MAGENTA,
    GAME_CONFIG.COLORS.PURPLE_MID,
    GAME_CONFIG.COLORS.ORANGE,
  ];

  for (let i = 0; i < GAME_CONFIG.PARTICLE_COUNT; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 5 + 2;
    const speedX = (Math.random() - 0.5) * 10;
    const speedY = (Math.random() - 0.5) * 10;
    const life = GAME_CONFIG.PARTICLE_LIFE;

    gameState.particles.push(
      new Particle(x, y, color, size, speedX, speedY, life)
    );
  }
}

// 6. CONTROLE DE TELAS E UI

/**
 * Mostra uma tela específica e esconde as outras.
 * @param {string} screenId - ID da tela a ser mostrada.
 */
function showScreen(screenId) {
  // Lista de todas as telas
  const screens = [
    "loading-screen",
    "start-screen",
    "game-over-screen",
    "score-display",
  ];

  screens.forEach((id) => {
    const element =
      gameState.uiElements[id.replace("-", "")] || document.getElementById(id);
    if (element) {
      if (id === screenId) {
        element.classList.remove("hidden");
      } else {
        element.classList.add("hidden");
      }
    }
  });
}

// Mostra a tela inicial do jogo.
function showStartScreen() {
  showScreen("start-screen");
}

// Atualiza a exibição da pontuação na UI.
function updateScoreDisplay() {
  if (gameState.uiElements.currentScore) {
    gameState.uiElements.currentScore.textContent = gameState.score;
  }
}

// 7. MANIPULADORES DE EVENTOS

/**
 * Manipula eventos de tecla pressionada.
 * @param {KeyboardEvent} e - O evento de teclado.
 */
function keyDownHandler(e) {
  switch (e.code) {
    case "Enter":
      e.preventDefault();
      if (!gameState.gameStarted && !gameState.gameOver) {
        startGame();
      } else if (gameState.gameOver) {
        startGame();
      }
      break;
    case "ArrowLeft":
    case "KeyA":
      e.preventDefault();
      gameState.keys.left = true;
      break;
    case "ArrowRight":
    case "KeyD":
      e.preventDefault();
      gameState.keys.right = true;
      break;
    case "Space":
      e.preventDefault();
      gameState.keys.space = true;
      // TODO: Implementar boost ou freio
      break;
  }
}

/**
 * Manipula eventos de tecla solta.
 * @param {KeyboardEvent} e - O evento de teclado.
 */
function keyUpHandler(e) {
  switch (e.code) {
    case "ArrowLeft":
    case "KeyA":
      gameState.keys.left = false;
      break;
    case "ArrowRight":
    case "KeyD":
      gameState.keys.right = false;
      break;
    case "Space":
      gameState.keys.space = false;
      break;
  }
}

// 8. FUNÇÕES UTILITÁRIAS

/**
 * Interpolação linear entre dois valores.
 * @param {number} a - Valor inicial.
 * @param {number} b - Valor final.
 * @param {number} t - Fator de interpolação (0 a 1).
 * @returns {number} Valor interpolado.
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Converte graus para radianos.
 * @param {number} degrees - Ângulo em graus.
 * @returns {number} Ângulo em radianos.
 */
function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Gera um número aleatório entre min e max.
 * @param {number} min - Valor mínimo.
 * @param {number} max - Valor máximo.
 * @returns {number} Número aleatório.
 */
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Clamp um valor entre min e max.
 * @param {number} value - Valor a ser limitado.
 * @param {number} min - Valor mínimo.
 * @param {number} max - Valor máximo.
 * @returns {number} Valor limitado.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 9. INICIALIZAÇÃO

/**
 * Inicializa o jogo quando a página termina de carregar.
 */
window.addEventListener("load", init);

// 10. RECURSOS ADICIONAIS (COMENTADOS PARA IMPLEMENTAÇÃO FUTURA)

/*
// Sistema de áudio (descomente e implemente conforme necessário)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const sounds = {};

function loadSound(name, url) {
    return fetch(url)
        .then(response => response.arrayBuffer())
        .then(data => audioContext.decodeAudioData(data))
        .then(buffer => {
            sounds[name] = buffer;
        });
}

function playSound(name, volume = 1) {
    if (!sounds[name]) return;
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = sounds[name];
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start();
}

// Carregar sons
loadSound('engine', 'sounds/engine.mp3');
loadSound('crash', 'sounds/crash.mp3');
loadSound('score', 'sounds/score.mp3');
*/

/*
// Sistema de power-ups (exemplo de estrutura)
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'speed', 'shield', 'slow_time'
        this.width = 30;
        this.height = 30;
        this.collected = false;
    }
    
    update(deltaTime) {
        this.y += gameState.gameSpeed * deltaTime * 50;
    }
    
    draw() {
        // Desenhar power-up baseado no tipo
    }
    
    collidesWith(player) {
        // Lógica de colisão similar aos inimigos
    }
}
*/

/*
// Sistema de partículas mais avançado
class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    emit(x, y, config) {
        // Emite partículas com configurações específicas
    }
    
    update(deltaTime) {
        // Atualiza todas as partículas
    }
    
    draw(ctx) {
        // Desenha todas as partículas
    }
}
*/
