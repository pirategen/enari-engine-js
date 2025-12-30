import { PlayerRenderer } from "../../../View/Renderer/PlayerRenderer/PlayerRenderer.js";
import { Vector3D } from "../../../Core/Vector.js";
import { Game } from "../../../Game.js";
export class ThirdPersonRenderer extends PlayerRenderer {
  hasPlayedDeathAnim = false;
  
  handleJump() {
    this.tpsMesh.playAnimation("Jump");
  }
  removeMesh() {
    if (this.tpsMesh && this.tpsMesh.mesh) {
        this.game.removeFromRenderer(this.tpsMesh.mesh);
    }
  }
  show() {
    this.tpsMesh.mesh.visible = true;
  }
  hide() {
    this.tpsMesh.mesh.visible = false;
  }
  handleReload() {
  }
  handleWeaponSwitch() {
  }
  setMesh(mesh) {
    this.tpsMesh = mesh;
    this.tpsMesh.init();
    this.addToRenderer();
  }
  tpsMesh;
  handleZoom() {
    let fov = this.playerCameraManager.camera.fov;
    const zoom = [20, 50];
    if (fov === zoom[0]) {
      fov = this.baseFov;
    } else if (fov === zoom[1]) {
      fov = zoom[0];
    } else {
      fov = zoom[1];
    }
    this.setFov(fov);
  }
  handleShoot(hitscanResult) {
    super.handleShoot(hitscanResult);
  }
  handleMove(moveVector) {
    if (moveVector.z > 0) {
        this.tpsMesh.playAnimation("Walk_B_Static", true);
    } else {
        this.tpsMesh.playAnimation("Walk_F_Static", true);
    }
  }
  update(dt) {
    if (this.player.isDead) {
        // Play death animation only once
        if (!this.hasPlayedDeathAnim) {
            this.tpsMesh.playAnimation("Death", false);
            this.hasPlayedDeathAnim = true;
        }
        this.tpsMesh.update(dt);
        return; // Skip position/rotation updates to leave corpse in place
    }
    
    // Reset death animation flag when player is alive
    this.hasPlayedDeathAnim = false;

    // Reset Y position to player position
    // Physics body is at center of capsule (height 4.5, radius 1 -> total height 6.5).
    // Center is at Y. Bottom is Y - 3.25.
    // Reverting to -0.8 which was "slightly above" but acceptable for now compared to sunk.
    this.tpsMesh.mesh.position.set(this.player.position.x, this.player.position.y - 0.8, this.player.position.z);
    
    // Rotate model to face movement direction or camera direction
    this.tpsMesh.mesh.rotation.y = Math.atan2(this.player.lookingDirection.x, this.player.lookingDirection.z);
    
    this.tpsMesh.update(dt);
    
    if (this.player.velocity.distanceTo(Vector3D.ZERO()) < 0.1) {
      this.tpsMesh.playAnimation("Idle", true);
    }
  }
  constructor(player) {
    super(player);
    const mesh = Game.getInstance().globalLoadingManager.loadableMeshs.get("ThirdPersonMesh").clone();
    this.setMesh(mesh);
  }
  addToRenderer() {
    this.game.addToRenderer(this.tpsMesh.mesh);
  }
}

