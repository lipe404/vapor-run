/**
 * Configurações centralizadas do jogo
 */
export const GAME_CONFIG = {
  // Configurações Globais
  FPS_TARGET: 60,
  ASPECT_RATIO: 16 / 9,
  BASE_HEIGHT: 720,
  ROAD_LANES: 3,
  INITIAL_GAME_SPEED: 0.005,
  MAX_GAME_SPEED: 0.015,
  DIFFICULTY_RAMP_TIME: 120000, // 2 minutos

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
  PLAYER: {
    SPEED: 0.5,
    ACCEL: 0.05,
    DECEL_FACTOR: 0.9,
    WIDTH_FACTOR: 0.08,
    HEIGHT_FACTOR: 0.12,
    Y_POS_FACTOR: 0.85,
  },

  // Inimigos
  ENEMY: {
    SPAWN_INTERVAL_MIN: 1000,
    SPAWN_INTERVAL_MAX: 3000,
    INITIAL_SPEED_FACTOR: 0.003,
    MAX_SPEED_FACTOR: 0.008,
    WIDTH_FACTOR: 0.05,
    HEIGHT_FACTOR: 0.08,
    // GROWTH_FACTOR: 0.002,
    SHADOW_BLUR: 10,
    SHADOW_COLOR: "#ff00ff",
    // NOVAS CONFIGURAÇÕES para perspectiva
    PERSPECTIVE_SPEED_MULTIPLIER: 100, // Multiplicador para a velocidade de movimento no eixo Y. Ajuste para mais rápido/lento
    MIN_SPAWN_SCALE: 0.05, // Escala mínima quando o inimigo aparece no horizonte
    MAX_APPROACH_SCALE: 1.0, // Escala máxima quando o inimigo está "próximo" do jogador
    NEAR_PLAYER_Y_FACTOR: 0.9, // Fator Y da tela onde o inimigo atinge a escala máxima
  },

  // Estrada
  ROAD: {
    WIDTH_FACTOR: 0.6,
    LINE_WIDTH_FACTOR: 0.01,
    LINE_HEIGHT_FACTOR: 0.05,
    LINE_GAP_FACTOR: 0.08,
    COLOR: "#333344",
    LINE_COLOR: "#ffffff",
    SHOULDER_COLOR: "#444455",
  },

  // Cenário
  SCENERY: {
    PALM_TREE_COUNT: 10,
    PALM_TREE_COLOR: "#ff00ff",
    MOUNTAIN_GRID_COLOR: "#ff00ff",
    MOUNTAIN_COUNT: 5,
    SUN_COLOR: "#ff8800",
    SUN_LINE_COLOR: "#ff00ff",
    SUN_LINE_COUNT: 20,
  },

  // Efeitos
  EFFECTS: {
    SCREEN_SHAKE_DURATION: 15,
    SCREEN_SHAKE_DECAY: 0.9,
    PARTICLE_COUNT: 30,
    PARTICLE_LIFE: 30,
    GLITCH_INTENSITY: 5,
  },

  // UI
  UI: {
    SCORE_INCREMENT: 1,
  },

  // Assets
  ASSETS: {
    car: "imgs/car.png",
    enemy: "imgs/enemy.png",
    road: "imgs/roadest.jpg",
    palmTree: "imgs/palm_tree.jpg",
  },
};
