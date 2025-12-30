export class Weapon {
  name;
  meshName;
  totalAmmo;
  clipAmmo;
  clipSize;
  fireMode; // 'auto' or 'single'
  rateOfFire;
  isMelee;
  lastShootTime = 0;

  constructor(config) {
    this.name = config.name;
    this.meshName = config.meshName;
    this.totalAmmo = config.totalAmmo;
    this.clipSize = config.clipSize;
    this.clipAmmo = config.clipSize; // Start with full clip
    this.fireMode = config.fireMode;
    this.rateOfFire = config.rateOfFire;
    this.isMelee = config.isMelee || false;
  }

  canShoot(currentTime) {
    if (this.isMelee) return currentTime - this.lastShootTime >= this.rateOfFire;
    
    return this.clipAmmo > 0 && currentTime - this.lastShootTime >= this.rateOfFire;
  }

  shoot(currentTime) {
    if (this.canShoot(currentTime)) {
      this.lastShootTime = currentTime;
      if (!this.isMelee) {
        this.clipAmmo--;
      }
      return true;
    }
    return false;
  }

  reload() {
    if (this.isMelee) return;
    
    const needed = this.clipSize - this.clipAmmo;
    if (needed > 0 && this.totalAmmo > 0) {
      const amount = Math.min(needed, this.totalAmmo);
      this.clipAmmo += amount;
      this.totalAmmo -= amount;
      return true;
    }
    return false;
  }
}
