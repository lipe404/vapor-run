import { GAME_CONFIG } from "../config.js";

export class Particle {
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
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Cria partículas de explosão
 */
export function createExplosionParticles(x, y, particles) {
  const colors = [
    GAME_CONFIG.COLORS.PINK,
    GAME_CONFIG.COLORS.CYAN,
    GAME_CONFIG.COLORS.MAGENTA,
    GAME_CONFIG.COLORS.PURPLE_MID,
    GAME_CONFIG.COLORS.ORANGE,
  ];

  for (let i = 0; i < GAME_CONFIG.EFFECTS.PARTICLE_COUNT; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 5 + 2;
    const speedX = (Math.random() - 0.5) * 10;
    const speedY = (Math.random() - 0.5) * 10;
    const life = GAME_CONFIG.EFFECTS.PARTICLE_LIFE;

    particles.push(new Particle(x, y, color, size, speedX, speedY, life));
  }
}
