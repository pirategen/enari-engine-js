import { Game } from "./Game.js";
import { initializeAmmo } from "./Physics/Ammo.js";
async function main() {
  await initializeAmmo();
  const game = Game.getInstance();
  window.game = game; // Expose to global scope for Player.js
  await game.globalLoadingManager.loadAllMeshs(game.mapName);
  game.onLoad();
  game.startUpdateLoop();
}
main();

