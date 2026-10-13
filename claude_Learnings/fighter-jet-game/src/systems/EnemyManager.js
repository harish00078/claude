import * as THREE from 'three'
import { createEnemyGeometry } from '../utils/geometry'
import { getEnemyMaterials } from '../utils/materials'
import { randomRange, randomInt, randomVec3, clamp, lerp, wrapAngle } from '../utils/math'

const MAX_ENEMIES = 60

const ENEMY_TYPES = {
  drone: {
    speed: { min: 30, max: 50 },
    health: 1,
    score: 10,
    turnRate: 1.5,
    fireRate: 0, // Drones don't shoot
    spawnWeight: 50
  },
  interceptor: {
    speed: { min: 40, max: 70 },
    health: 2,
    score: 25,
    turnRate: 2.5,
    fireRate: 1.5,
    bulletSpeed: 100,
    spawnWeight: 30
  },
  bomber: {
    speed: { min: 15, max: 30 },
    health: 5,
    score: 50,
    turnRate: 0.8,
    fireRate: 2,
    bulletSpeed: 70,
    dropMines: true,
    mineRate: 4, // seconds between mine drops
    spawnWeight: 15
  },
  ace: {
    speed: { min: 50, max: 90 },
    health: 3,
    score: 100,
    turnRate: 3.5,
    fireRate: 1,
    bulletSpeed: 120,
    canFireMissiles: true,
    missileRate: 5,
    dodgeRate: 0.3,
    spawnWeight: 5
  }
}

export class EnemyManager {
  constructor(scene, projectileSystem, particleSystem, audioSystem) {
    this.scene = scene
    this.projectileSystem = projectileSystem
    this.particleSystem = particleSystem
    this.audioSystem = audioSystem

    this.enemies = []
    this.activeEnemies = []
    this.enemyPool = []

    // Wave system
    this.wave = 1
    this.enemiesInWave = 0
    this.enemiesKilledInWave = 0
    this.waveTimer = 0
    this.waveDelay = 3 // seconds between waves
    this.campaignActive = false

    // Spawning
    this.spawnTimer = 0
    this.spawnInterval = 1.5
    this.maxActiveEnemies = 8

    // Difficulty scaling
    this.difficulty = 1
    this.maxDifficulty = 10

    // Player reference (set externally)
    this.playerPosition = new THREE.Vector3()
    this.playerVelocity = new THREE.Vector3()
    this.playerForward = new THREE.Vector3(0, 0, -1)

    // Callbacks
    this.onEnemyKilled = null
    this.onWaveComplete = null

    this.initPool()
  }

  initPool() {
    for (let i = 0; i < MAX_ENEMIES; i++) {
      const enemy = this.createEnemyObject()
      enemy.mesh.visible = false
      this.scene.add(enemy.mesh)
      this.enemyPool.push(enemy)
    }
  }

  createEnemyObject() {
    const mesh = new THREE.Group()
    mesh.userData = {
      type: 'drone',
      health: 1,
      maxHealth: 1,
      speed: 40,
      turnRate: 1.5,
      fireCooldown: 0,
      missileCooldown: 0,
      mineCooldown: 0,
      dodgeCooldown: 0,
      hitFlashTime: 0,
      state: 'approach', // approach, attack, flee, circle
      targetPosition: new THREE.Vector3(),
      spawnTime: 0
    }
    return { mesh, active: false }
  }

  getEnemyFromPool(type = 'drone') {
    for (const enemy of this.enemyPool) {
      if (!enemy.active) {
        this.setupEnemy(enemy, type)
        return enemy
      }
    }
    // Pool exhausted - shouldn't happen with proper maxActiveEnemies
    return null
  }

  setupEnemy(enemyObj, type) {
    const config = ENEMY_TYPES[type]
    const mesh = enemyObj.mesh

    // Clear previous geometry
    while (mesh.children.length > 0) {
      mesh.remove(mesh.children[0])
    }

    // Add new geometry
    const geo = createEnemyGeometry(type)
    mesh.add(geo)

    // Apply materials
    const materials = getEnemyMaterials(type)
    geo.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry.type.includes('Cone') || child.geometry.type.includes('Box')) {
          child.material = materials.body
        } else {
          child.material = materials.wing || materials.body
        }
      }
    })

    // Initialize properties
    enemyObj.active = true
    enemyObj.type = type
    mesh.visible = true
    mesh.userData.type = type
    mesh.userData.health = config.health
    mesh.userData.maxHealth = config.health
    mesh.userData.collisionRadius = geo.userData.collisionRadius
    mesh.userData.speed = randomRange(config.speed.min, config.speed.max)
    mesh.userData.turnRate = config.turnRate
    mesh.userData.fireCooldown = randomRange(0, config.fireRate || 1)
    mesh.userData.missileCooldown = randomRange(0, config.missileRate || 5)
    mesh.userData.dodgeCooldown = 0
    mesh.userData.state = 'approach'
    mesh.userData.scoreValue = config.score
    mesh.userData.canFire = config.fireRate > 0
    mesh.userData.canFireMissiles = config.canFireMissiles || false
    mesh.userData.bulletSpeed = config.bulletSpeed || 80
    mesh.userData.dropMines = config.dropMines || false
    mesh.userData.mineCooldown = randomRange(1, config.mineRate || 4)
    mesh.userData.hitFlashTime = 0
    mesh.userData.spawnTime = 0

    // Spawn ahead of the player's current heading
    const spawnDistance = 150 + randomRange(0, 50)
    const spawnAngle = randomRange(-Math.PI / 3, Math.PI / 3)
    const spawnHeight = randomRange(-20, 30)

    const forward = this.playerForward.clone().normalize()
    const worldUp = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(forward, worldUp)
    if (right.lengthSq() < 0.001) {
      right.set(1, 0, 0)
    } else {
      right.normalize()
    }

    mesh.position.copy(this.playerPosition)
      .add(forward.multiplyScalar(spawnDistance))
      .add(right.multiplyScalar(Math.sin(spawnAngle) * 80))
    mesh.position.y += spawnHeight

    // Face roughly toward player
    const toPlayer = new THREE.Vector3().subVectors(this.playerPosition, mesh.position).normalize()
    mesh.lookAt(mesh.position.clone().add(toPlayer))

    // Set initial target
    mesh.userData.targetPosition.copy(this.playerPosition).add(new THREE.Vector3(
      randomRange(-30, 30),
      randomRange(-10, 20),
      randomRange(-50, 50)
    ))

    return enemyObj
  }

  update(deltaTime) {
    this.updateWaves(deltaTime)
    this.updateSpawning(deltaTime)
    this.updateEnemies(deltaTime)
  }

  updateWaves(deltaTime) {
    if (!this.campaignActive) return
    // Wave is done only after every enemy has spawned AND none remain alive
    if (this.activeEnemies.length === 0 && this.enemiesInWave === 0) {
      this.waveTimer += deltaTime
      if (this.waveTimer >= this.waveDelay) {
        this.startNextWave()
      }
    }
  }

  startNextWave() {
    this.wave++
    this.waveTimer = 0
    this.enemiesKilledInWave = 0
    this.spawnTimer = 0

    this.difficulty = Math.min(this.maxDifficulty, 1 + this.wave * 0.15)
    this.maxActiveEnemies = Math.min(20, 6 + Math.floor(this.wave * 0.8))
    this.spawnInterval = Math.max(0.4, 1.5 - this.wave * 0.05)
    this.enemiesInWave = this.calculateWaveSize(this.wave)

    if (this.onWaveComplete) {
      this.onWaveComplete(this.wave)
    }
  }

  updateSpawning(deltaTime) {
    if (this.enemiesInWave <= 0) return
    if (this.activeEnemies.length >= this.maxActiveEnemies) return

    this.spawnTimer += deltaTime
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0
      this.spawnEnemy()
    }
  }

  spawnEnemy() {
    if (this.enemiesInWave <= 0) return

    // Select enemy type based on wave and weights
    const type = this.selectEnemyType()
    const enemy = this.getEnemyFromPool(type)

    if (enemy) {
      this.activeEnemies.push(enemy)
      this.enemiesInWave--
    }
  }

  selectEnemyType() {
    // Weighted random selection based on wave
    const types = Object.keys(ENEMY_TYPES)
    const weights = types.map(t => {
      let w = ENEMY_TYPES[t].spawnWeight
      // Increase interceptor/bomber/ace chances in later waves
      if (t === 'interceptor') w *= 1 + this.wave * 0.1
      if (t === 'bomber') w *= 1 + this.wave * 0.08
      if (t === 'ace') w *= 1 + this.wave * 0.15
      return w
    })

    const total = weights.reduce((a, b) => a + b, 0)
    let r = Math.random() * total

    for (let i = 0; i < types.length; i++) {
      r -= weights[i]
      if (r <= 0) return types[i]
    }
    return 'drone'
  }

  updateEnemies(deltaTime) {
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemyObj = this.activeEnemies[i]
      const mesh = enemyObj.mesh
      const data = mesh.userData

      data.spawnTime += deltaTime

      // State machine
      this.updateEnemyAI(enemyObj, deltaTime)

      // Movement
      this.moveEnemy(enemyObj, deltaTime)

      // Shooting
      if (data.canFire) {
        data.fireCooldown -= deltaTime
        if (data.fireCooldown <= 0) {
          this.enemyFire(enemyObj)
          data.fireCooldown = ENEMY_TYPES[data.type].fireRate + randomRange(-0.3, 0.3)
        }
      }

      // Missiles (aces)
      if (data.canFireMissiles) {
        data.missileCooldown -= deltaTime
        if (data.missileCooldown <= 0 && Math.random() < 0.4) {
          this.enemyFireMissile(enemyObj)
          data.missileCooldown = ENEMY_TYPES[data.type].missileRate + randomRange(-1, 1)
        }
      }

      // Mines (bombers) - drop while circling near the player
      if (data.dropMines) {
        data.mineCooldown -= deltaTime
        if (data.mineCooldown <= 0 && data.state === 'circle') {
          this.dropMine(enemyObj)
          data.mineCooldown = ENEMY_TYPES[data.type].mineRate + randomRange(-1, 1)
        }
      }

      // Dodge (aces)
      if (data.type === 'ace') {
        data.dodgeCooldown -= deltaTime
      }

      // Hit flash decay (frame-based, replaces setTimeout)
      if (data.hitFlashTime > 0) {
        data.hitFlashTime -= deltaTime
        if (data.hitFlashTime <= 0) {
          mesh.traverse((child) => {
            if (child.isMesh) child.material.emissiveIntensity = 0
          })
        }
      }

      // Despawn if too far behind player
      const distToPlayer = mesh.position.distanceTo(this.playerPosition)
      if (distToPlayer > 300 || mesh.position.z > this.playerPosition.z + 100) {
        this.despawnEnemy(i, false)
      }
    }
  }

  updateEnemyAI(enemyObj, deltaTime) {
    const mesh = enemyObj.mesh
    const data = mesh.userData
    const toPlayer = new THREE.Vector3().subVectors(this.playerPosition, mesh.position)
    const distToPlayer = toPlayer.length()

    switch (data.state) {
      case 'approach':
        // Move toward player, transition to attack when close
        data.targetPosition.copy(this.playerPosition)
        if (distToPlayer < 80) {
          data.state = data.type === 'bomber' ? 'circle' : 'attack'
        }
        break

      case 'attack':
        // Direct attack run
        data.targetPosition.copy(this.playerPosition)
        if (distToPlayer < 30) {
          // Overshoot and circle around
          data.state = 'circle'
          data.targetPosition.copy(this.playerPosition).add(new THREE.Vector3(
            randomRange(-50, 50),
            randomRange(-20, 30),
            randomRange(-30, 30)
          ))
        }
        break

      case 'circle':
        // Circle around player
        if (data.type === 'bomber') {
          // Bombers circle wider and slower
          const angle = data.spawnTime * 0.3
          data.targetPosition.copy(this.playerPosition).add(new THREE.Vector3(
            Math.cos(angle) * 60,
            20 + Math.sin(angle * 0.5) * 10,
            Math.sin(angle) * 60
          ))
        } else {
          // Interceptors/aces circle tighter
          const angle = data.spawnTime * 0.8
          data.targetPosition.copy(this.playerPosition).add(new THREE.Vector3(
            Math.cos(angle) * 40,
            10 + Math.sin(angle) * 15,
            Math.sin(angle) * 40
          ))
        }
        break

      case 'flee':
        // Damaged enemies flee
        data.targetPosition.copy(mesh.position).add(
          toPlayer.clone().normalize().multiplyScalar(-100)
        )
        break
    }

    // Low health behavior
    if (data.health < data.maxHealth * 0.4 && data.state !== 'flee') {
      if (Math.random() < 0.02) data.state = 'flee'
    }

    // Ace dodge behavior
    if (data.type === 'ace' && data.dodgeCooldown <= 0 && distToPlayer < 60) {
      if (Math.random() < 0.01) {
        // Quick dodge
        const dodgeDir = new THREE.Vector3()
        randomVec3(1, dodgeDir)
        dodgeDir.y = Math.abs(dodgeDir.y) // Prefer upward dodges
        data.targetPosition.copy(mesh.position).add(dodgeDir.multiplyScalar(30))
        data.dodgeCooldown = 2 + Math.random() * 2
      }
    }
  }

  moveEnemy(enemyObj, deltaTime) {
    const mesh = enemyObj.mesh
    const data = mesh.userData

    const toTarget = new THREE.Vector3().subVectors(data.targetPosition, mesh.position)
    const distToTarget = toTarget.length()

    if (distToTarget > 1) {
      // Rotate toward target
      const targetDir = toTarget.clone().normalize()
      const currentDir = new THREE.Vector3(0, 0, -1).applyEuler(mesh.rotation)

      const angle = currentDir.angleTo(targetDir)
      if (angle > 0.05) {
        const axis = new THREE.Vector3().crossVectors(currentDir, targetDir).normalize()
        const turnAmount = Math.min(angle, data.turnRate * deltaTime)
        mesh.rotation.y += Math.sign(axis.y) * turnAmount // Simplified - yaw only
        // Proper quaternion slerp would be better but this works for now
      }

      // Move forward
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(mesh.rotation)
      mesh.position.add(forward.clone().multiplyScalar(data.speed * deltaTime))
    }
  }

  enemyFire(enemyObj) {
    const mesh = enemyObj.mesh
    const data = mesh.userData

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(mesh.rotation)
    const gunPos = new THREE.Vector3(0, 0, -1.5).applyMatrix4(mesh.matrixWorld)

    // Aim slightly ahead of player (lead target)
    const toPlayer = new THREE.Vector3().subVectors(this.playerPosition, gunPos)
    const playerDist = toPlayer.length()
    const leadTime = playerDist / data.bulletSpeed
    const predictedPos = this.playerPosition.clone().add(
      this.playerVelocity.clone().multiplyScalar(leadTime)
    )
    const aimDir = new THREE.Vector3().subVectors(predictedPos, gunPos).normalize()

    this.projectileSystem.spawnEnemyBullet(gunPos, aimDir, data.bulletSpeed)

    if (this.audioSystem) this.audioSystem.playEnemyShoot()
  }

  dropMine(enemyObj) {
    const mesh = enemyObj.mesh
    // Drop from the bomb bay (slightly below the bomber)
    const dropPos = new THREE.Vector3(0, -0.8, 0).applyMatrix4(mesh.matrixWorld)
    this.projectileSystem.spawnMine(dropPos)
  }

  enemyFireMissile(enemyObj) {
    const mesh = enemyObj.mesh
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(mesh.rotation)
    const gunPos = new THREE.Vector3(0, 0, -1.5).applyMatrix4(mesh.matrixWorld)

    this.projectileSystem.spawnMissile(gunPos, forward, null)

    if (this.audioSystem) this.audioSystem.playMissileLaunch()
  }

  checkBulletCollision(bullet) {
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemyObj = this.activeEnemies[i]
      const mesh = enemyObj.mesh
      const data = mesh.userData

      const dist = bullet.position.distanceTo(mesh.position)
      if (dist < data.collisionRadius || dist < 1.2) {
        this.damageEnemy(i, 1, bullet.position.clone())
        return true
      }
    }
    return false
  }

  checkMissileCollision(missile) {
    if (!missile.userData.target) return false

    // Find the target enemy
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemyObj = this.activeEnemies[i]
      if (enemyObj === missile.userData.target) {
        const mesh = enemyObj.mesh
        const dist = missile.position.distanceTo(mesh.position)
        if (dist < 3) {
          this.damageEnemy(i, 2, missile.position.clone()) // Missiles do 2 damage
          return true
        }
      }
    }
    return false
  }

  damageEnemy(index, amount, hitPosition) {
    const enemyObj = this.activeEnemies[index]
    const mesh = enemyObj.mesh
    const data = mesh.userData

    data.health -= amount

    // Hit flash (reset by frame-based timer in updateEnemies)
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.material.emissive = new THREE.Color(0xffaa00)
        child.material.emissiveIntensity = 1
      }
    })
    data.hitFlashTime = 0.05

    // Hit particles
    if (this.particleSystem) {
      this.particleSystem.spawnHitSparks(hitPosition)
    }

    if (data.health <= 0) {
      this.killEnemy(index, hitPosition)
    }

    if (this.audioSystem) this.audioSystem.playHit()
  }

  killEnemy(index, position) {
    const enemyObj = this.activeEnemies[index]
    const mesh = enemyObj.mesh
    const data = mesh.userData

    // Explosion
    if (this.particleSystem) {
      this.particleSystem.spawnExplosion(position, data.type)
    }

    // Score
    if (this.onEnemyKilled) {
      this.onEnemyKilled(data.scoreValue, data.type)
    }

    this.enemiesKilledInWave++

    if (this.audioSystem) this.audioSystem.playExplosion()

    this.despawnEnemy(index, true)
  }

  despawnEnemy(index, killed) {
    const enemyObj = this.activeEnemies[index]
    enemyObj.active = false
    enemyObj.mesh.visible = false
    enemyObj.mesh.position.set(0, -1000, 0)
    this.activeEnemies.splice(index, 1)
  }

  isEnemyAlive(enemyObj) {
    return enemyObj.active && enemyObj.mesh.userData.health > 0
  }

  getEnemyPosition(enemyObj) {
    return enemyObj.mesh.position.clone()
  }

  setPlayerData(position, velocity, forward) {
    this.playerPosition.copy(position)
    this.playerVelocity.copy(velocity)
    if (forward) this.playerForward.copy(forward).normalize()
  }

  clearActiveEnemies() {
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      this.despawnEnemy(i, false)
    }
  }

  reset() {
    this.clearActiveEnemies()
    this.waveTimer = 0
    this.difficulty = 1
    this.maxActiveEnemies = 8
    this.spawnInterval = 1.5
    this.startWave(1)
  }

  startWave(waveNumber = 1) {
    this.campaignActive = true
    this.wave = waveNumber
    this.enemiesInWave = this.calculateWaveSize(waveNumber)
    this.enemiesKilledInWave = 0
    this.spawnTimer = 0
    this.waveTimer = 0
  }

  calculateWaveSize(wave) {
    return Math.min(15 + wave * 2, 40)
  }

  getWave() { return this.wave }
  getEnemiesRemaining() { return this.enemiesInWave + this.activeEnemies.length }
  getActiveCount() { return this.activeEnemies.length }
  getDifficulty() { return this.difficulty }

  dispose() {
    this.enemyPool.forEach(enemyObj => {
      this.scene.remove(enemyObj.mesh)
      enemyObj.mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
          else child.material.dispose()
        }
      })
    })
  }
}
