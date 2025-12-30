import { LoadableMesh } from "../../View/Mesh/LoadableMesh.js";
import * as THREE from "three";
export class ThirdPersonMesh extends LoadableMesh {
  baseActions = {
    idle: { weight: 1 },
    walk: { weight: 0 },
    run: { weight: 0 }
  };
  additiveActions = {
    sneak_pose: { weight: 0 },
    sad_pose: { weight: 0 },
    agree: { weight: 0 },
    headShake: { weight: 0 }
  };
  mixer;
  constructor() {
    super("./assets/swat_anim.glb", "ThirdPersonMesh");
  }
  initAnimation() {
    this.mixer = new THREE.AnimationMixer(this.mesh);
    const animations = this.mesh.animations;
    if (animations) {
        console.log("Loaded SWAT animations:", animations.map(a => a.name));
    }
  }
  init() {
    super.init();
    this.initMesh();
    this.initAnimation();
  }
  initMesh() {
    // Start with a standard scale estimate (often 1.0 or 0.01 depending on export)
    // RobotExpressive was 0.6. GIGN was huge (required 0.015).
    // Let's try 1.0 first, as many GLBs are exported in meters.
    this.mesh.scale.set(2.25, 2.25, 2.25); 
    
    // Tag the root mesh
    this.mesh.userData.isPlayer = true;
    
    this.mesh.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
      // Tag all children to ensure raycast detection works on any part
      child.userData.isPlayer = true;
    });
  }
  async load() {
    await super.load();
  }
  lastAnimName;
  playAnimation(anim, repeat = false) {
    const clip = THREE.AnimationClip.findByName(this.mesh.animations, anim);
    if (!clip) {
        console.warn(`Animation ${anim} not found`);
        return;
    }
    
    // Prevent restarting the same animation if it's already playing
    if (this.lastAnimName === anim && this.mixer.existingAction(clip)?.isRunning()) return;

    // Fade out previous action if it exists
    if (this.lastAnimName && this.lastAnimName !== anim) {
        const prevClip = THREE.AnimationClip.findByName(this.mesh.animations, this.lastAnimName);
        if (prevClip) {
            const prevAction = this.mixer.clipAction(prevClip);
            prevAction.fadeOut(0.2);
        }
    }

    const action = this.mixer.clipAction(clip);
    if (action) {
        action.reset();
        action.fadeIn(0.2); // Smooth transition in
        
        if (!repeat) {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
        } else {
            action.setLoop(THREE.LoopRepeat, Infinity);
        }
        
        this.lastAnimName = anim;
        action.play();
    }
  }
  update(dt) {
    this.mixer.update(dt);
  }
  clone() {
    const loadableMesh = new ThirdPersonMesh();
    loadableMesh.setMesh(this.cloneMesh());
    return loadableMesh;
  }
}

