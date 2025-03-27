// Constantes do jogo
const GAME_CONFIG = {
    PLAYER_SPEED: 7,
    ENEMY_SPAWN_RATE: 0.02,
    ENEMY_MIN_SPEED: 2,
    ENEMY_MAX_SPEED: 5,
    ENEMY_GROWTH_RATE: 0.03,
    SCORE_INCREMENT: 1,
    PLAYER_WIDTH: 50,
    PLAYER_HEIGHT: 100,
    ENEMY_INITIAL_WIDTH: 20,
    ENEMY_INITIAL_HEIGHT: 40
};

// Variáveis globais
let canvas, ctx;
let gameStarted = false;
let gameOver = false;
let lastFrameTime = 0;
let player, enemies = [], score = 0;
let keys = { left: false, right: false };
let images = {};
let assetsLoaded = false;

// Classes para organização do código
class Player {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = GAME_CONFIG.PLAYER_SPEED;
    }

    draw() {
        if (images.car && assetsLoaded) {
            ctx.drawImage(images.car, this.x, this.y, this.width, this.height);
        }
    }

    update() {
        if (keys.left && this.x > 0) {
            this.x -= this.speed;
        }
        if (keys.right && this.x < canvas.width - this.width) {
            this.x += this.speed;
        }
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.ENEMY_INITIAL_WIDTH;
        this.height = GAME_CONFIG.ENEMY_INITIAL_HEIGHT;
        this.speed = Math.random() * (GAME_CONFIG.ENEMY_MAX_SPEED - GAME_CONFIG.ENEMY_MIN_SPEED) + GAME_CONFIG.ENEMY_MIN_SPEED;
        this.scale = 0.5;
    }

    draw() {
        if (images.enemy && assetsLoaded) {
            ctx.drawImage(
                images.enemy, 
                this.x, 
                this.y, 
                this.width * this.scale, 
                this.height * this.scale
            );
        }
    }

    update() {
        this.y += this.speed;
        this.scale += GAME_CONFIG.ENEMY_GROWTH_RATE;
    }

    isOutOfBounds() {
        return this.y > canvas.height;
    }

    collidesWith(player) {
        return (
            player.x < this.x + this.width * this.scale &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height * this.scale &&
            player.y + player.height > this.y
        );
    }
}

// Inicialização do jogo
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    // Carregar assets
    loadAssets().then(() => {
        assetsLoaded = true;
        resetGame();
        showStartScreen();
    }).catch(error => {
        console.error("Erro ao carregar assets:", error);
        // Fallback básico se as imagens não carregarem
        assetsLoaded = false;
        resetGame();
        showStartScreen();
    });

    // Event listeners
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    window.addEventListener('resize', resizeCanvas);
}

// Carregamento de assets com Promise
function loadAssets() {
    return new Promise((resolve, reject) => {
        const assets = {
            startScreen: 'imgs/fundo2.jpg',
            road: 'imgs/road2.jpg',
            car: 'imgs/car.png',
            enemy: 'imgs/enemy.png'
        };

        let loaded = 0;
        const total = Object.keys(assets).length;
        
        images = Object.keys(assets).reduce((acc, key) => {
            acc[key] = new Image();
            acc[key].onload = () => {
                loaded++;
                if (loaded === total) resolve();
            };
            acc[key].onerror = () => {
                console.error(`Erro ao carregar imagem: ${assets[key]}`);
                loaded++;
                if (loaded === total) resolve(); // Continuar mesmo com erros
            };
            acc[key].src = assets[key];
            return acc;
        }, {});
    });
}

// Redimensionar canvas
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.9;
    
    if (player) {
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - player.height - 20;
    }
}

// Resetar estado do jogo
function resetGame() {
    player = new Player(
        canvas.width / 2 - GAME_CONFIG.PLAYER_WIDTH / 2,
        canvas.height - GAME_CONFIG.PLAYER_HEIGHT - 20,
        GAME_CONFIG.PLAYER_WIDTH,
        GAME_CONFIG.PLAYER_HEIGHT
    );
    enemies = [];
    score = 0;
    gameOver = false;
}

// Tela inicial
function showStartScreen() {
    if (!assetsLoaded) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('Carregando...', canvas.width / 2, canvas.height / 2);
        return;
    }

    ctx.drawImage(images.startScreen, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00ffff';
    ctx.font = '24px "Press Start 2P", cursive';
    ctx.textAlign = 'center';
    
    // Efeito de glitch no texto
    const glitchOffset = Math.random() * 2 - 1;
    ctx.fillText('V A P O R R U N', canvas.width / 2 + glitchOffset, canvas.height / 2 - 50);
    
    ctx.font = '16px "Press Start 2P", cursive';
    ctx.fillText('Pressione ENTER para começar', canvas.width / 2, canvas.height / 2 + 20);
    
    // Solicitar próximo frame para animação
    if (!gameStarted) {
        requestAnimationFrame(showStartScreen);
    }
}

// Iniciar jogo
function startGame() {
    gameStarted = true;
    gameOver = false;
    resetGame();
    lastFrameTime = performance.now();
    gameLoop(lastFrameTime);
}

// Loop principal do jogo
function gameLoop(timestamp) {
    if (!gameStarted || gameOver) return;
    
    // Calcular delta time para movimento consistente em diferentes FPS
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    update(deltaTime);
    render();
    
    requestAnimationFrame(gameLoop);
}

// Atualizar estado do jogo
function update(deltaTime) {
    player.update();
    
    // Spawn de inimigos
    if (Math.random() < GAME_CONFIG.ENEMY_SPAWN_RATE) {
        spawnEnemy();
    }
    
    // Atualizar inimigos
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        
        // Verificar colisões
        if (enemies[i].collidesWith(player)) {
            endGame();
            return;
        }
        
        // Remover inimigos fora da tela
        if (enemies[i].isOutOfBounds()) {
            enemies.splice(i, 1);
            score += GAME_CONFIG.SCORE_INCREMENT;
        }
    }
}

// Renderizar o jogo
function render() {
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar fundo
    if (assetsLoaded && images.road) {
        ctx.drawImage(images.road, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#20002c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Desenhar jogador
    player.draw();
    
    // Desenhar inimigos
    enemies.forEach(enemy => enemy.draw());
    
    // Desenhar score
    drawScore();
}

// Criar novo inimigo
function spawnEnemy() {
    const xPos = Math.random() * (canvas.width - GAME_CONFIG.ENEMY_INITIAL_WIDTH);
    enemies.push(new Enemy(xPos, -GAME_CONFIG.ENEMY_INITIAL_HEIGHT));
}

// Desenhar pontuação
function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '20px "Press Start 2P", cursive';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 30);
}

// Finalizar jogo
function endGame() {
    gameOver = true;
    
    // Desenhar tela de game over
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ff1493';
    ctx.font = '24px "Press Start 2P", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.fillStyle = 'white';
    ctx.font = '16px "Press Start 2P", cursive';
    ctx.fillText(`Pontuação: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('Pressione ENTER para jogar novamente', canvas.width / 2, canvas.height / 2 + 50);
}

// Handlers de teclado
function keyDownHandler(e) {
    if (e.key === 'Enter' && !gameStarted) {
        startGame();
    }
    if (e.key === 'Enter' && gameOver) {
        startGame();
    }
    if (e.key === 'ArrowLeft') {
        keys.left = true;
    }
    if (e.key === 'ArrowRight') {
        keys.right = true;
    }
}

function keyUpHandler(e) {
    if (e.key === 'ArrowLeft') {
        keys.left = false;
    }
    if (e.key === 'ArrowRight') {
        keys.right = false;
    }
}

// Iniciar quando a janela carregar
window.addEventListener('load', init);