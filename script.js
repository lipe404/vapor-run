/**
 * CONSTANTES DE CONFIGURAÇÃO DO JOGO
 */
const GAME_CONFIG = {
    PLAYER_SPEED: 9,
    ENEMY_SPAWN_RATE: 0.02,
    ENEMY_MIN_SPEED: 3,
    ENEMY_MAX_SPEED: 7,
    ENEMY_GROWTH_RATE: 0.03,
    SCORE_INCREMENT: 1,
    PLAYER_WIDTH: 100,
    PLAYER_HEIGHT: 100,
    ENEMY_INITIAL_WIDTH: 20,
    ENEMY_INITIAL_HEIGHT: 40,
    ENEMY_TURN_POINT: 0.5,
    ASPECT_RATIO: 0.8,
    VERTICAL_RATIO: 0.9
};

/**
 * VARIÁVEIS GLOBAIS
 */
const gameState = {
    canvas: null,
    ctx: null,
    gameStarted: false,
    gameOver: false,
    lastFrameTime: 0,
    player: null,
    enemies: [],
    score: 0,
    keys: { left: false, right: false },
    images: {},
    assetsLoaded: false,
    roadOffset: 0,
    shakeIntensity: 0,
    ROAD_SPEED: 5
};

/**
 * CLASSE PLAYER
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
            gameState.ctx.drawImage(gameState.images.car, this.x, this.y, this.width, this.height);
        }
    }

    update() {
        if (gameState.keys.left && this.x > 0) {
            this.x -= this.speed;
        }
        if (gameState.keys.right && this.x < gameState.canvas.width - this.width) {
            this.x += this.speed;
        }
    }
}

/**
 * CLASSE ENEMY
 */
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.ENEMY_INITIAL_WIDTH;
        this.height = GAME_CONFIG.ENEMY_INITIAL_HEIGHT;
        this.speed = Math.random() * (GAME_CONFIG.ENEMY_MAX_SPEED - GAME_CONFIG.ENEMY_MIN_SPEED) + 
                    GAME_CONFIG.ENEMY_MIN_SPEED + gameState.ROAD_SPEED;
        this.scale = 0.4;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.turned = false;
    }

    draw() {
        if (gameState.images.enemy && gameState.assetsLoaded) {
            gameState.ctx.save();
            gameState.ctx.shadowColor = '#ff00ff';
            gameState.ctx.shadowBlur = 5;
            gameState.ctx.drawImage(
                gameState.images.enemy, 
                this.x, 
                this.y, 
                this.width * this.scale, 
                this.height * this.scale
            );
            gameState.ctx.restore();
        }
    }

    update() {
        this.y += this.speed;
        this.scale += GAME_CONFIG.ENEMY_GROWTH_RATE;
        
        if (!this.turned && this.y > gameState.canvas.height * GAME_CONFIG.ENEMY_TURN_POINT) {
            this.turned = true;
        }
        
        if (this.turned) {
            this.x += this.speed * 0.7 * this.direction;
        }
    }

    isOutOfBounds() {
        return this.y > gameState.canvas.height || 
               this.x < -this.width * this.scale || 
               this.x > gameState.canvas.width;
    }

    collidesWith(player) {
        return !(
            (this.x + this.width * this.scale) < player.x || 
            this.x > (player.x + player.width) || 
            (this.y + this.height * this.scale) < player.y || 
            this.y > (player.y + player.height)
        );
    }
}

/**
 * FUNÇÕES PRINCIPAIS
 */
function init() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    resizeCanvas();
    
    loadAssets()
        .then(() => {
            gameState.assetsLoaded = true;
            resetGame();
            showStartScreen();
        })
        .catch(error => {
            console.error("Erro ao carregar assets:", error);
            gameState.assetsLoaded = false;
            resetGame();
            showStartScreen();
        });

    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    window.addEventListener('resize', resizeCanvas);
}

function loadAssets() {
    return new Promise((resolve, reject) => {
        const assets = {
            startScreen: 'imgs/fundo2.jpg',
            road: 'imgs/roadest.jpg',
            car: 'imgs/car.png',
            enemy: 'imgs/enemy.png'
        };

        let loaded = 0;
        const total = Object.keys(assets).length;
        
        gameState.images = Object.keys(assets).reduce((acc, key) => {
            acc[key] = new Image();
            acc[key].onload = () => {
                loaded++;
                if (loaded === total) resolve();
            };
            acc[key].onerror = () => {
                console.error(`Erro ao carregar imagem: ${assets[key]}`);
                loaded++;
                if (loaded === total) resolve();
            };
            acc[key].src = assets[key];
            return acc;
        }, {});
    });
}

function resizeCanvas() {
    gameState.canvas.width = window.innerWidth * GAME_CONFIG.ASPECT_RATIO;
    gameState.canvas.height = window.innerHeight * GAME_CONFIG.VERTICAL_RATIO;
    
    if (gameState.player) {
        gameState.player.x = gameState.canvas.width / 2 - gameState.player.width / 2;
        gameState.player.y = gameState.canvas.height - gameState.player.height - 20;
    }
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
    gameState.gameOver = false;
    gameState.roadOffset = 0;
}

function showStartScreen() {
    if (!gameState.assetsLoaded) {
        gameState.ctx.fillStyle = 'black';
        gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
        gameState.ctx.fillStyle = 'white';
        gameState.ctx.font = '20px "Press Start 2P", cursive';
        gameState.ctx.textAlign = 'center';
        gameState.ctx.fillText('Carregando...', gameState.canvas.width / 2, gameState.canvas.height / 2);
        return;
    }

    gameState.ctx.drawImage(gameState.images.startScreen, 0, 0, gameState.canvas.width, gameState.canvas.height);
    gameState.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    const glitchOffset = Math.random() * 2 - 1;
    const glitchOffsetY = Math.random() * 2 - 1;
    
    gameState.ctx.fillStyle = '#00ffff';
    gameState.ctx.font = '24px "Press Start 2P", cursive';
    gameState.ctx.textAlign = 'center';
    gameState.ctx.shadowColor = '#ff00ff';
    gameState.ctx.shadowBlur = 10;
    gameState.ctx.fillText('V A P O R R U N', gameState.canvas.width / 2 + glitchOffset, gameState.canvas.height / 2 - 50 + glitchOffsetY);
    gameState.ctx.shadowBlur = 0;
    
    gameState.ctx.font = '16px "Press Start 2P", cursive';
    gameState.ctx.fillStyle = '#ffffff';
    
    if (Math.random() > 0.1) {
        gameState.ctx.fillText('Pressione ENTER para começar', gameState.canvas.width / 2, gameState.canvas.height / 2 + 20);
    }
    
    if (!gameState.gameStarted) {
        requestAnimationFrame(showStartScreen);
    }
}

function startGame() {
    gameState.gameStarted = true;
    gameState.gameOver = false;
    resetGame();
    gameState.lastFrameTime = performance.now();
    gameLoop(gameState.lastFrameTime);
}

function gameLoop(timestamp) {
    if (!gameState.gameStarted || gameState.gameOver) return;
    
    const deltaTime = timestamp - gameState.lastFrameTime;
    gameState.lastFrameTime = timestamp;
    
    update(deltaTime);
    render();
    
    requestAnimationFrame(gameLoop);
}

function drawMovingRoad() {
    if (!gameState.assetsLoaded || !gameState.images.road) return;
    
    gameState.ctx.drawImage(gameState.images.road, 0, gameState.roadOffset, gameState.canvas.width, gameState.canvas.height);
    gameState.ctx.drawImage(gameState.images.road, 0, gameState.roadOffset - gameState.canvas.height, gameState.canvas.width, gameState.canvas.height);
    
    gameState.roadOffset += gameState.ROAD_SPEED;
    
    if (gameState.roadOffset >= gameState.canvas.height) {
        gameState.roadOffset = 0;
    }
}

function update(deltaTime) {
    const normalizedDelta = deltaTime / 16;
    
    gameState.player.update();
    
    if (Math.random() < GAME_CONFIG.ENEMY_SPAWN_RATE) {
        spawnEnemy();
    }
    
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        gameState.enemies[i].update();
        
        if (gameState.enemies[i].collidesWith(gameState.player)) {
            endGame();
            return;
        }
        
        if (gameState.enemies[i].isOutOfBounds()) {
            gameState.enemies.splice(i, 1);
            gameState.score += GAME_CONFIG.SCORE_INCREMENT;
        }
    }
}

function render() {
    gameState.ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    applyScreenShake();
    drawMovingRoad();
    gameState.player.draw();
    gameState.enemies.forEach(enemy => enemy.draw());
    drawScore();
}

function spawnEnemy() {
    const xPos = gameState.canvas.width / 2 - GAME_CONFIG.ENEMY_INITIAL_WIDTH / 2;
    gameState.enemies.push(new Enemy(xPos, -GAME_CONFIG.ENEMY_INITIAL_HEIGHT));
}

function drawScore() {
    gameState.ctx.fillStyle = 'white';
    gameState.ctx.font = '20px "Press Start 2P", cursive';
    gameState.ctx.textAlign = 'left';
    gameState.ctx.fillText(`SCORE: ${gameState.score}`, 20, 30);
}

function applyScreenShake() {
    if (gameState.shakeIntensity > 0) {
        const x = (Math.random() - 0.5) * gameState.shakeIntensity;
        const y = (Math.random() - 0.5) * gameState.shakeIntensity;
        gameState.ctx.setTransform(1, 0, 0, 1, x, y);
        gameState.shakeIntensity *= 0.9;
        
        if (gameState.shakeIntensity < 0.1) {
            gameState.shakeIntensity = 0;
            gameState.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
    }
}

function endGame() {
    gameState.gameOver = true;
    gameState.shakeIntensity = 15;

    gameState.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);

    requestAnimationFrame(() => {
        const gradient = gameState.ctx.createLinearGradient(0, 0, gameState.canvas.width, gameState.canvas.height);
        gradient.addColorStop(0, 'rgba(32, 0, 44, 0.9)');
        gradient.addColorStop(1, 'rgba(148, 0, 211, 0.9)');
        
        gameState.ctx.fillStyle = gradient;
        gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
        
        const glitchOffsetX = Math.random() * 8 - 4;
        const glitchOffsetY = Math.random() * 8 - 4;
        
        gameState.ctx.fillStyle = '#ff1493';
        gameState.ctx.font = '30px "Press Start 2P", cursive';
        gameState.ctx.textAlign = 'center';
        
        for (let i = 0; i < 3; i++) {
            gameState.ctx.shadowColor = i % 2 === 0 ? '#00ffff' : '#ff00ff';
            gameState.ctx.shadowBlur = 15 - i * 5;
            gameState.ctx.fillText('COLISÃO!', gameState.canvas.width / 2 + glitchOffsetX, gameState.canvas.height / 2 - 60 + glitchOffsetY);
        }
        
        gameState.ctx.shadowColor = '#00ffff';
        gameState.ctx.shadowBlur = 15;
        gameState.ctx.fillText('GAME OVER', gameState.canvas.width / 2, gameState.canvas.height / 2 - 20);
        
        gameState.ctx.fillStyle = '#00ffff';
        gameState.ctx.shadowColor = '#ff00ff';
        gameState.ctx.font = '20px "Press Start 2P", cursive';
        gameState.ctx.fillText(`Pontuação: ${gameState.score}`, gameState.canvas.width / 2, gameState.canvas.height / 2 + 20);
        
        gameState.ctx.fillStyle = '#ffffff';
        gameState.ctx.shadowColor = '#ff1493';
        gameState.ctx.font = '16px "Press Start 2P", cursive';
        gameState.ctx.fillText('Pressione ENTER para continuar', gameState.canvas.width / 2, gameState.canvas.height / 2 + 60);
        
        gameState.ctx.shadowBlur = 0;
        drawExplosionParticles(gameState.canvas.width / 2, gameState.canvas.height / 2);
    });
}

function drawVaporwaveParticles() {
    const colors = ['#ff00ff', '#00ffff', '#ff1493', '#9400d3'];
    
    for (let i = 0; i < 20; i++) {
        const size = Math.random() * 5;
        const x = Math.random() * gameState.canvas.width;
        const y = Math.random() * gameState.canvas.height;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        gameState.ctx.fillStyle = color;
        gameState.ctx.beginPath();
        gameState.ctx.arc(x, y, size, 0, Math.PI * 2);
        gameState.ctx.fill();
    }
}

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

window.addEventListener('load', init);