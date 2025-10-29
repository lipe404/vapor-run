import { GAME_CONFIG } from "../config.js";
import { gameState } from "../gameState.js";

/**
 * Carrega todos os assets do jogo
 */
export function loadAssets() {
  return new Promise((resolve, reject) => {
    const assets = GAME_CONFIG.ASSETS;
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

        // Atualiza barra de progresso
        const loadingBar = document.getElementById("loading-bar");
        if (loadingBar) {
          loadingBar.style.width = `${gameState.assetsLoadingProgress}%`;
        }

        if (loadedCount === totalAssets) {
          resolve();
        }
      };

      img.onerror = () => {
        console.error(`Falha ao carregar asset: ${assets[key]}`);
        loadedCount++;

        if (loadedCount === totalAssets) {
          reject(
            new Error(`Falha ao carregar um ou mais assets: ${assets[key]}`)
          );
        }
      };

      img.src = assets[key];
      gameState.images[key] = img;
    }
  });
}

/**
 * Lida com erros no carregamento de assets
 */
export function handleAssetsError(error) {
  console.error("Erro ao carregar assets:", error);
  gameState.assetsLoaded = false;

  // Mostra tela inicial mesmo com erro
  const startScreen = document.getElementById("start-screen");
  const loadingScreen = document.getElementById("loading-screen");

  if (loadingScreen) loadingScreen.classList.add("hidden");
  if (startScreen) startScreen.classList.remove("hidden");
}
