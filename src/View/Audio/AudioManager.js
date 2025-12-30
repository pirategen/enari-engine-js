import * as THREE from "three";

export class AudioManager extends THREE.AudioListener {
  soundBuffers = new Map();
  audioLoader = new THREE.AudioLoader();

  constructor() {
    super();
    this.loadSounds();
  }

  loadSounds() {
    const sounds = [
        { id: "ak47_reload_clipout", path: "assets/sounds/1/reload/ak47_clipout.wav" },
        { id: "ak47_reload_clipin", path: "assets/sounds/1/reload/ak47_clipin.wav" },
        { id: "ak47_reload_boltpull", path: "assets/sounds/1/reload/ak47_bolt_pull.wav" },
        { id: "ak47_shoot", path: "assets/sounds/1/shoot/ak47-2.wav" },
        { id: "ak47_dryfire", path: "assets/sounds/1/shoot/dryfire_rifle.wav" },

        { id: "usp_reload_clipout", path: "assets/sounds/2/reload/usp_clipout.wav" },
        { id: "usp_reload_clipin", path: "assets/sounds/2/reload/usp_clipin.mp3" },
        { id: "usp_reload_slideback", path: "assets/sounds/2/reload/usp_slideback.wav" },
        { id: "usp_shoot", path: "assets/sounds/2/shoot/usp1.wav" },
        { id: "usp_dryfire", path: "assets/sounds/2/shoot/dryfire_pistol.wav" },

        { id: "knife_slash", path: "assets/sounds/3/shoot/knife_slash1.wav" },
        { id: "knife_hitwall", path: "assets/sounds/3/shoot/knife_hitwall1.wav" },
        { id: "knife_hitplayer", path: "assets/sounds/3/shoot/knife_hit4.wav" },
        { id: "knife_deploy", path: "assets/sounds/3/shoot/knife_deploy.mp3" },

        { id: "respawn_1", path: "assets/sounds/Respawn/go.wav" },
        { id: "respawn_2", path: "assets/sounds/Respawn/locknload.wav" },
        { id: "respawn_3", path: "assets/sounds/Respawn/moveout.wav" },
    ];

    sounds.forEach(sound => {
        this.audioLoader.load(sound.path, (buffer) => {
            this.soundBuffers.set(sound.id, buffer);
        });
    });
  }

  playSound(id, volume = 0.5) {
      if (!this.soundBuffers.has(id)) return;
      const sound = new THREE.Audio(this);
      sound.setBuffer(this.soundBuffers.get(id));
      sound.setVolume(volume);
      sound.play();
  }

  playAK47Reload() {
      // clipout -> clipin (900ms) -> boltpull (1800ms)
      this.playSound("ak47_reload_clipout");
      setTimeout(() => this.playSound("ak47_reload_clipin"), 1000);
      setTimeout(() => this.playSound("ak47_reload_boltpull"), 1800);
  }

  playUSPReload() {
      // clipout -> clipin (400ms) -> slideback (1000ms)
      this.playSound("usp_reload_clipout");
      setTimeout(() => this.playSound("usp_reload_clipin"), 600);
      setTimeout(() => this.playSound("usp_reload_slideback"), 1100);
  }

  playShoot(weaponName) {
      if (weaponName === "AK47") this.playSound("ak47_shoot");
      else if (weaponName === "Usp") this.playSound("usp_shoot");
  }

  playDryFire(weaponName) {
      if (weaponName === "AK47") this.playSound("ak47_dryfire");
      else if (weaponName === "Usp") this.playSound("usp_dryfire");
  }

  playKnifeSlash() { this.playSound("knife_slash"); }
  playKnifeHitWall() { this.playSound("knife_hitwall"); }
  playKnifeHitPlayer() { this.playSound("knife_hitplayer"); }
  
  playAK47Deploy() { this.playSound("ak47_reload_boltpull"); }
  playUSPDeploy() { this.playSound("usp_reload_slideback"); }
  playKnifeDeploy() { this.playSound("knife_deploy"); }

  playRespawn() {
      const idx = Math.floor(Math.random() * 3) + 1;
      this.playSound(`respawn_${idx}`);
  }
}
