import { gameState } from "../gameState.js";

/**
 * Inicializa referências aos elementos UI
 */
export function initUIElements() {
  gameState.uiElements = {
    loadingScreen: document.getElementById("loading-screen"),
    loadingBar: document.getElementById("loading-bar"),
    startScreen: document.getElementById("start-screen"),
    startButton: document.getElementById("start-button"),
    gameOverScreen: document.getElementById("game-over-screen"),
    restartButton: document.getElementById("restart-button"),
    scoreDisplay: document.getElementById("score-display"),
    currentScore: document.getElementById("current-score"),
    finalScore: document.getElementById("final-score"),
  };
}

/**
 * Mostra uma tela específica e esconde as outras
 */
export function showScreen(screenId) {
  const screens = [
    "loading-screen",
    "start-screen",
    "game-over-screen",
    "score-display",
  ];

  screens.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      if (id === screenId) {
        element.classList.remove("hidden");
      } else {
        element.classList.add("hidden");
      }
    }
  });
}

/**
 * Atualiza a exibição da pontuação
 */
export function updateScoreDisplay() {
  const currentScore = document.getElementById("current-score");
  if (currentScore) {
    currentScore.textContent = gameState.score;
  }
}

/**
 * Mostra a tela de game over
 */
export function showGameOverScreen() {
  showScreen("game-over-screen");
  const finalScore = document.getElementById("final-score");
  if (finalScore) {
    finalScore.textContent = gameState.score;
  }
}
