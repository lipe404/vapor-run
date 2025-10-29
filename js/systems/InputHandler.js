import { gameState } from "../gameState.js";
import { startGame } from "../main.js";

/**
 * Configura os listeners de eventos
 */
export function setupEventListeners() {
  document.addEventListener("keydown", keyDownHandler);
  document.addEventListener("keyup", keyUpHandler);
  window.addEventListener("resize", () => {
    // Será implementado no main.js
    window.dispatchEvent(new CustomEvent("canvasResize"));
  });

  // Eventos para botões HTML
  const startButton = document.getElementById("start-button");
  const restartButton = document.getElementById("restart-button");

  if (startButton) {
    startButton.addEventListener("click", () => {
      if (!gameState.gameStarted && !gameState.gameOver) {
        startGame();
      }
    });
  }

  if (restartButton) {
    restartButton.addEventListener("click", () => {
      if (gameState.gameOver) {
        startGame();
      }
    });
  }
}

/**
 * Manipula teclas pressionadas
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
      break;
  }
}

/**
 * Manipula teclas soltas
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
