import { Pawn } from "./Pawn.js";
import { Vector2D, Vector3D } from "./Vector.js";
import { AmmoInstance } from "../Physics/Ammo.js";
import { Weapon } from "./Weapon.js";
import * as THREE from "three";
import { Game } from "../Game.js"; // Ensure Game is imported for Game.getInstance()

export class Player extends Pawn {
  velocity = new Vector3D(0, 0, 0);
  lookingDirection = Vector3D.ZERO();
  // lastShootTimeStamp replaced by weapon logic
  jumpRechargeTime = 100;
  jumpRechargeTimer = 0;
  deceleration = new Vector3D(0.95, 1, 0.95);
  airDeceleration = new Vector3D(0.98, 1, 0.98);
  moveDirection = Vector3D.ZERO();
  speed = 100;
  maxSpeed = 100;
  // rateOfFire moved to Weapon
  isCurrentPlayer = false;
  isOnGround = true;
  jumpVelocity = 200;
  // Height 4.5 (Total = 4.5 + 1 + 1 = 6.5) per user request
  capsuleDimension = new Vector2D(1, 4.5);
  world;
  // User feedback: 3.75 is "much too high". 1.8 is "too low".
  // 2.5 was "a bit too high".
  // User requested 2.0.
  eyeOffsetY = 0.8;

  weapons = new Map();
  currentWeapon;

  // Health System
  health = 100;
  isDead = false;
  spawnPosition;

  constructor(position) {
    super(position, Vector3D.ZERO());
    this.spawnPosition = position.clone();

    // Initialize Weapons
    this.weapons.set(1, new Weapon({
        name: "AK47",
        meshName: "AK47",
        totalAmmo: 90,
        clipSize: 30,
        fireMode: "auto",
        rateOfFire: 100
    }));
    this.weapons.set(2, new Weapon({
        name: "Usp",
        meshName: "Usp",
        totalAmmo: 45,
        clipSize: 15,
        fireMode: "single",
        rateOfFire: 100
    }));
    this.weapons.set(3, new Weapon({
        name: "Knife",
        meshName: "Knife",
        totalAmmo: 0,
        clipSize: 0,
        fireMode: "single", // Melee implies single swing usually
        rateOfFire: 200,
        isMelee: true
    }));

    this.currentWeapon = this.weapons.get(1); // Default to AK

    const shape = this.createShape(
      new Vector3D(this.capsuleDimension.x, this.capsuleDimension.y, this.capsuleDimension.x)
    );
    const body = this.createBody(shape, position);
    this.setBody(body);
  }
  createShape(size) {
    return new AmmoInstance.btCapsuleShape(size.x, size.y);
  }

  debugMesh;
  createDebugMesh() {
      if (this.debugMesh) return;
      // CapsuleGeometry takes (radius, length)
      // Ammo btCapsuleShape takes (radius, height of cylinder part)
      // Our capsuleDimension is (1, 2) -> Radius 1, Cylinder Height 2.
      // THREE.CapsuleGeometry takes (radius, length). Length includes caps? No, docs say "length of the cylindrical part".
      const geometry = new THREE.CapsuleGeometry(this.capsuleDimension.x, this.capsuleDimension.y, 4, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, depthTest: false, transparent: true, opacity: 0.5 });
      this.debugMesh = new THREE.Mesh(geometry, material);

      // Add to scene
      const game = window.game || Game.getInstance();
      if (game && game.renderer) {
          game.renderer.scene.add(this.debugMesh);
      }
  }
  createBody(shape, position) {
    const mass = 10;
    const DISABLE_DEACTIVATION = 4;
    const transform = new AmmoInstance.btTransform();
    transform.setOrigin(new AmmoInstance.btVector3(position.x, position.y, position.z));
    this.transform = transform;
    const myMotionState = new AmmoInstance.btDefaultMotionState(transform);
    const localInertia = new AmmoInstance.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);
    const rbInfo = new AmmoInstance.btRigidBodyConstructionInfo(mass, myMotionState, shape, localInertia);
    const vec3 = new AmmoInstance.btVector3(0, 0, 0);
    const body = new AmmoInstance.btRigidBody(rbInfo);
    body.setGravity(vec3);
    body.setActivationState(DISABLE_DEACTIVATION);
    body.setFriction(0);
    body.setRestitution(0);
    body.setDamping(0, 0);
    body.setSleepingThresholds(0, 0);
    body.setAngularFactor(vec3);
    body.setAngularFactor(vec3);
    AmmoInstance.destroy(vec3);
    return body;
  }
  getGroundRaycastProperties() {
    return {
      initialLocalPos: new Vector3D(0, -this.capsuleDimension.y / 2, 0),
      size: 1.5
    };
  }
  addToWorld(physics) {
    this.world = physics.world;
    physics.add(this.body);
  }
  prestep(dt) {
    this.moveDirection = Vector3D.ZERO();
  }
  raycastToGround() {
    let { initialLocalPos, size } = this.getGroundRaycastProperties();
    const from = this.position.clone().add(new Vector3D(initialLocalPos.x, initialLocalPos.y, initialLocalPos.z)).toAmmo();
    const to = this.position.clone().add(new Vector3D(initialLocalPos.x, initialLocalPos.y - size, initialLocalPos.z)).toAmmo();
    const rayCallBack = new AmmoInstance.ClosestRayResultCallback(from, to);
    this.world.rayTest(from, to, rayCallBack);
    if (!this.isOnGround && rayCallBack.hasHit()) this.velocityPreserveAcc = 0;
    this.isOnGround = rayCallBack.hasHit();
    AmmoInstance.destroy(from);
    AmmoInstance.destroy(to);
    AmmoInstance.destroy(rayCallBack);
  }
  updateJumpRechargeTime(dt) {
    if (this.jumpRechargeTimer < this.jumpRechargeTime) {
      this.jumpRechargeTimer += dt * 1e3;
    }
  }
  Accelerate(accelDir, prevVelocity, wishSpeed, airAccel, dt) {
    let wishSpd = wishSpeed;
    const currentSpeed = prevVelocity.dot(accelDir);
    const addSpeed = wishSpd - currentSpeed;
    if (addSpeed <= 0) {
      return prevVelocity;
    }
    let accelSpeed = wishSpeed * airAccel * dt;
    if (accelSpeed > addSpeed) {
      accelSpeed = addSpeed;
    }
    const vel = prevVelocity.clone();
    vel.x += accelSpeed * accelDir.x;
    vel.y += accelSpeed * accelDir.y;
    vel.z += accelSpeed * accelDir.z;
    return vel;
  }
  MoveGround(accelDir, prevVelocity, dt) {
    const friction = 1;
    const speed = Math.pow(prevVelocity.x, 2) + Math.pow(prevVelocity.z, 2);
    if (speed != 0) {
      const drop = speed * friction * dt;
      prevVelocity.multiplyScalar(this.deceleration.x * Math.max(speed - drop, 0) / speed);
    }
    return this.Accelerate(accelDir, prevVelocity, 10, 200, dt);
  }
  Decelerate(prevVelocity, dt, deceleration) {
    const friction = 1;
    const speed = Math.pow(prevVelocity.x, 2) + Math.pow(prevVelocity.z, 2);
    if (speed != 0) {
      const drop = speed * friction * dt;
      prevVelocity.multiplyScalar(this.deceleration.x * Math.max(speed - drop, 0) / speed);
    }
  }
  velocityPreserveAcc = 0;
  velocityPreserveDelay = 100;
  currentSpeedMagnitude = 0;
  update(dt) {
    super.update(dt, true, false);

    // Sync debug mesh if it exists
    if (this.debugMesh) {
        this.debugMesh.position.copy(this.position);
    }

    const linearVelocity = this.body.getLinearVelocity();
    let colWithAnything = false;
    this.raycastToGround();
    const resultCallback = new AmmoInstance.ConcreteContactResultCallback();
    resultCallback.addSingleResult = function(manifoldPoint, collisionObjectA, id0, index0, collisionObjectB, id1, index1) {
      colWithAnything = true;
      return 0;
    };
    this.world.contactTest(this.body, resultCallback);
    const y = linearVelocity.y();
    this.currentSpeedMagnitude = Math.pow(linearVelocity.x(), 2) + Math.pow(linearVelocity.z(), 2);
    if (colWithAnything && this.velocityPreserveAcc > this.velocityPreserveDelay) {
      this.velocity = this.MoveGround(this.moveDirection, this.velocity, dt);
    } else {
      this.velocity = this.Accelerate(this.moveDirection, this.velocity, 10 / 2, 200 / 2, dt);
      this.velocityPreserveAcc += dt * 1e3;
    }
    linearVelocity.setValue(this.velocity.x, y, this.velocity.z);
    this.velocity.y = y;
    this.updateJumpRechargeTime(dt);
    this.addHalfGravity(dt);
  }
  addHalfGravity(dt) {
    const velY = this.body.getLinearVelocity().y();
    this.body.getLinearVelocity().setY(velY - 9.81 * 0.5 * dt);
  }
  copyVelocity() {
    const vel = this.body.getLinearVelocity();
    this.velocity.setFromAmmo(vel);
  }
  move(movementVector) {
    this.moveDirection.add(Vector3D.fromThree(movementVector));
    this.moveDirection.normalize();
  }
  moveForward() {
    const lookingDir = this.lookingDirection.clone().setY(0);
    lookingDir.normalize();
    this.move(lookingDir);
  }
  moveBackward() {
    const lookingDir = this.lookingDirection.clone().setY(0);
    lookingDir.multiplyScalar(-1);
    this.move(lookingDir);
  }
  moveLeft() {
    const vectorUp = new Vector3D(0, 1, 0);
    const lookingDir = this.lookingDirection.clone().setY(0);
    let movementVector = new Vector3D().crossVectors(vectorUp, lookingDir);
    this.move(movementVector);
  }
  moveRight() {
    const vectorUp = new Vector3D(0, 1, 0);
    const lookingDir = this.lookingDirection.clone().setY(0);
    let movementVector = new Vector3D().crossVectors(vectorUp, lookingDir);
    movementVector.multiplyScalar(-1);
    this.move(movementVector);
  }
  canShoot() {
    return this.currentWeapon && this.currentWeapon.canShoot(Date.now());
  }

  equipWeapon(slot) {
      const weapon = this.weapons.get(slot);
      if (weapon) {
          // If we are actually changing weapons (or even if re-equipping same slot, usually implies switch)
          const changed = this.currentWeapon !== weapon;
          this.currentWeapon = weapon;
          
          if (changed && this.isCurrentPlayer) {
              const game = window.game || Game.getInstance();
              if (game && game.audioManager) {
                  if (weapon.name === "AK47") game.audioManager.playAK47Deploy();
                  else if (weapon.name === "Usp") game.audioManager.playUSPDeploy();
                  else if (weapon.name === "Knife") game.audioManager.playKnifeDeploy();
              }
          }
          
          return weapon;
      }
      return null;
  }

  reload() {
      if (this.currentWeapon) {
          const reloaded = this.currentWeapon.reload();
          if (reloaded && this.isCurrentPlayer) {
              const game = window.game || Game.getInstance();
              if (this.currentWeapon.name === "AK47") game.audioManager.playAK47Reload();
              else if (this.currentWeapon.name === "Usp") game.audioManager.playUSPReload();
          }
          return reloaded;
      }
      return false;
  }

  createHitscanPoints(distance = 10000, offset = 2.0) {
    const from = this.position.clone().add(new Vector3D(0, this.eyeOffsetY, 0));

    // DEBUG: Log start position and looking direction
    // console.log("Raycast Start (Inside):", from);
    // console.log("Looking Dir:", this.lookingDirection);

    // Move start point forward to exit own capsule (radius is 1.0, so 1.5 safe)
    const forwardOffset = this.lookingDirection.clone().normalize().multiplyScalar(offset);
    from.add(forwardOffset);

    // console.log("Raycast Start (Offset):", from);

    const to = new Vector3D().addVectors(from, this.lookingDirection.clone().multiplyScalar(distance));
    return {
      from,
      to
    };
  }
  takeDamage(amount) {
    if (this.isDead) return;

    this.health -= amount;
    console.log(`Player hit! Damage: ${amount}, Health: ${this.health}`);

    if (this.health <= 0) {
        this.die();
    }
  }

  die() {
    this.isDead = true;
    console.log("Player died!");

    // Disable physics body interaction while dead
    // this.body.setCollisionFlags(4); // CF_NO_CONTACT_RESPONSE if needed, or just move away

    setTimeout(() => {
        this.respawn();
    }, 5000);
  }

  respawn() {
    console.log("Respawning...");
    this.health = 100;
    this.isDead = false;
    this.setPosition(this.spawnPosition);
    this.setVelocity(Vector3D.ZERO());
    // Restore physics flags if changed

    if (this.isCurrentPlayer) {
        const game = window.game || Game.getInstance();
        game.audioManager.playRespawn();
    }
  }

  shoot() {
    if (this.isDead) return { hasHit: false };

    // Dry Fire Check
    if (!this.currentWeapon.isMelee && this.currentWeapon.clipAmmo <= 0 && this.isCurrentPlayer) {
         if (Date.now() - this.currentWeapon.lastShootTime >= this.currentWeapon.rateOfFire) {
             this.currentWeapon.lastShootTime = Date.now();
             const game = window.game || Game.getInstance();
             game.audioManager.playDryFire(this.currentWeapon.name);
         }
         return { hasHit: false };
    }

    if (!this.currentWeapon.shoot(Date.now())) {
        return { hasHit: false };
    }

    // Play Shoot Sound (Non-Melee)
    const game = window.game || Game.getInstance();
    if (this.isCurrentPlayer && !this.currentWeapon.isMelee) {
         game.audioManager.playShoot(this.currentWeapon.name);
    }

    let range = 10000;
    let offset = 2.0;

    // Adjust range and offset for melee
    if (this.currentWeapon.isMelee) {
        range = 2; // 4 meters range for knife
        offset = 1.5; // Start closer for melee
    }

    const { from, to } = this.createHitscanPoints(range, offset);
    const fromAmmo = from.toAmmo();
    const toAmmo = to.toAmmo();
    const hitScanResult = {
      hasHit: false,
      hitPosition: void 0,
      weapon: this.currentWeapon // Pass weapon info to renderer
    };
    const rayCallBack = new AmmoInstance.ClosestRayResultCallback(fromAmmo, toAmmo);
    this.world.rayTest(fromAmmo, toAmmo, rayCallBack);
    if (hitScanResult.hasHit = rayCallBack.hasHit()) {
      const object = rayCallBack.get_m_collisionObject();
      const hitPointAmmo = rayCallBack.get_m_hitPointWorld();
      const hitPoint = Vector3D.fromAmmo(hitPointAmmo);
      hitScanResult.hitPosition = hitPoint;
      const collisionBody = AmmoInstance.btRigidBody.prototype.upcast(object);

      // Helper to safely get pointer
      const getPtr = (obj) => {
          if (!obj) return null;
          if (AmmoInstance.getPointer) return AmmoInstance.getPointer(obj);
          return obj.ptr;
      };

      const hitPtr = getPtr(collisionBody);
      // console.log("Raycast HIT ptr:", hitPtr);

      // Damage Logic
      if (game && game.players && hitPtr) {
          const victimWrapper = game.players.find(p => {
              const pPtr = getPtr(p.player.body);
              return pPtr === hitPtr;
          });

          if (victimWrapper) {
              const victim = victimWrapper.player;
              // console.log(`Raycast HIT Player! HitID: ${hitPtr}`);

              // Ignore self-damage
              if (victim === this) {
                  // console.log("Hit self - ignored");
                  // If melee hits self (shouldn't happen with offset), don't play sound?
                  return hitScanResult;
              }

              // Melee Hit Player Sound
              if (this.isCurrentPlayer && this.currentWeapon.isMelee) {
                  game.audioManager.playKnifeHitPlayer();
              }

              // Check for headshot
              // Physics Capsule: Radius=1, Height=4.5. Origin=Center.
              // Total Height Extent: from Y-3.25 to Y+3.25 (Height/2 + Radius = 2.25 + 1 = 3.25).
              // Head is roughly the top 1.0 unit.
              const relativeHitY = hitPoint.y - victim.position.y;
              const headThreshold = 2.0; // Reverted to 2.0

              // DEBUG: Always log relative Y to diagnose why headshots miss
              console.log(`Hit Details - Relative Y: ${relativeHitY.toFixed(2)}, Threshold: ${headThreshold}`);

              if (relativeHitY > headThreshold) {
                  victim.takeDamage(100); // Headshot
                  console.log("HEADSHOT!");
              } else {
                  victim.takeDamage(15); // Bodyshot
              }

              // Blood Splatter Logic
              if (game.bloodSpriteManager) {
                  const bulletDir = hitPoint.clone().sub(from).normalize();

                  // 1. Check Wall behind victim (within 1m + radius)
                  // Start slightly outside victim capsule to avoid self-hit
                  // Radius 1.0, so start at 1.1 distance
                  const rayStart = victim.position.clone().add(bulletDir.clone().multiplyScalar(1.2));
                  const rayEnd = victim.position.clone().add(bulletDir.clone().multiplyScalar(2.5)); // 1.2 start + 1.3 length

                  const rayStartAmmo = rayStart.toAmmo();
                  const rayEndAmmo = rayEnd.toAmmo();
                  const wallRayCallback = new AmmoInstance.ClosestRayResultCallback(rayStartAmmo, rayEndAmmo);
                  this.world.rayTest(rayStartAmmo, rayEndAmmo, wallRayCallback);

                  let splatterSpawned = false;

                  if (wallRayCallback.hasHit()) {
                      const wallHitObj = wallRayCallback.get_m_collisionObject();
                      const wallHitPtr = getPtr(wallHitObj);
                      const victimPtr = getPtr(victim.body);

                      // Ensure we didn't hit the victim (unlikely given start point, but safe to check)
                      if (wallHitPtr !== victimPtr) {
                          const wallHitPos = Vector3D.fromAmmo(wallRayCallback.get_m_hitPointWorld());
                          const wallHitNormal = Vector3D.fromAmmo(wallRayCallback.get_m_hitNormalWorld());

                          game.bloodSpriteManager.spawnSplatter(wallHitPos, wallHitNormal);
                          splatterSpawned = true;
                      }
                  }

                  AmmoInstance.destroy(rayStartAmmo);
                  AmmoInstance.destroy(rayEndAmmo);
                  AmmoInstance.destroy(wallRayCallback);

                  // 2. Floor Fallback
                  if (!splatterSpawned) {
                      const down = new Vector3D(0, -1, 0);
                      const floorStart = victim.position.clone();
                      const floorEnd = victim.position.clone().add(down.multiplyScalar(3.5)); // Half height 2.25 + buffer

                      const floorStartAmmo = floorStart.toAmmo();
                      const floorEndAmmo = floorEnd.toAmmo();
                      const floorRayCallback = new AmmoInstance.ClosestRayResultCallback(floorStartAmmo, floorEndAmmo);
                      this.world.rayTest(floorStartAmmo, floorEndAmmo, floorRayCallback);

                      if (floorRayCallback.hasHit()) {
                          const floorHitObj = floorRayCallback.get_m_collisionObject();
                          const floorHitPtr = getPtr(floorHitObj);
                          const victimPtr = getPtr(victim.body);

                          if (floorHitPtr !== victimPtr) {
                              const floorHitPos = Vector3D.fromAmmo(floorRayCallback.get_m_hitPointWorld());
                              const floorHitNormal = Vector3D.fromAmmo(floorRayCallback.get_m_hitNormalWorld());

                              game.bloodSpriteManager.spawnSplatter(floorHitPos, floorHitNormal);
                          }
                      }

                      AmmoInstance.destroy(floorStartAmmo);
                      AmmoInstance.destroy(floorEndAmmo);
                      AmmoInstance.destroy(floorRayCallback);
                  }
              }
              // Prevent bullet hole creation for this hit since it hit a player
              return hitScanResult;
          }
      }

      // Melee Hit Wall/Object Sound
      if (this.isCurrentPlayer && this.currentWeapon.isMelee) {
          game.audioManager.playKnifeHitWall();
      }

      const delta = hitPoint.clone().sub(from).multiplyScalar(25);
      const force = delta.toAmmo();
      collisionBody.applyCentralImpulse(force);
      AmmoInstance.destroy(force);
    } else {
        // Melee Miss Sound
        if (this.isCurrentPlayer && this.currentWeapon.isMelee) {
            game.audioManager.playKnifeSlash();
        }
    }
    AmmoInstance.destroy(fromAmmo);
    AmmoInstance.destroy(toAmmo);
    AmmoInstance.destroy(rayCallBack);
    // lastShootTimeStamp updated in Weapon class
    return hitScanResult;
  }
  canResetRecoil() {
    if (this.isDead) return false;
    return Date.now() - this.currentWeapon.lastShootTime > this.currentWeapon.rateOfFire * 2;
  }
  canJump() {
    if (this.isDead) return false;
    return this.isOnGround && this.jumpRechargeTimer >= this.jumpRechargeTime;
  }
  jump() {
    if (this.isDead) return;
    console.log("jump");
    const vec3 = new AmmoInstance.btVector3(0, this.jumpVelocity, 0);
    const linearVel = this.body.getLinearVelocity();
    linearVel.setY(0);
    this.body.applyCentralImpulse(vec3);
    this.isOnGround = false;
    this.jumpRechargeTimer = 0;
    AmmoInstance.destroy(vec3);
    AmmoInstance.destroy(linearVel);
    const jumpYOffset = 0.11;
    const previousY = this.getY();
    this.setY(previousY + jumpYOffset);
  }
  // TODO: put this in the abstract super class
  setPosition(pos) {
    const posAmmo = pos.toAmmo();
    this.body.getWorldTransform().setOrigin(posAmmo);
    AmmoInstance.destroy(posAmmo);
  }
  setX(x) {
    this.body.getWorldTransform().getOrigin().setX(x);
  }
  setY(y) {
    this.body.getWorldTransform().getOrigin().setY(y);
  }
  setZ(z) {
    this.body.getWorldTransform().getOrigin().setZ(z);
  }
  getX() {
    return this.body.getWorldTransform().getOrigin().x();
  }
  getY() {
    return this.body.getWorldTransform().getOrigin().y();
  }
  getZ() {
    return this.body.getWorldTransform().getOrigin().z();
  }
  multiplyVelocity(otherVel) {
    const oldVel = this.body.getLinearVelocity();
    oldVel.setValue(oldVel.x() * otherVel.x, oldVel.y() * otherVel.y, oldVel.z() * otherVel.z);
  }
  setVelocity(vel) {
    this.body.getLinearVelocity().setValue(vel.x, vel.y, vel.z);
    this.velocity = vel;
  }
}