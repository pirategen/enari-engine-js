//import { Renderer } from "./View/Renderer/Renderer.js";
import { Renderer } from "./View/Renderer/Renderer.js";
import { PlayerWrapper } from "./Core/PlayerWrapper.js";
import { InputManager } from "./Input/InputManager.js";
import { GlobalLoadingManager } from "./View/Mesh/GlobalLoadingManager.js";
import { Physics } from "./Physics/Physics.js";
import { Vector3D } from "./Core/Vector.js";
import { CubeRenderer } from "./View/Renderer/CubeRenderer.js";
import { AudioManager } from "./View/Audio/AudioManager.js";
import { ThirdPersonRenderer } from "./View/Renderer/PlayerRenderer/ThirdPersonRenderer.js";
import { PlayerController } from "./Controller/PlayerController.js";
import { Player } from "./Core/Player.js";
import { BloodSpriteManager } from "./View/Renderer/BloodSpriteManager.js";

export class Game {
  static game;
  renderer;
  globalLoadingManager;
  players;
  currentPlayer;
  inputManager;
  physics;
  lastUpdateTS;
  actors;
  audioManager;
  bloodSpriteManager;
  mapName = "de_dust_new";
  constructor() {
    this.players = new Array();
    this.globalLoadingManager = GlobalLoadingManager.getInstance();
    this.physics = Physics.createDefault();
    this.inputManager = new InputManager();
    this.update = this.update.bind(this);
    this.audioManager = new AudioManager();
    this.setupMapSelector();
  }
  onLoad() {
    this.renderer = new Renderer(this.players);
    this.bloodSpriteManager = new BloodSpriteManager(this.renderer.scene);
    const playerWrapper = PlayerWrapper.default();
    this.setCurrentPlayer(playerWrapper);
    this.renderer.camera.add(this.audioManager);
    this.addPlayer(playerWrapper);
    this.setPhysicsObjects();
  }
  setPhysicsObjects() {
    this.actors = new Array();
    for (let j = 1; j < 10; j++) {
      const cube = new CubeRenderer(new Vector3D(10 + j * 2.5, 5, 46), new Vector3D(0, 0, 0), new Vector3D(2, 2, 2), 25);
      this.actors.push(cube);
      cube.addToWorld(this.physics);
      this.addToRenderer(cube.mesh);
    }
    const mapMesh = this.globalLoadingManager.loadableMeshs.get("Map");
    mapMesh.init();
    mapMesh.addPhysics(this);
    this.addToRenderer(mapMesh.mesh);
  }
  static getInstance() {
    if (!Game.game) {
      Game.game = new Game();
    }
    return Game.game;
  }
  addToRenderer(gameObject) {
    this.renderer.scene.add(gameObject);
  }
  addToWorld(actor) {
    if (actor.body) {
      this.physics.add(actor.body);
    } else {
      throw new Error("This actor doesn't have a body!");
    }
  }
  setCurrentPlayer(player) {
    if (!this.renderer) {
      throw new Error("No renderer!");
    }
    if (this.currentPlayer) {
      this.currentPlayer.player.isCurrentPlayer = false;
    }
    this.currentPlayer = player;
    this.currentPlayer.player.isCurrentPlayer = true;
    this.renderer.setCurrentPlayer(this.currentPlayer);
    this.inputManager.setCurrentPlayer(this.currentPlayer);
  }
  update() {
    const now = performance.now();
    let dt = (now - this.lastUpdateTS) / 1e3;
    dt = Math.min(20 / 1e3, dt);
    this.currentPlayer.player.prestep(dt);
    this.inputManager.update(dt);
    for (let i = 0; i < this.actors.length; i++) {
      this.actors[i].update(dt);
    }
    this.currentPlayer.player.update(dt);
    this.physics.update(dt);
    this.renderer.update(dt);
    
    // Update other players/dummies that are not the current player
    this.players.forEach(playerWrapper => {
        if (playerWrapper !== this.currentPlayer) {
            playerWrapper.player.update(dt);
            // Also need to update renderer for dummies if they have one
            if (playerWrapper.renderer) {
                playerWrapper.renderer.update(dt);
            }
        }
    });

    if (this.bloodSpriteManager) {
        this.bloodSpriteManager.update(dt);
    }

    this.lastUpdateTS = now;
    requestAnimationFrame(this.update);
  }
  startUpdateLoop() {
    this.lastUpdateTS = performance.now();
    this.update();
  }
  addPlayer(playerWrapper) {
    this.players.push(playerWrapper);
    playerWrapper.player.addToWorld(this.physics);
  }
  setupMapSelector() {
    const mapSelector = document.getElementById('mapSelector');
    const dropdownSelected = mapSelector?.querySelector('.dropdown-selected');
    const dropdownText = mapSelector?.querySelector('.dropdown-text');
    const dropdownOptions = mapSelector?.querySelector('.dropdown-options');
    const dropdownArrow = mapSelector?.querySelector('.dropdown-arrow');

    if (mapSelector && dropdownSelected && dropdownOptions) {
      // Set initial value
      dropdownText.textContent = 'de_dust2';

      // Toggle dropdown on click
      dropdownSelected.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdownOptions.classList.contains('show');
        dropdownOptions.classList.toggle('show');
        dropdownArrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });

      // Handle option selection
      dropdownOptions.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-option')) {
          const value = e.target.getAttribute('data-value');
          const text = e.target.textContent;

          dropdownText.textContent = text;
          dropdownOptions.classList.remove('show');
          dropdownArrow.style.transform = 'rotate(0deg)';

          this.switchMap(value);
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        dropdownOptions.classList.remove('show');
        dropdownArrow.style.transform = 'rotate(0deg)';
      });
    }
  }
  async switchMap(newMapName) {
    if (newMapName === this.mapName) return;

    this.mapName = newMapName;

    // Remove old map from scene and physics
    const oldMapMesh = this.globalLoadingManager.loadableMeshs.get("Map");
    if (oldMapMesh && oldMapMesh.mesh) {
      this.renderer.scene.remove(oldMapMesh.mesh);
    }

    // Clear existing physics actors for map
    this.actors = this.actors.filter(actor => {
      if (actor.constructor.name.includes('Trimesh')) {
        this.physics.remove(actor.body);
        return false;
      }
      return true;
    });

    // Create and load new map
    const { MapMesh } = await import('./View/Mesh/MapMesh.js');
    const newMapMesh = new MapMesh(newMapName);
    await newMapMesh.load();

    // Replace the old map in the loadable meshes registry
    this.globalLoadingManager.loadableMeshs.set("Map", newMapMesh);

    // Initialize and add new map
    newMapMesh.init();
    newMapMesh.addPhysics(this);
    this.renderer.scene.add(newMapMesh.mesh);

    // Update lighting for the new map
    this.renderer.sceneLighting.sky.updateLightingForMap(newMapName);

    // Reset player positions to spawn point
    const spawnPosition = new Vector3D(0, 5, 8);
    this.players.forEach(playerWrapper => {
      playerWrapper.player.setPosition(spawnPosition);
      playerWrapper.player.setVelocity(new Vector3D(0, 0, 0));
    });
  }
  
  spawnDummy() {
      const currentPlayer = this.currentPlayer.player;
      
      // Spawn 10 units in front of player
      const spawnDir = currentPlayer.lookingDirection.clone().setY(0).normalize();
      const spawnPos = currentPlayer.position.clone().add(spawnDir.multiplyScalar(10));
      spawnPos.y += 2; 

      const player = new Player(spawnPos);
      const controller = new PlayerController(player);
      const renderer = new ThirdPersonRenderer(player);
      
      // Create wrapper without camera manager (dummy doesn't have camera)
      const wrapper = new PlayerWrapper(player, controller, renderer, null);
      
      // Ensure renderer is set up correctly
      renderer.game = this; // Game instance
      renderer.tpsMesh.init();
      
      this.addPlayer(wrapper);
      this.renderer.scene.add(renderer.tpsMesh.mesh); // Ensure mesh is added to scene
      
      console.log("Dummy spawned at", spawnPos);
  }
}

