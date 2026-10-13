import * as THREE from 'three'
import { createBulletGeometry } from '../utils/geometry'
import { createPlayerBulletMaterial, createEnemyBulletMaterial, createMissileMaterial } from '../utils/materials'
import { randomRange } from '../utils/math'

const MAX_PLAYER_BULLETS = 200
const MAX_ENEMY_BULLETS = 100
const MAX_MISSILES = 30
const MAX_MINES = 20

const MINE_LIFETIME = 15
const MINE_DAMAGE_RADIUS = 2.5

const BULLET_SPEED = 200
const ENEMY_BULLET_SPEED = 80
const MISSILE_SPEED = 60
const MISSILE_TURN_RATE = 3

const BULLET_LIFETIME = 3
const MISSILE_LIFETIME = 8

export class ProjectileSystem {
  constructor(scene) {
    this.scene = scene

    // Object pools
    this.playerBullets = []
    this.enemyBullets = []
    this.missiles = []
    this.mines = []

    this.activePlayerBullets = []
    this.activeEnemyBullets = []
    this.activeMissiles = []
    this.activeMines = []

    // Geometries (shared)
    this.bulletGeo = createBulletGeometry()
    this.playerBulletMat = createPlayerBulletMaterial()
    this.enemyBulletMat = createEnemyBulletMaterial()
    this.missileMat = createMissileMaterial()
    this.mineGeo = new THREE.OctahedronGeometry(0.5, 0)
    this.mineMat = new THREE.MeshStandardMaterial({
      color: 0x882222,
      emissive: 0xff2200,
      emissiveIntensity: 0.8,
      metalness: 0.6,
      roughness: 0.4,
      flatShading: true
    })

    // Pre-allocate pools
    this.initPools()

    // Collision callbacks
    this.onPlayerHit = null
    this.onEnemyHit = null   // fired when a player bullet hits an enemy (accuracy tracking)
    this.onPlayerShot = null // fired when the player shoots (accuracy tracking)
  }

  initPools() {
    // Player bullets
    for (let i = 0; i < MAX_PLAYER_BULLETS; i++) {
      const mesh = new THREE.Mesh(this.bulletGeo, this.playerBulletMat)
      mesh.visible = false
      mesh.userData = { lifetime: 0, velocity: new THREE.Vector3() }
      this.scene.add(mesh)
      this.playerBullets.push(mesh)
    }

    // Enemy bullets
    for (let i = 0; i < MAX_ENEMY_BULLETS; i++) {
      const mesh = new THREE.Mesh(this.bulletGeo, this.enemyBulletMat)
      mesh.visible = false
      mesh.userData = { lifetime: 0, velocity: new THREE.Vector3() }
      this.scene.add(mesh)
      this.enemyBullets.push(mesh)
    }

    // Missiles
    for (let i = 0; i < MAX_MISSILES; i++) {
      const mesh = new THREE.Mesh(this.bulletGeo, this.missileMat)
      mesh.scale.setScalar(1.5)
      mesh.visible = false
      mesh.userData = {
        lifetime: 0,
        velocity: new THREE.Vector3(),
        target: null,
        homingOnPlayer: true,
        turnRate: MISSILE_TURN_RATE
      }
      this.scene.add(mesh)
      this.missiles.push(mesh)
    }

    // Mines
    for (let i = 0; i < MAX_MINES; i++) {
      const mesh = new THREE.Mesh(this.mineGeo, this.mineMat)
      mesh.visible = false
      mesh.userData = { lifetime: 0, velocity: new THREE.Vector3(), spin: Math.random() * 2 + 1 }
      this.scene.add(mesh)
      this.mines.push(mesh)
    }
  }

  getPlayerBullet() {
    for (const bullet of this.playerBullets) {
      if (!bullet.visible) return bullet
    }
    // Pool exhausted - recycle oldest
    const bullet = this.activePlayerBullets.shift()
    return bullet
  }

  getEnemyBullet() {
    for (const bullet of this.enemyBullets) {
      if (!bullet.visible) return bullet
    }
    const bullet = this.activeEnemyBullets.shift()
    return bullet
  }

  getMissile() {
    for (const missile of this.missiles) {
      if (!missile.visible) return missile
    }
    const missile = this.activeMissiles.shift()
    return missile
  }

  getMine() {
    for (const mine of this.mines) {
      if (!mine.visible) return mine
    }
    return this.activeMines.shift()
  }

  spawnMine(position) {
    const mine = this.getMine()
    if (!mine) return

    mine.position.copy(position)
    mine.userData.lifetime = MINE_LIFETIME
    // Mines drift slowly downward after being dropped
    mine.userData.velocity.set(0, -3, 0)
    mine.visible = true

    this.activeMines.push(mine)
  }

  spawnPlayerBullet(position, direction) {
    const bullet = this.getPlayerBullet()
    if (!bullet) return

    if (this.onPlayerShot) this.onPlayerShot()

    bullet.position.copy(position)
    bullet.userData.velocity.copy(direction).multiplyScalar(BULLET_SPEED)
    bullet.userData.lifetime = BULLET_LIFETIME
    bullet.visible = true
    bullet.rotation.copy(direction.angleTo(new THREE.Vector3(0, 0, -1)) > 0.01
      ? new THREE.Euler().setFromVector3(new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, -1), direction).normalize())
      : new THREE.Euler(0, 0, 0))
    bullet.lookAt(new THREE.Vector3().copy(position).add(direction))

    this.activePlayerBullets.push(bullet)
  }

  spawnEnemyBullet(position, direction, speed = ENEMY_BULLET_SPEED) {
    const bullet = this.getEnemyBullet()
    if (!bullet) return

    bullet.position.copy(position)
    bullet.userData.velocity.copy(direction).multiplyScalar(speed)
    bullet.userData.lifetime = BULLET_LIFETIME
    bullet.visible = true
    bullet.lookAt(new THREE.Vector3().copy(position).add(direction))

    this.activeEnemyBullets.push(bullet)
  }

  spawnMissile(position, direction, target = null) {
    const missile = this.getMissile()
    if (!missile) return

    missile.position.copy(position)
    missile.userData.velocity.copy(direction).multiplyScalar(MISSILE_SPEED)
    missile.userData.lifetime = MISSILE_LIFETIME
    missile.userData.target = target
    missile.userData.homingOnPlayer = !target
    missile.visible = true
    missile.lookAt(new THREE.Vector3().copy(position).add(direction))

    this.activeMissiles.push(missile)
  }

  update(deltaTime, enemyManager, particleSystem, audioSystem, playerPosition) {
    this.updatePlayerBullets(deltaTime, enemyManager, particleSystem, audioSystem)
    this.updateEnemyBullets(deltaTime, particleSystem, audioSystem)
    this.updateMissiles(deltaTime, enemyManager, particleSystem, audioSystem, playerPosition)
    this.updateMines(deltaTime)
  }

  updateMines(deltaTime) {
    for (let i = this.activeMines.length - 1; i >= 0; i--) {
      const mine = this.activeMines[i]

      mine.position.add(mine.userData.velocity.clone().multiplyScalar(deltaTime))
      // Slow the drift over time
      mine.userData.velocity.multiplyScalar(0.98)
      // Menacing spin + pulse
      mine.rotation.y += mine.userData.spin * deltaTime
      mine.rotation.x += mine.userData.spin * 0.5 * deltaTime
      mine.userData.lifetime -= deltaTime

      if (mine.userData.lifetime <= 0) {
        this.despawnMine(i, mine)
      }
    }
  }

  despawnMine(index, mine) {
    mine.visible = false
    this.activeMines.splice(index, 1)
  }

  // Check if player flies into a mine
  checkMinePlayerCollision(playerPosition, playerRadius) {
    for (let i = this.activeMines.length - 1; i >= 0; i--) {
      const mine = this.activeMines[i]
      const dist = mine.position.distanceTo(playerPosition)
      if (dist < playerRadius + MINE_DAMAGE_RADIUS) {
        const position = mine.position.clone()
        this.despawnMine(i, mine)
        return position
      }
    }
    return null
  }

  updatePlayerBullets(deltaTime, enemyManager, particleSystem, audioSystem) {
    for (let i = this.activePlayerBullets.length - 1; i >= 0; i--) {
      const bullet = this.activePlayerBullets[i]

      bullet.position.add(bullet.userData.velocity.clone().multiplyScalar(deltaTime))
      bullet.userData.lifetime -= deltaTime

      // Check collision with enemies
      let hit = false
      if (enemyManager) {
        hit = enemyManager.checkBulletCollision(bullet)
      }

      if (hit && this.onEnemyHit) {
        this.onEnemyHit()
      }

      if (hit || bullet.userData.lifetime <= 0) {
        this.despawnPlayerBullet(i, bullet, particleSystem, hit)
      }
    }
  }

  updateEnemyBullets(deltaTime, particleSystem, audioSystem) {
    for (let i = this.activeEnemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.activeEnemyBullets[i]

      bullet.position.add(bullet.userData.velocity.clone().multiplyScalar(deltaTime))
      bullet.userData.lifetime -= deltaTime

      // Check collision with player (handled by player system usually)
      // But we check distance to player here for despawning

      if (bullet.userData.lifetime <= 0 || bullet.position.length() > 500) {
        this.despawnEnemyBullet(i, bullet, particleSystem)
      }
    }
  }

  steerMissile(missile, targetPos, deltaTime) {
    const toTarget = new THREE.Vector3().subVectors(targetPos, missile.position)
    if (toTarget.lengthSq() < 0.0001) return
    toTarget.normalize()
    const currentDir = missile.userData.velocity.clone().normalize()
    const angle = currentDir.angleTo(toTarget)
    if (angle > 0.01) {
      const axis = new THREE.Vector3().crossVectors(currentDir, toTarget)
      if (axis.lengthSq() < 0.0001) return
      axis.normalize()
      const turnAmount = Math.min(angle, missile.userData.turnRate * deltaTime)
      missile.userData.velocity.applyAxisAngle(axis, turnAmount)
      missile.userData.velocity.normalize().multiplyScalar(MISSILE_SPEED)
      missile.lookAt(new THREE.Vector3().copy(missile.position).add(missile.userData.velocity))
    }
  }

  updateMissiles(deltaTime, enemyManager, particleSystem, audioSystem, playerPosition) {
    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      const missile = this.activeMissiles[i]

      if (missile.userData.homingOnPlayer && playerPosition) {
        this.steerMissile(missile, playerPosition, deltaTime)
      } else if (missile.userData.target && enemyManager && enemyManager.isEnemyAlive(missile.userData.target)) {
        const targetPos = enemyManager.getEnemyPosition(missile.userData.target)
        if (targetPos) this.steerMissile(missile, targetPos, deltaTime)
      } else {
        missile.userData.target = null
      }

      missile.position.add(missile.userData.velocity.clone().multiplyScalar(deltaTime))
      missile.userData.lifetime -= deltaTime

      let hit = false
      if (missile.userData.target && !missile.userData.homingOnPlayer && enemyManager) {
        hit = enemyManager.checkMissileCollision(missile)
      }

      if (hit || missile.userData.lifetime <= 0) {
        this.despawnMissile(i, missile, particleSystem, hit)
      }
    }
  }

  despawnPlayerBullet(index, bullet, particleSystem, hit) {
    bullet.visible = false
    this.activePlayerBullets.splice(index, 1)

    if (hit && particleSystem) {
      particleSystem.spawnHitSparks(bullet.position.clone())
    }
  }

  despawnEnemyBullet(index, bullet, particleSystem) {
    bullet.visible = false
    this.activeEnemyBullets.splice(index, 1)
  }

  clearActive() {
    const hide = (list) => {
      for (const mesh of list) mesh.visible = false
      list.length = 0
    }
    hide(this.activePlayerBullets)
    hide(this.activeEnemyBullets)
    hide(this.activeMissiles)
    hide(this.activeMines)
  }

  despawnMissile(index, missile, particleSystem, hit) {
    missile.visible = false
    missile.userData.target = null
    missile.userData.homingOnPlayer = true
    this.activeMissiles.splice(index, 1)

    if (hit && particleSystem) {
      particleSystem.spawnExplosion(missile.position.clone(), 'missile')
    } else if (particleSystem) {
      particleSystem.spawnSmallExplosion(missile.position.clone())
    }
  }

  // Check if enemy bullet hits player
  checkPlayerCollision(playerPosition, playerRadius) {
    for (const bullet of this.activeEnemyBullets) {
      const dist = bullet.position.distanceTo(playerPosition)
      if (dist < playerRadius + 0.2) {
        bullet.visible = false
        this.activeEnemyBullets.splice(this.activeEnemyBullets.indexOf(bullet), 1)
        return true
      }
    }
    return false
  }

  checkMissilePlayerCollision(playerPosition, playerRadius) {
    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      const missile = this.activeMissiles[i]
      const dist = missile.position.distanceTo(playerPosition)
      if (dist < playerRadius + 0.5) {
        this.despawnMissile(i, missile, null, false)
        return true
      }
    }
    return false
  }

  dispose() {
    ;[...this.playerBullets, ...this.enemyBullets, ...this.missiles, ...this.mines].forEach(mesh => {
      this.scene.remove(mesh)
    })

    // Geometries and materials are shared, dispose once
    this.playerBulletMat.dispose()
    this.enemyBulletMat.dispose()
    this.missileMat.dispose()
    this.mineMat.dispose()
    this.bulletGeo.dispose()
    this.mineGeo.dispose()
  }

  getActivePlayerBullets() { return this.activePlayerBullets }
  getActiveEnemyBullets() { return this.activeEnemyBullets }
  getActiveMissiles() { return this.activeMissiles }
  getActiveMines() { return this.activeMines }
}