/**
 * CONSTANTES DE CONFIGURAÇÃO DO JOGO
 * Todas as configurações ajustáveis do jogo ficam aqui para fácil modificação
 */
const GAME_CONFIG = {
    PLAYER_SPEED: 9,               // Velocidade de movimento do jogador
    ENEMY_SPAWN_RATE: 0.02,        // Chance de spawnar inimigo a cada frame (0-1)
    ENEMY_MIN_SPEED: 3,            // Velocidade mínima dos inimigos
    ENEMY_MAX_SPEED: 7,            // Velocidade máxima dos inimigos
    ENEMY_GROWTH_RATE: 0.03,       // Taxa de crescimento dos inimigos (efeito de aproximação)
    SCORE_INCREMENT: 1,            // Pontos ganhos por inimigo evitado
    PLAYER_WIDTH: 100,              // Largura do jogador
    PLAYER_HEIGHT: 100,            // Altura do jogador
    ENEMY_INITIAL_WIDTH: 20,       // Largura inicial dos inimigos
    ENEMY_INITIAL_HEIGHT: 40,      // Altura inicial dos inimigos
    ENEMY_TURN_POINT: 0.5,         // Ponto da tela onde inimigos mudam direção (0-1)
    ASPECT_RATIO: 0.8,             // Proporção do canvas em relação à janela (largura)
    VERTICAL_RATIO: 0.9            // Proporção do canvas em relação à janela (altura)
};

/**
 * VARIÁVEIS GLOBAIS DO JOGO
 * Estado atual do jogo e elementos principais
 */
let canvas, ctx;                   // Elementos do canvas e contexto 2D
let gameStarted = false;           // Flag indicando se o jogo começou
let gameOver = false;              // Flag indicando se o jogo terminou
let lastFrameTime = 0;             // Timestamp do último frame (para cálculo de deltaTime)
let player;                        // Objeto do jogador
let enemies = [];                  // Array de inimigos ativos
let score = 0;                     // Pontuação atual
let keys = { left: false, right: false }; // Estado das teclas pressionadas
let images = {};                   // Objeto para armazenar imagens carregadas
let assetsLoaded = false;          // Flag indicando se assets foram carregados

/**
 * CLASSE PLAYER
 * Representa o jogador e seu comportamento
 */
class Player {
    constructor(x, y, width, height) {
        this.x = x;                // Posição X inicial
        this.y = y;                // Posição Y inicial
        this.width = width;        // Largura do sprite
        this.height = height;      // Altura do sprite
        this.speed = GAME_CONFIG.PLAYER_SPEED; // Velocidade de movimento
    }

    /**
     * Desenha o jogador na tela
     */
    draw() {
        if (images.car && assetsLoaded) {
            ctx.drawImage(images.car, this.x, this.y, this.width, this.height);
        }
    }

    /**
     * Atualiza a posição do jogador baseado nas teclas pressionadas
     */
    update() {
        // Movimento para esquerda com limite na borda
        if (keys.left && this.x > 0) {
            this.x -= this.speed;
        }
        // Movimento para direita com limite na borda
        if (keys.right && this.x < canvas.width - this.width) {
            this.x += this.speed;
        }
    }
}

/**
 * CLASSE ENEMY
 * Representa os inimigos e seu comportamento
 */
class Enemy {
    constructor(x, y) {
        this.x = x;                // Posição X inicial (centro da tela)
        this.y = y;                // Posição Y inicial (topo da tela)
        this.width = GAME_CONFIG.ENEMY_INITIAL_WIDTH;
        this.height = GAME_CONFIG.ENEMY_INITIAL_HEIGHT;
        // Velocidade aleatória dentro dos limites configurados
        this.speed = Math.random() * (GAME_CONFIG.ENEMY_MAX_SPEED - GAME_CONFIG.ENEMY_MIN_SPEED) + GAME_CONFIG.ENEMY_MIN_SPEED;
        this.scale = 0.4;          // Escala inicial (efeito de perspectiva)
        // Direção aleatória (esquerda ou direita)
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.turned = false;       // Flag indicando se já iniciou movimento diagonal
    }

    /**
     * Desenha o inimigo na tela com efeito vaporwave
     */
    draw() {
        if (images.enemy && assetsLoaded) {
            ctx.save(); // Salva o estado atual do contexto
            // Aplica efeito de brilho neon
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 5;
            // Desenha o inimigo com escala atual
            ctx.drawImage(
                images.enemy, 
                this.x, 
                this.y, 
                this.width * this.scale, 
                this.height * this.scale
            );
            ctx.restore(); // Restaura o estado do contexto
        }
    }

    /**
     * Atualiza a posição e escala do inimigo
     */
    update() {
        // Movimento vertical (descendo)
        this.y += this.speed;
        // Aumenta a escala (efeito de aproximação)
        this.scale += GAME_CONFIG.ENEMY_GROWTH_RATE;
        
        // Verifica se atingiu o ponto de mudança de direção
        if (!this.turned && this.y > canvas.height * GAME_CONFIG.ENEMY_TURN_POINT) {
            this.turned = true;
        }
        
        // Se já passou do ponto de virada, move-se horizontalmente
        if (this.turned) {
            this.x += this.speed * 0.7 * this.direction; // 70% da velocidade vertical
        }
    }

    /**
     * Verifica se o inimigo saiu dos limites da tela
     */
    isOutOfBounds() {
        return this.y > canvas.height ||    // Saiu pela parte inferior
               this.x < -this.width * this.scale || // Saiu pela esquerda
               this.x > canvas.width;       // Saiu pela direita
    }

    /**
     * Verifica colisão com o jogador
     */
    collidesWith(player) {
        // Calcula os limites do inimigo considerando a escala
        const enemyLeft = this.x;
        const enemyRight = this.x + this.width * this.scale;
        const enemyTop = this.y;
        const enemyBottom = this.y + this.height * this.scale;
        
        // Calcula os limites do jogador
        const playerLeft = player.x;
        const playerRight = player.x + player.width;
        const playerTop = player.y;
        const playerBottom = player.y + player.height;
        
        // Verifica se há sobreposição em ambos os eixos
        return !(
            enemyRight < playerLeft || 
            enemyLeft > playerRight || 
            enemyBottom < playerTop || 
            enemyTop > playerBottom
        );
    }
}

/**
 * INICIALIZAÇÃO DO JOGO
 * Configura canvas, carrega assets e prepara o jogo
 */
function init() {
    // Obtém referências do canvas e contexto
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Ajusta o tamanho do canvas
    resizeCanvas();
    
    // Carrega os assets (imagens)
    loadAssets()
        .then(() => {
            assetsLoaded = true;
            resetGame();
            showStartScreen();
        })
        .catch(error => {
            console.error("Erro ao carregar assets:", error);
            // Fallback caso as imagens não carreguem
            assetsLoaded = false;
            resetGame();
            showStartScreen();
        });

    // Configura listeners de eventos
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    window.addEventListener('resize', resizeCanvas);
}

/**
 * CARREGAMENTO DE ASSETS
 * Carrega todas as imagens necessárias usando Promises
 */
function loadAssets() {
    return new Promise((resolve, reject) => {
        // Mapeamento de assets
        const assets = {
            startScreen: 'imgs/fundo2.jpg',
            road: 'imgs/road2.jpg',
            car: 'imgs/car.png',
            enemy: 'imgs/enemy.png'
        };

        let loaded = 0;
        const total = Object.keys(assets).length;
        
        // Carrega cada imagem
        images = Object.keys(assets).reduce((acc, key) => {
            acc[key] = new Image();
            acc[key].onload = () => {
                loaded++;
                if (loaded === total) resolve();
            };
            acc[key].onerror = () => {
                console.error(`Erro ao carregar imagem: ${assets[key]}`);
                loaded++;
                if (loaded === total) resolve(); // Continua mesmo com erros
            };
            acc[key].src = assets[key];
            return acc;
        }, {});
    });
}

/**
 * REDIMENSIONAMENTO DO CANVAS
 * Ajusta o canvas para o tamanho da janela mantendo proporções
 */
function resizeCanvas() {
    // Define tamanho baseado na janela e proporções configuradas
    canvas.width = window.innerWidth * GAME_CONFIG.ASPECT_RATIO;
    canvas.height = window.innerHeight * GAME_CONFIG.VERTICAL_RATIO;
    
    // Reposiciona o jogador se existir
    if (player) {
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - player.height - 20;
    }
}

/**
 * RESET DO JOGO
 * Prepara um novo estado inicial do jogo
 */
function resetGame() {
    // Cria novo jogador na posição inicial
    player = new Player(
        canvas.width / 2 - GAME_CONFIG.PLAYER_WIDTH / 2,
        canvas.height - GAME_CONFIG.PLAYER_HEIGHT - 20,
        GAME_CONFIG.PLAYER_WIDTH,
        GAME_CONFIG.PLAYER_HEIGHT
    );
    enemies = []; // Limpa array de inimigos
    score = 0;    // Zera pontuação
    gameOver = false; // Reseta estado do jogo
}

/**
 * TELA INICIAL
 * Exibe a tela de início com efeitos vaporwave
 */
function showStartScreen() {
    // Tela de carregamento se assets não estiverem prontos
    if (!assetsLoaded) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('Carregando...', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Desenha imagem de fundo
    ctx.drawImage(images.startScreen, 0, 0, canvas.width, canvas.height);
    
    // Overlay semi-transparente para melhor legibilidade
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Configura estilo do texto principal
    ctx.fillStyle = '#00ffff';
    ctx.font = '24px "Press Start 2P", cursive';
    ctx.textAlign = 'center';
    
    // Efeito de glitch aleatório no texto
    const glitchOffset = Math.random() * 2 - 1;
    const glitchOffsetY = Math.random() * 2 - 1;
    
    // Efeito neon com sombra
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 10;
    ctx.fillText('V A P O R R U N', canvas.width / 2 + glitchOffset, canvas.height / 2 - 50 + glitchOffsetY);
    
    // Remove sombra para próximos textos
    ctx.shadowBlur = 0;
    
    // Texto de instrução
    ctx.font = '16px "Press Start 2P", cursive';
    ctx.fillStyle = '#ffffff';
    
    // Efeito de piscar (90% de chance de desenhar)
    if (Math.random() > 0.1) {
        ctx.fillText('Pressione ENTER para começar', canvas.width / 2, canvas.height / 2 + 20);
    }
    
    // Animação contínua da tela inicial
    if (!gameStarted) {
        requestAnimationFrame(showStartScreen);
    }
}

/**
 * INICIAR JOGO
 * Começa o loop principal do jogo
 */
function startGame() {
    gameStarted = true;
    gameOver = false;
    resetGame();
    lastFrameTime = performance.now();
    gameLoop(lastFrameTime);
}

/**
 * LOOP PRINCIPAL DO JOGO
 * Controla a execução frame a frame do jogo
 */
function gameLoop(timestamp) {
    // Sai do loop se o jogo não estiver ativo
    if (!gameStarted || gameOver) return;
    
    // Calcula tempo desde o último frame para movimento consistente
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    // Atualiza estado do jogo e renderiza
    update(deltaTime);
    render();
    
    // Solicita próximo frame
    requestAnimationFrame(gameLoop);
}

/**
 * ATUALIZAÇÃO DO JOGO
 * Atualiza todos os elementos do jogo
 */
function update(deltaTime) {
    // Normaliza movimento baseado no tempo (para FPS consistente)
    const normalizedDelta = deltaTime / 16; // 16ms ≈ 60fps
    
    // Atualiza posição do jogador
    player.update();
    
    // Chance de spawnar novo inimigo
    if (Math.random() < GAME_CONFIG.ENEMY_SPAWN_RATE) {
        spawnEnemy();
    }
    
    // Atualiza todos os inimigos
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        
        // Verifica colisão com jogador
        if (enemies[i].collidesWith(player)) {
            // Efeito sonoro de colisão (opcional)
            if (typeof playCrashSound === 'function') {
                playCrashSound();
            }
            endGame();
            return;
        }
        
        // Remove inimigos que saíram da tela e incrementa pontuação
        if (enemies[i].isOutOfBounds()) {
            enemies.splice(i, 1);
            score += GAME_CONFIG.SCORE_INCREMENT;
        }
    }
}

/**
 * RENDERIZAÇÃO DO JOGO
 * Desenha todos os elementos na tela
 */
function render() {
    // Limpa o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Aplica tremor se estiver ativo
    applyScreenShake();
    
    // Desenha fundo (imagem ou fallback)
    if (assetsLoaded && images.road) {
        ctx.drawImage(images.road, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#20002c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Desenha jogador
    player.draw();
    
    // Desenha todos os inimigos
    enemies.forEach(enemy => enemy.draw());
    
    // Desenha pontuação
    drawScore();
}

/**
 * SPAWN DE INIMIGOS
 * Cria um novo inimigo no topo central da tela
 */
function spawnEnemy() {
    const xPos = canvas.width / 2 - GAME_CONFIG.ENEMY_INITIAL_WIDTH / 2;
    enemies.push(new Enemy(xPos, -GAME_CONFIG.ENEMY_INITIAL_HEIGHT));
}

/**
 * DESENHA PONTUAÇÃO
 * Exibe a pontuação atual no canto superior esquerdo
 */
function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '20px "Press Start 2P", cursive';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 30);
}

/**
 * EFEITO DE TREMOR NA TELA
 * Simula um tremor quando ocorre colisão
 */
let shakeIntensity = 0;

function applyScreenShake() {
    if (shakeIntensity > 0) {
        const x = (Math.random() - 0.5) * shakeIntensity;
        const y = (Math.random() - 0.5) * shakeIntensity;
        ctx.setTransform(1, 0, 0, 1, x, y);
        shakeIntensity *= 0.9; // Reduz a intensidade gradualmente
        
        if (shakeIntensity < 0.1) {
            shakeIntensity = 0;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
    }
}

/**
 * FIM DE JOGO
 * Exibe tela de game over com estilo vaporwave
 */
function endGame() {
    gameOver = true;
    shakeIntensity = 15; // Inicia o tremor

    // Efeito de flash vermelho no momento da colisão
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Aguarda um frame antes de mostrar a tela de game over completa
    requestAnimationFrame(() => {
        // Fundo semi-transparente com gradiente vaporwave
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(32, 0, 44, 0.9)');
        gradient.addColorStop(1, 'rgba(148, 0, 211, 0.9)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Efeito de glitch mais intenso
        const glitchOffsetX = Math.random() * 8 - 4;
        const glitchOffsetY = Math.random() * 8 - 4;
        
        // Texto principal com múltiplas sombras para efeito neon
        ctx.fillStyle = '#ff1493';
        ctx.font = '30px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        
        // Efeito de múltiplas sombras
        for (let i = 0; i < 3; i++) {
            ctx.shadowColor = i % 2 === 0 ? '#00ffff' : '#ff00ff';
            ctx.shadowBlur = 15 - i * 5;
            ctx.fillText('COLISÃO!', canvas.width / 2 + glitchOffsetX, canvas.height / 2 - 60 + glitchOffsetY);
        }
        
        // Texto "GAME OVER" abaixo
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
        
        // Pontuação final
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#ff00ff';
        ctx.font = '20px "Press Start 2P", cursive';
        ctx.fillText(`Pontuação: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
        
        // Instrução para recomeçar
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ff1493';
        ctx.font = '16px "Press Start 2P", cursive';
        ctx.fillText('Pressione ENTER para continuar', canvas.width / 2, canvas.height / 2 + 60);
        
        // Remove efeitos de sombra
        ctx.shadowBlur = 0;
        
        // Efeito de partículas vaporwave mais intenso
        drawExplosionParticles(canvas.width / 2, canvas.height / 2);
    });
    
    // Fundo semi-transparente
    ctx.fillStyle = 'rgba(32, 0, 44, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Efeito de glitch aleatório
    const glitchOffsetX = Math.random() * 4 - 2;
    const glitchOffsetY = Math.random() * 4 - 2;
    
    // Texto principal com efeito neon
    ctx.fillStyle = '#ff1493';
    ctx.font = '30px "Press Start 2P", cursive';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fillText('GAME OVER', canvas.width / 2 + glitchOffsetX, canvas.height / 2 - 30 + glitchOffsetY);
    
    // Pontuação final
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#ff00ff';
    ctx.font = '20px "Press Start 2P", cursive';
    ctx.fillText(`PONTUAÇÃO: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    
    // Instrução para recomeçar
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff1493';
    ctx.font = '16px "Press Start 2P", cursive';
    ctx.fillText('Pressione ENTER para jogar novamente', canvas.width / 2, canvas.height / 2 + 60);
    
    // Remove efeitos de sombra
    ctx.shadowBlur = 0;
    
    // Efeito de partículas vaporwave
    drawVaporwaveParticles();
}

/**
 * EFEITO DE PARTÍCULAS VAPORWAVE
 * Desenha partículas coloridas aleatórias
 */
function drawVaporwaveParticles() {
    // Cores características do estilo vaporwave
    const colors = ['#ff00ff', '#00ffff', '#ff1493', '#9400d3'];
    const particleCount = 30;
    
    // Desenha 20 partículas aleatórias
    for (let i = 0; i < 20; i++) {
        const size = Math.random() * 5;
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * HANDLER DE TECLAS PRESSIONADAS
 */
function keyDownHandler(e) {
    // Enter inicia ou reinicia o jogo
    if (e.key === 'Enter' && (!gameStarted || gameOver)) {
        startGame();
    }
    // Setas movem o jogador
    if (e.key === 'ArrowLeft') {
        keys.left = true;
    }
    if (e.key === 'ArrowRight') {
        keys.right = true;
    }
}

/**
 * HANDLER DE TECLAS LIBERADAS
 */
function keyUpHandler(e) {
    if (e.key === 'ArrowLeft') {
        keys.left = false;
    }
    if (e.key === 'ArrowRight') {
        keys.right = false;
    }
}

// Inicia o jogo quando a página carregar
window.addEventListener('load', init);