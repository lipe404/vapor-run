/**
 * =============================================
 * CONFIGURAÇÕES DO JOGO
 * =============================================
 */
const GAME_CONFIG = {
    // Configurações do jogador
    PLAYER_SPEED: 9,
    PLAYER_WIDTH: 100,
    PLAYER_HEIGHT: 100,
    
    // Configurações dos inimigos
    ENEMY_SPAWN_RATE: 0.02,
    ENEMY_MIN_SPEED: 3,
    ENEMY_MAX_SPEED: 7,
    ENEMY_INITIAL_WIDTH: 20,
    ENEMY_INITIAL_HEIGHT: 40,
    ENEMY_TURN_POINT: 0.5,
    ENEMY_INITIAL_SCALE: 0.3,
    ENEMY_FINAL_SCALE: 1.2,
    ENEMY_GROWTH_RATE: 0.03,
    
    // Configurações do jogo
    SCORE_INCREMENT: 1,
    ASPECT_RATIO: 0.8,
    VERTICAL_RATIO: 0.9,
    SCREEN_SHAKE_DURATION: 15,
    SCREEN_SHAKE_DECAY: 0.9
};

/**
 * =============================================
 * ESTADO DO JOGO
 * =============================================
 */
const gameState = {
    // Elementos do canvas
    canvas: null,
    ctx: null,
    
    // Estado do jogo
    gameStarted: false,
    gameOver: false,
    lastFrameTime: 0,
    score: 0,
    shakeIntensity: 0,
    
    // Entidades do jogo
    player: null,
    enemies: [],
    
    // Controles
    keys: { 
        left: false, 
        right: false 
    },
    
    // Assets
    images: {},
    assetsLoaded: false
};

/**
 * =============================================
 * CLASSES DO JOGO
 * =============================================
 */

class Player {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = GAME_CONFIG.PLAYER_SPEED;
    }

    draw() {
        if (gameState.images.car && gameState.assetsLoaded) {
            gameState.ctx.drawImage(
                gameState.images.car, 
                this.x, 
                this.y, 
                this.width, 
                this.height
            );
        }
    }

    update() {
        // Movimento para esquerda
        if (gameState.keys.left && this.x > 0) {
            this.x -= this.speed;
        }
        
        // Movimento para direita
        if (gameState.keys.right && this.x < gameState.canvas.width - this.width) {
            this.x += this.speed;
        }
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.initialY = y;
        this.width = GAME_CONFIG.ENEMY_INITIAL_WIDTH;
        this.height = GAME_CONFIG.ENEMY_INITIAL_HEIGHT;
        this.speed = this.getRandomSpeed();
        this.scale = GAME_CONFIG.ENEMY_INITIAL_SCALE;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.turned = false;
    }

    getRandomSpeed() {
        return Math.random() * (GAME_CONFIG.ENEMY_MAX_SPEED - GAME_CONFIG.ENEMY_MIN_SPEED) + 
               GAME_CONFIG.ENEMY_MIN_SPEED;
    }

    draw() {
        if (!gameState.images.enemy || !gameState.assetsLoaded) return;
        
        gameState.ctx.save();
        gameState.ctx.shadowColor = '#ff00ff';
        gameState.ctx.shadowBlur = 5;
        
        const scaledWidth = this.width * this.scale;
        const drawX = this.x - (scaledWidth - this.width) / 2;
        
        gameState.ctx.drawImage(
            gameState.images.enemy, 
            drawX, 
            this.y, 
            scaledWidth, 
            this.height * this.scale
        );
        gameState.ctx.restore();
    }

    update() {
        // Movimento vertical
        this.y += this.speed;
        
        // Atualiza escala baseada no progresso
        this.updateScale();
        
        // Movimento lateral após ponto de virada
        if (this.shouldTurn()) {
            this.turned = true;
        }
        
        if (this.turned) {
            this.x += this.speed * 0.7 * this.direction;
        }
    }

    updateScale() {
        const progress = this.getProgress();
        this.scale = GAME_CONFIG.ENEMY_INITIAL_SCALE + 
                     (GAME_CONFIG.ENEMY_FINAL_SCALE - GAME_CONFIG.ENEMY_INITIAL_SCALE) * progress;
    }

    getProgress() {
        return Math.min(1, (this.y - this.initialY) / 
                  (gameState.canvas.height - this.initialY));
    }

    shouldTurn() {
        return !this.turned && this.getProgress() > GAME_CONFIG.ENEMY_TURN_POINT;
    }

    isOutOfBounds() {
        const scaledWidth = this.width * this.scale;
        return this.y > gameState.canvas.height || 
               this.x < -scaledWidth || 
               this.x > gameState.canvas.width;
    }

    collidesWith(player) {
        const scaledWidth = this.width * this.scale;
        const scaledHeight = this.height * this.scale;
        const drawX = this.x - (scaledWidth - this.width) / 2;
        
        return !(
            (drawX + scaledWidth) < player.x || 
            drawX > (player.x + player.width) || 
            (this.y + scaledHeight) < player.y || 
            this.y > (player.y + player.height)
        );
    }
}

/**
 * =============================================
 * FUNÇÕES PRINCIPAIS
 * =============================================
 */

// Inicialização do jogo
function init() {
    setupCanvas();
    setupEventListeners();
    loadAssets()
        .then(() => {
            gameState.assetsLoaded = true;
            resetGame();
            showStartScreen();
        })
        .catch(handleAssetsError);
}

function setupCanvas() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    resizeCanvas();
}

function setupEventListeners() {
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    window.addEventListener('resize', resizeCanvas);
}

function handleAssetsError(error) {
    console.error("Erro ao carregar assets:", error);
    gameState.assetsLoaded = false;
    resetGame();
    showStartScreen();
}

// Carregamento de assets
function loadAssets() {
    return new Promise((resolve) => {
        const assets = {
            startScreen: 'imgs/fundo2.jpg',
            road: 'imgs/roadest.jpg',
            car: 'imgs/car.png',
            enemy: 'imgs/enemy.png'
        };

        let loaded = 0;
        const total = Object.keys(assets).length;
        
        gameState.images = Object.keys(assets).reduce((acc, key) => {
            const img = new Image();
            img.onload = img.onerror = () => {
                loaded++;
                if (loaded === total) resolve();
            };
            img.src = assets[key];
            acc[key] = img;
            return acc;
        }, {});
    });
}

// Controle do jogo
function startGame() {
    gameState.gameStarted = true;
    gameState.gameOver = false;
    resetGame();
    gameState.lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function resetGame() {
    gameState.player = new Player(
        gameState.canvas.width / 2 - GAME_CONFIG.PLAYER_WIDTH / 2,
        gameState.canvas.height - GAME_CONFIG.PLAYER_HEIGHT - 20,
        GAME_CONFIG.PLAYER_WIDTH,
        GAME_CONFIG.PLAYER_HEIGHT
    );
    gameState.enemies = [];
    gameState.score = 0;
}

function endGame() {
    gameState.gameOver = true;
    gameState.shakeIntensity = GAME_CONFIG.SCREEN_SHAKE_DURATION;
    showGameOverScreen();
}

// Loop do jogo
function gameLoop(timestamp) {
    if (!gameState.gameStarted || gameState.gameOver) return;
    
    const deltaTime = timestamp - gameState.lastFrameTime;
    gameState.lastFrameTime = timestamp;
    
    update(deltaTime);
    render();
    
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    gameState.player.update();
    spawnEnemies();
    updateEnemies();
}

function render() {
    clearCanvas();
    applyScreenShake();
    drawBackground();
    drawPlayer();
    drawEnemies();
    drawScore();
}

// Renderização
function clearCanvas() {
    gameState.ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);
}

function drawBackground() {
    if (gameState.assetsLoaded && gameState.images.road) {
        gameState.ctx.drawImage(
            gameState.images.road, 
            0, 0, 
            gameState.canvas.width, 
            gameState.canvas.height
        );
    }
}

function drawPlayer() {
    gameState.player.draw();
}

function drawEnemies() {
    gameState.enemies.forEach(enemy => enemy.draw());
}

function drawScore() {
    gameState.ctx.fillStyle = 'white';
    gameState.ctx.font = '20px "Press Start 2P", cursive';
    gameState.ctx.textAlign = 'left';
    gameState.ctx.fillText(`SCORE: ${gameState.score}`, 20, 30);
}

// Lógica do jogo
function spawnEnemies() {
    if (Math.random() < GAME_CONFIG.ENEMY_SPAWN_RATE) {
        const xPos = gameState.canvas.width / 2 - GAME_CONFIG.ENEMY_INITIAL_WIDTH / 2;
        const yPos = -GAME_CONFIG.ENEMY_INITIAL_HEIGHT;
        gameState.enemies.push(new Enemy(xPos, yPos));
    }
}

function updateEnemies() {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        enemy.update();
        
        if (enemy.collidesWith(gameState.player)) {
            endGame();
            return;
        }
        
        if (enemy.isOutOfBounds()) {
            gameState.enemies.splice(i, 1);
            gameState.score += GAME_CONFIG.SCORE_INCREMENT;
        }
    }
}

// Efeitos visuais
function applyScreenShake() {
    if (gameState.shakeIntensity <= 0) return;
    
    const x = (Math.random() - 0.5) * gameState.shakeIntensity;
    const y = (Math.random() - 0.5) * gameState.shakeIntensity;
    gameState.ctx.setTransform(1, 0, 0, 1, x, y);
    gameState.shakeIntensity *= GAME_CONFIG.SCREEN_SHAKE_DECAY;
    
    if (gameState.shakeIntensity < 0.1) {
        gameState.shakeIntensity = 0;
        gameState.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}

// Telas do jogo
function showStartScreen() {
    if (!gameState.assetsLoaded) {
        showLoadingScreen();
        return;
    }

    drawStartScreenBackground();
    drawStartScreenText();
    
    if (!gameState.gameStarted) {
        requestAnimationFrame(showStartScreen);
    }
}

function showLoadingScreen() {
    gameState.ctx.fillStyle = 'black';
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    gameState.ctx.fillStyle = 'white';
    gameState.ctx.font = '20px "Press Start 2P", cursive';
    gameState.ctx.textAlign = 'center';
    gameState.ctx.fillText('Carregando...', gameState.canvas.width / 2, gameState.canvas.height / 2);
}

function drawStartScreenBackground() {
    gameState.ctx.drawImage(
        gameState.images.startScreen, 
        0, 0, 
        gameState.canvas.width, 
        gameState.canvas.height
    );
    gameState.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
}

function drawStartScreenText() {
    const glitchOffset = Math.random() * 2 - 1;
    const glitchOffsetY = Math.random() * 2 - 1;
    
    // Título
    gameState.ctx.fillStyle = '#00ffff';
    gameState.ctx.font = '24px "Press Start 2P", cursive';
    gameState.ctx.textAlign = 'center';
    gameState.ctx.shadowColor = '#ff00ff';
    gameState.ctx.shadowBlur = 10;
    gameState.ctx.fillText(
        'V A P O R R U N', 
        gameState.canvas.width / 2 + glitchOffset, 
        gameState.canvas.height / 2 - 50 + glitchOffsetY
    );
    
    // Instrução (com efeito de piscar)
    gameState.ctx.shadowBlur = 0;
    gameState.ctx.font = '16px "Press Start 2P", cursive';
    gameState.ctx.fillStyle = '#ffffff';
    
    if (Math.random() > 0.1) {
        gameState.ctx.fillText(
            'Pressione ENTER para começar', 
            gameState.canvas.width / 2, 
            gameState.canvas.height / 2 + 20
        );
    }
}

function showGameOverScreen() {
    // Efeito de flash vermelho
    gameState.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);

    requestAnimationFrame(() => {
        // Fundo gradiente
        const gradient = gameState.ctx.createLinearGradient(
            0, 0, 
            gameState.canvas.width, 
            gameState.canvas.height
        );
        gradient.addColorStop(0, 'rgba(32, 0, 44, 0.9)');
        gradient.addColorStop(1, 'rgba(148, 0, 211, 0.9)');
        
        gameState.ctx.fillStyle = gradient;
        gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
        
        // Efeito de glitch
        const glitchOffsetX = Math.random() * 8 - 4;
        const glitchOffsetY = Math.random() * 8 - 4;
        
        // Texto de colisão
        drawGameOverText('COLISÃO!', glitchOffsetX, glitchOffsetY, -60);
        
        // Texto de game over
        drawGameOverText('GAME OVER', 0, 0, -20);
        
        // Pontuação
        drawGameOverText(`Pontuação: ${gameState.score}`, 0, 0, 20, '#00ffff', '#ff00ff', '20px');
        
        // Instrução
        drawGameOverText(
            'Pressione ENTER para continuar', 
            0, 0, 60, 
            '#ffffff', '#ff1493', '16px'
        );
        
        // Efeito de partículas
        drawExplosionParticles(
            gameState.canvas.width / 2, 
            gameState.canvas.height / 2
        );
    });
}

function drawGameOverText(text, offsetX, offsetY, yOffset, fill = '#ff1493', shadow = '#00ffff', size = '30px') {
    gameState.ctx.fillStyle = fill;
    gameState.ctx.font = `${size} "Press Start 2P", cursive`;
    gameState.ctx.textAlign = 'center';
    gameState.ctx.shadowColor = shadow;
    gameState.ctx.shadowBlur = 15;
    gameState.ctx.fillText(
        text, 
        gameState.canvas.width / 2 + offsetX, 
        gameState.canvas.height / 2 + yOffset + offsetY
    );
}

function drawExplosionParticles(x, y) {
    const colors = ['#ff00ff', '#00ffff', '#ff1493', '#9400d3'];
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const size = Math.random() * 5;
        const offsetX = (Math.random() - 0.5) * 100;
        const offsetY = (Math.random() - 0.5) * 100;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        gameState.ctx.fillStyle = color;
        gameState.ctx.beginPath();
        gameState.ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
        gameState.ctx.fill();
    }
}

// Manipuladores de eventos
function keyDownHandler(e) {
    if (e.key === 'Enter' && (!gameState.gameStarted || gameState.gameOver)) {
        startGame();
    }
    if (e.key === 'ArrowLeft') {
        gameState.keys.left = true;
    }
    if (e.key === 'ArrowRight') {
        gameState.keys.right = true;
    }
}

function keyUpHandler(e) {
    if (e.key === 'ArrowLeft') {
        gameState.keys.left = false;
    }
    if (e.key === 'ArrowRight') {
        gameState.keys.right = false;
    }
}

function resizeCanvas() {
    gameState.canvas.width = window.innerWidth * GAME_CONFIG.ASPECT_RATIO;
    gameState.canvas.height = window.innerHeight * GAME_CONFIG.VERTICAL_RATIO;
    
    if (gameState.player) {
        repositionPlayer();
    }
}

function repositionPlayer() {
    gameState.player.x = gameState.canvas.width / 2 - gameState.player.width / 2;
    gameState.player.y = gameState.canvas.height - gameState.player.height - 20;
}

// Inicializa o jogo quando a página carrega
window.addEventListener('load', init);