import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createEnemyGeometry } from '../utils/geometry'
import { getEnemyMaterials } from '../utils/materials'
import { randomRange, randomInt, randomVec3, clamp, lerp, wrapAngle } from '../utils/math'

const MAX_ENEMIES = 150

const ENEMY_TYPES = {
  drone: {
    speed: { min: 30, max: 50 },
    health: 1,
    score: 10,
    turnRate: 1.5,
    fireRate: 0,
    spawnWeight: 50,
    scale: 0.20,
    color: 0xd63031,
    camoColor: 0x636e72
  },
  interceptor: {
    speed: { min: 40, max: 70 },
    health: 2,
    score: 25,
    turnRate: 2.5,
    fireRate: 1.5,
    bulletSpeed: 100,
    spawnWeight: 30,
    scale: 0.24,
    color: 0xe1b12c,
    camoColor: 0x2d3436
  },
  bomber: {
    speed: { min: 15, max: 30 },
    health: 5,
    score: 50,
    turnRate: 0.8,
    fireRate: 2,
    bulletSpeed: 70,
    dropMines: true,
    mineRate: 4,
    spawnWeight: 15,
    scale: 0.32,
    color: 0x2f3640,
    camoColor: 0x192a56
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
    spawnWeight: 5,
    scale: 0.26,
    color: 0x1e272e,
    camoColor: 0x00d2d3
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

    this.baseModel = null
    this.load3DModel()

    // Wave system
    this.wave = 1
    this.enemiesInWave = 0
    this.enemiesKilledInWave = 0
    this.waveTimer = 0
    this.waveDelay = 3
    this.campaignActive = false

    // Spawning
    this.spawnTimer = 0
    this.spawnInterval = 0.3
    this.maxActiveEnemies = 25

    // Difficulty scaling
    this.difficulty = 1
    this.maxDifficulty = 10

    // Player reference
    this.playerPosition = new THREE.Vector3()
    this.playerVelocity = new THREE.Vector3()
    this.playerForward = new THREE.Vector3(0, 0, -1)

    // Callbacks
    this.onEnemyKilled = null
    this.onWaveComplete = null

    this.initPool()
  }

  load3DModel() {
    const loader = new GLTFLoader()
    loader.load(
      '/assets/models/fighter-jet.glb',
      (gltf) => {
        const model = gltf.scene

        const box = new THREE.Box3().setFromObject(model)
        const center = new THREE.Vector3()
        box.getCenter(center)
        model.position.x -= center.x
        model.position.y -= center.y
        model.position.z -= center.z

        const container = new THREE.Group()
        container.add(model)

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })

        this.baseModel = container

        // Update existing active enemies to use the new 3D model
        this.activeEnemies.forEach(enemy => {
          this.setupEnemyVisuals(enemy, enemy.type)
        })
      },
      undefined,
      (err) => {
        console.warn('EnemyManager 3D model fallback in use:', err)
      }
    )
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
      state: 'approach',
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
    return null
  }

  setupEnemyVisuals(enemyObj, type) {
    const config = ENEMY_TYPES[type]
    const mesh = enemyObj.mesh

    while (mesh.children.length > 0) {
      mesh.remove(mesh.children[0])
    }

    if (this.baseModel) {
      // Clone photorealistic 3D fighter jet model
      const modelClone = this.baseModel.clone(true)
      modelClone.scale.setScalar(config.scale)

      // Apply tactical livery based on enemy class
      modelClone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (child.material) {
            const mat = child.material.clone()
            if (child.name.includes('Body') || child.name.includes('Fuel')) {
              mat.color = new THREE.Color(config.color)
              mat.metalness = 0.8
              mat.roughness = 0.25
            } else if (child.name.includes('Cockpit')) {
              mat.color = new THREE.Color(config.camoColor)
              mat.metalness = 0.1
              mat.roughness = 0.05
              mat.transmission = 0.8
            }
            child.material = mat
          }
        }
      })
      mesh.add(modelClone)
    } else {
      // Clean fallback
      const geo = createEnemyGeometry(type)
      const materials = getEnemyMaterials(type)
      geo.traverse((child) => {
        if (child.isMesh) {
          child.material = materials.body || materials.wing
        }
      })
      mesh.add(geo)
      mesh.scale.setScalar(2.0)
    }

    // Modern Tactical HUD Target Diamond (subtle military reticle instead of paper ring)
    const reticleGeo = new THREE.BufferGeometry()
    const reticlePoints = new Float32Array([
      0, 2.2, 0,    1.5, 0, 0,
      1.5, 0, 0,    0, -2.2, 0,
      0, -2.2, 0,  -1.5, 0, 0,
      -1.5, 0, 0,   0, 2.2, 0
    ])
    reticleGeo.setAttribute('position', new THREE.BufferAttribute(reticlePoints, 3))
    const reticleMat = new THREE.LineBasicMaterial({
      color: type === 'ace' ? 0x00ffff : (type === 'bomber' ? 0xffaa00 : 0xff3344),
      transparent: true,
      opacity: 0.75
    })
    const reticle = new THREE.LineSegments(reticleGeo, reticleMat)
    reticle.scale.setScalar(0.7)
    mesh.add(reticle)
  }

  setupEnemy(enemyObj, type) {
    const config = ENEMY_TYPES[type]
    const mesh = enemyObj.mesh

    this.setupEnemyVisuals(enemyObj, type)

    enemyObj.active = true
    enemyObj.type = type
    mesh.visible = true

    mesh.userData.type = type
    mesh.userData.health = config.health
    mesh.userData.maxHealth = config.health
    mesh.userData.collisionRadius = 2.5
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

    const toPlayer = new THREE.Vector3().subVectors(this.playerPosition, mesh.position).normalize()
    mesh.lookAt(mesh.position.clone().add(toPlayer))

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
    this.maxActiveEnemies = Math.min(60, 25 + Math.floor(this.wave * 4))
    this.spawnInterval = Math.max(0.1, 0.4 - this.wave * 0.03)
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

    const type = this.selectEnemyType()
    const enemy = this.getEnemyFromPool(type)

    if (enemy) {
      this.activeEnemies.push(enemy)
      this.enemiesInWave--
    }
  }

  selectEnemyType() {
    const types = Object.keys(ENEMY_TYPES)
    const weights = types.map(t => {
      let w = ENEMY_TYPES[t].spawnWeight
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

      this.updateEnemyAI(enemyObj, deltaTime)
      this.moveEnemy(enemyObj, deltaTime)

      if (data.canFire) {
        data.fireCooldown -= deltaTime
        if (data.fireCooldown <= 0) {
          this.enemyFire(enemyObj)
          data.fireCooldown = ENEMY_TYPES[data.type].fireRate + randomRange(-0.3, 0.3)
        }
      }

      if (data.canFireMissiles) {
        data.missileCooldown -= deltaTime
        if (data.missileCooldown <= 0 && Math.random() < 0.4) {
          this.enemyFireMissile(enemyObj)
          data.missileCooldown = ENEMY_TYPES[data.type].missileRate + randomRange(-1, 1)
        }
      }

      if (data.dropMines) {
        data.mineCooldown -= deltaTime
        if (data.mineCooldown <= 0 && data.state === 'circle') {
          this.dropMine(enemyObj)
          data.mineCooldown = ENEMY_TYPES[data.type].mineRate + randomRange(-1, 1)
        }
      }

      if (data.type === 'ace') {
        data.dodgeCooldown -= deltaTime
      }

      if (data.hitFlashTime > 0) {
        data.hitFlashTime -= deltaTime
        if (data.hitFlashTime <= 0) {
          mesh.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
              child.material.emissiveIntensity = 0
            }
          })
        }
      }

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
        data.targetPosition.copy(this.playerPosition)
        if (distToPlayer < 80) {
          data.state = data.type === 'bomber' ? 'circle' : 'attack'
        }
        break

      case 'attack':
        data.targetPosition.copy(this.playerPosition)
        if (distToPlayer < 30) {
          data.state = 'circle'
          data.targetPosition.copy(this.playerPosition).add(new THREE.Vector3(
            randomRange(-50, 50),
            randomRange(-20, 30),
            randomRange(-30, 30)
          ))
        }
        break

      case 'circle':
        if (data.type === 'bomber') {
          const angle = data.spawnTime * 0.3
          data.targetPosition.copy(this.playerPosition).add(new THREE.Vector3(
            Math.cos(angle) * 60,
            20 + Math.sin(angle * 0.5) * 10,
            Math.sin(angle) * 60
          ))
        } else {
          const angle = data.spawnTime * 0.8
          data.targetPosition.copy(this.playerPosition).add(new THREE.Vector3(
            Math.cos(angle) * 40,
            10 + Math.sin(angle) * 15,
            Math.sin(angle) * 40
          ))
        }
        break

      case 'flee':
        data.targetPosition.copy(mesh.position).add(
          toPlayer.clone().normalize().multiplyScalar(-100)
        )
        break
    }

    if (data.health < data.maxHealth * 0.4 && data.state !== 'flee') {
      if (Math.random() < 0.02) data.state = 'flee'
    }

    if (data.type === 'ace' && data.dodgeCooldown <= 0 && distToPlayer < 60) {
      if (Math.random() < 0.01) {
        const dodgeDir = new THREE.Vector3()
        randomVec3(1, dodgeDir)
        dodgeDir.y = Math.abs(dodgeDir.y)
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
      const targetDir = toTarget.clone().normalize()
      const currentDir = new THREE.Vector3(0, 0, -1).applyEuler(mesh.rotation)

      const angle = currentDir.angleTo(targetDir)
      if (angle > 0.05) {
        const axis = new THREE.Vector3().crossVectors(currentDir, targetDir).normalize()
        const turnAmount = Math.min(angle, data.turnRate * deltaTime)
        mesh.rotation.y += Math.sign(axis.y) * turnAmount
      }

      const forward = new THREE.Vector3(0, 0, -1).applyEuler(mesh.rotation)
      mesh.position.add(forward.clone().multiplyScalar(data.speed * deltaTime))
    }
  }

  enemyFire(enemyObj) {
    const mesh = enemyObj.mesh
    const data = mesh.userData

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(mesh.rotation)
    const gunPos = new THREE.Vector3(0, 0, -1.5).applyMatrix4(mesh.matrixWorld)

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

  checkBulletCollision(bullet, spatialGrid) {
    const candidates = spatialGrid ? spatialGrid.getNearby(bullet.position, 20) : this.activeEnemies

    for (let i = 0; i < candidates.length; i++) {
      const enemyObj = candidates[i]
      const index = this.activeEnemies.indexOf(enemyObj)
      if (index === -1) continue

      const mesh = enemyObj.mesh
      const data = mesh.userData

      const dist = bullet.position.distanceTo(mesh.position)
      if (dist < (data.collisionRadius || 2.0) || dist < 1.2) {
        this.damageEnemy(index, 1, bullet.position.clone())
        return true
      }
    }
    return false
  }

  checkMissileCollision(missile) {
    if (!missile.userData.target) return false

    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemyObj = this.activeEnemies[i]
      if (enemyObj === missile.userData.target) {
        const mesh = enemyObj.mesh
        const dist = missile.position.distanceTo(mesh.position)
        if (dist < 3) {
          this.damageEnemy(i, 2, missile.position.clone())
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

    mesh.traverse((child) => {
      if (child.isMesh && child.material && child.material.emissive) {
        child.material.emissive = new THREE.Color(0xffaa00)
        child.material.emissiveIntensity = 1
      }
    })
    data.hitFlashTime = 0.05

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

    if (this.particleSystem) {
      this.particleSystem.spawnExplosion(position, data.type)
    }

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
    this.maxActiveEnemies = 25
    this.spawnInterval = 0.3
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
    return Math.min(40 + wave * 10, 150)
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
