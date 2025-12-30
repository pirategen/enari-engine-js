import * as THREE from "three";

export class BloodSpriteManager {
  scene;
  decals = [];
  maxDecals = 50; // Limit to prevent performance drop
  textureLoader;
  bloodMaterial;
  texture;

  constructor(scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    
    // Load the sprite sheet
    this.texture = this.textureLoader.load('./assets/sprite_blood.png');
    this.texture.colorSpace = THREE.SRGBColorSpace;
    // this.texture.wrapS = THREE.RepeatWrapping; // Might be needed for offsetting
    // this.texture.wrapT = THREE.RepeatWrapping;

    // Base material - we will clone this or update uniforms if we were using a shader
    // For simple built-in materials, we might need to clone the texture to have different offsets
    // OR use a geometry with modified UVs. 
    // Modifying UVs on the geometry is more efficient than cloning textures/materials.
    
    this.bloodMaterial = new THREE.MeshPhongMaterial({
      map: this.texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      side: THREE.DoubleSide
    });
  }

  spawnSplatter(position, normal) {
    // 1. Create a plane geometry
    const size = 1.0 + Math.random() * 1.0; // Random size between 1.0 and 2.0 (100% larger)
    const geometry = new THREE.PlaneGeometry(size, size);

    // 2. Adjust UVs to pick a random sprite
    // 19 sprites in the row
    const totalSprites = 19;
    const spriteIndex = Math.floor(Math.random() * totalSprites);
    const uStep = 1 / totalSprites;
    const uStart = spriteIndex * uStep;
    const uEnd = uStart + uStep;

    // UVs for a plane are usually:
    // (0,1) (1,1)
    // (0,0) (1,0)
    
    // We need to map x from 0..1 to uStart..uEnd
    const uvAttribute = geometry.attributes.uv;
    
    for (let i = 0; i < uvAttribute.count; i++) {
        const u = uvAttribute.getX(i);
        // Map 0 -> uStart, 1 -> uEnd
        const newU = uStart + u * (uEnd - uStart);
        uvAttribute.setX(i, newU);
    }
    uvAttribute.needsUpdate = true;

    // 3. Create Mesh
    // Clone material to allow independent fading
    const material = this.bloodMaterial.clone();
    const mesh = new THREE.Mesh(geometry, material);
    
    // Add custom properties for lifecycle management
    mesh.userData = {
        lifeTime: 0,
        maxLifeTime: 5, // 5 seconds before starting to fade
        fadeDuration: 2 // 2 seconds to fade out
    };
    
    // 4. Position and Orient
    mesh.position.copy(position);
    
    // Orient to normal
    // Method: Look at position + normal
    const target = position.clone().add(normal);
    mesh.lookAt(target);
    
    // Random rotation around the normal z-axis
    mesh.rotateZ(Math.random() * Math.PI * 2);

    // Add to scene
    this.scene.add(mesh);
    this.decals.push(mesh);

    // 5. Cleanup old decals (FIFO limit still applies)
    if (this.decals.length > this.maxDecals) {
      const old = this.decals.shift();
      if (old) {
        this.removeDecal(old);
      }
    }
  }

  update(dt) {
      for (let i = this.decals.length - 1; i >= 0; i--) {
          const decal = this.decals[i];
          decal.userData.lifeTime += dt;
          
          if (decal.userData.lifeTime > decal.userData.maxLifeTime) {
              // Calculate fade
              const fadeTime = decal.userData.lifeTime - decal.userData.maxLifeTime;
              const opacity = 1.0 - (fadeTime / decal.userData.fadeDuration);
              
              if (opacity <= 0) {
                  // Remove completely
                  this.removeDecal(decal);
                  this.decals.splice(i, 1);
              } else {
                  decal.material.opacity = opacity;
              }
          }
      }
  }

  removeDecal(decal) {
      this.scene.remove(decal);
      decal.geometry.dispose();
      decal.material.dispose();
  }
}
