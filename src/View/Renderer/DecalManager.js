import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";

export class DecalManager {
  scene;
  decals = [];
  maxDecals = 50;
  textureLoader;
  decalMaterial;

  constructor(scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    
    const decalDiffuse = this.textureLoader.load('./assets/bullet_hole.png');
    decalDiffuse.colorSpace = THREE.SRGBColorSpace;

    this.decalMaterial = new THREE.MeshPhongMaterial({
      map: decalDiffuse,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      wireframe: false
    });
  }

  createDecal(position, orientation, mesh) {
    // orientation is the normal vector of the surface
    
    // Create a dummy object to help with rotation calculation
    const dummy = new THREE.Object3D();
    dummy.position.copy(position);
    dummy.lookAt(position.clone().add(orientation));
    dummy.rotation.z = Math.random() * 2 * Math.PI; // Random rotation for variety

    const size = new THREE.Vector3(0.5, 0.5, 0.5); // Size of the bullet hole
    
    // Create decal geometry
    const geometry = new DecalGeometry(mesh, position, dummy.rotation, size);

    // Create decal mesh
    const m = new THREE.Mesh(geometry, this.decalMaterial);
    
    this.decals.push(m);
    this.scene.add(m);

    // Remove old decals if exceeding limit
    if (this.decals.length > this.maxDecals) {
      const old = this.decals.shift();
      if (old) {
        this.scene.remove(old);
        old.geometry.dispose();
      }
    }
  }
}
