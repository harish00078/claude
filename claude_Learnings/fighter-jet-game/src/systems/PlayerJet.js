import * as THREE from 'three'
import { createJetGeometry } from '../utils/geometry'
import { createJetMaterials } from '../utils/materials'
import { clamp, lerp, approach, wrapAngle, degToRad } from '../utils/math'

export class PlayerJet {
  constructor(scene) {
    this.scene = scene
    this.group = null
    this.camera = null

    // Movement state
    this.position = new THREE.Vector3(0, 0, 0)
    this.rotation = new THREE.Euler(0, 0, 0) // pitch, yaw, roll
    this.velocity = new THREE.Vector3(0, 0, 0)
    this.speed = 0
    this.targetSpeed = 0

    // Constants
    this.MAX_SPEED = 80
    this.BOOST_SPEED = 140
    this.ACCELERATION = 30
    this.DECELERATION = 15
    this.TURN_RATE = 1.5 // rad/s
    this.ROLL_RATE = 2.5
    this.MAX_PITCH = degToRad(80)
    this.MAX_ROLL = degToRad(60)

    // Shooting
    this.fireCooldown = 0
    this.fireRate = 0.1 // seconds between shots
    this.gunIndex = 0

    // Health
    this.maxHealth = 3
    this.health = 3
    this.invulnerable = false
    this.invulnerableTime = 0
    this.INVULNERABLE_DURATION = 1.5

    // Boost fuel
    this.boostFuel = 100
    this.maxBoostFuel = 100
    this.boostConsumption = 25 // per second
    this.boostRegen = 10 // per second

    // Visual effects
    this.engineTrailLeft = null
    this.engineTrailRight = null
    this.trailPointsLeft = []
    this.trailPointsRight = []
    this.maxTrailPoints = 40

    // Input state (set externally)
    this.input = {
      pitch: 0,
      yaw: 0,
      roll: 0,
      boost: false,
      fire: false
    }

    this.init()
  }

  init() {
    // Create jet mesh
    this.group = createJetGeometry()
    this.scene.add(this.group)

    this.materials = createJetMaterials()
    this.group.traverse((child) => {
      if (child.isMesh) {
        const name = child.geometry.type.toLowerCase()
        if (name.includes('cone') || (name.includes('box') && child.position.z < 1)) {
          child.material = this.materials.body
        } else if (name.includes('sphere')) {
          child.material = this.materials.canopy
        } else if (name.includes('cylinder')) {
          child.material = this.materials.engine
        } else {
          child.material = this.materials.dark
        }
      }
    })

    // Create camera rig
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000)
    this.camera.position.set(0, 3, 8)
    this.camera.lookAt(0, 0, 0)

    // Camera offset for third-person view
    this.cameraOffset = new THREE.Vector3(0, 3, 8)
    this.cameraLookAtOffset = new THREE.Vector3(0, 0, -5)

    // Engine trails (will be created by ParticleSystem)
  }

  updateInput(input) {
    this.input.pitch = (input.up ? -1 : 0) + (input.down ? 1 : 0)
    this.input.yaw = (input.left ? -1 : 0) + (input.right ? 1 : 0)
    this.input.roll = (input.left ? -1 : 0) + (input.right ? 1 : 0)
    this.input.boost = input.boost
    this.input.fire = input.fire
  }

  update(deltaTime, projectileSystem, particleSystem, audioSystem) {
    this.handleMovement(deltaTime)
    this.handleShooting(deltaTime, projectileSystem, particleSystem, audioSystem)
    this.handleInvulnerability(deltaTime)
    this.handleBoostFuel(deltaTime)
    this.updateVisuals(deltaTime)
    this.updateTrails(deltaTime, particleSystem)
    this.updateCamera(deltaTime)
  }

  updateTrails(deltaTime, particleSystem) {
    if (!particleSystem) return

    // Lazily create the two engine trails
    if (!this.engineTrailLeft) {
      this.engineTrailLeft = particleSystem.createTrail(this.maxTrailPoints)
      this.engineTrailRight = particleSystem.createTrail(this.maxTrailPoints)
    }

    // Trails only show when moving
    const active = this.speed > 5
    this.engineTrailLeft.active = active
    this.engineTrailRight.active = active
    this.engineTrailLeft.mesh.visible = active
    this.engineTrailRight.mesh.visible = active

    if (!active) {
      this.engineTrailLeft.points.length = 0
      this.engineTrailRight.points.length = 0
      return
    }

    // Update world matrix so engine positions are current
    this.group.updateMatrixWorld()
    const enginePositions = this.group.userData.enginePositions
    if (!enginePositions || enginePositions.length < 2) return

    const leftPos = enginePositions[0].clone().applyMatrix4(this.group.matrixWorld)
    const rightPos = enginePositions[1].clone().applyMatrix4(this.group.matrixWorld)

    particleSystem.updateTrail(this.engineTrailLeft, leftPos, deltaTime)
    particleSystem.updateTrail(this.engineTrailRight, rightPos, deltaTime)
  }

  handleMovement(deltaTime) {
    const { pitch, yaw, roll, boost } = this.input

    // Speed control
    this.targetSpeed = boost && this.boostFuel > 0 ? this.BOOST_SPEED : this.MAX_SPEED
    const accel = boost ? this.ACCELERATION * 1.5 : this.ACCELERATION

    if (this.speed < this.targetSpeed) {
      this.speed = Math.min(this.speed + accel * deltaTime, this.targetSpeed)
    } else {
      this.speed = Math.max(this.speed - this.DECELERATION * deltaTime, 0)
    }

    // Rotation rates
    const pitchRate = this.TURN_RATE * 0.8
    const yawRate = this.TURN_RATE
    const rollRate = this.ROLL_RATE

    // Apply rotations
    this.rotation.x = clamp(
      this.rotation.x + pitch * pitchRate * deltaTime,
      -this.MAX_PITCH,
      this.MAX_PITCH
    )
    this.rotation.y = wrapAngle(this.rotation.y + yaw * yawRate * deltaTime)
    this.rotation.z = clamp(
      this.rotation.z + roll * rollRate * deltaTime,
      -this.MAX_ROLL,
      this.MAX_ROLL
    )

    // Auto-level roll when not turning
    if (Math.abs(roll) < 0.1) {
      this.rotation.z = approach(this.rotation.z, 0, rollRate * 2 * deltaTime)
    }

    // Auto-level pitch slightly
    this.rotation.x = approach(this.rotation.x, 0, pitchRate * 0.3 * deltaTime)

    // Calculate forward vector
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation)
    this.velocity.copy(forward).multiplyScalar(this.speed)

    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    this.group.position.copy(this.position)
    this.group.rotation.copy(this.rotation)
  }

  handleShooting(deltaTime, projectileSystem, particleSystem, audioSystem) {
    this.fireCooldown -= deltaTime

    if (this.input.fire && this.fireCooldown <= 0) {
      const gunPositions = this.group.userData.gunPositions
      if (gunPositions && gunPositions.length > 0) {
        const gunPos = gunPositions[this.gunIndex]
        const worldPos = new THREE.Vector3().copy(gunPos).applyMatrix4(this.group.matrixWorld)

        // Forward direction
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation)

        projectileSystem.spawnPlayerBullet(worldPos, forward)
        particleSystem.spawnMuzzleFlash(worldPos, forward)

        if (audioSystem) audioSystem.playShoot()

        this.gunIndex = (this.gunIndex + 1) % gunPositions.length
      }

      this.fireCooldown = this.fireRate
    }
  }

  handleInvulnerability(deltaTime) {
    if (this.invulnerable) {
      this.invulnerableTime -= deltaTime
      // Flash effect
      this.group.traverse((child) => {
        if (child.isMesh && child.material.opacity !== undefined) {
          child.material.opacity = Math.sin(this.invulnerableTime * 30) * 0.5 + 0.5
        }
      })

      if (this.invulnerableTime <= 0) {
        this.invulnerable = false
        this.group.traverse((child) => {
          if (child.isMesh && child.material.opacity !== undefined) {
            child.material.opacity = child.material === this.materials.canopy ? 0.6 : 1
          }
        })
      }
    }
  }

  handleBoostFuel(deltaTime) {
    if (this.input.boost && this.boostFuel > 0) {
      this.boostFuel = Math.max(0, this.boostFuel - this.boostConsumption * deltaTime)
    } else {
      this.boostFuel = Math.min(this.maxBoostFuel, this.boostFuel + this.boostRegen * deltaTime)
    }
  }

  updateVisuals(deltaTime) {
    const speedRatio = this.speed / this.MAX_SPEED

    if (this.materials?.engine) {
      const boostGlow = this.input.boost && this.boostFuel > 0 ? 0.6 : 0
      this.materials.engine.emissiveIntensity = lerp(0.2, 1.5, Math.min(1, speedRatio)) + boostGlow
    }
  }

  updateCamera(deltaTime) {
    // Calculate desired camera position
    const desiredPos = new THREE.Vector3()
      .copy(this.cameraOffset)
      .applyEuler(this.rotation)
      .add(this.position)

    const desiredLookAt = new THREE.Vector3()
      .copy(this.cameraLookAtOffset)
      .applyEuler(this.rotation)
      .add(this.position)

    // Smooth camera follow
    const lerpFactor = 1 - Math.exp(-8 * deltaTime)
    this.camera.position.lerp(desiredPos, lerpFactor)
    this.camera.lookAt(desiredLookAt)

    // Add slight camera roll for banking feel
    this.camera.rotation.z = lerp(this.camera.rotation.z, this.rotation.z * 0.3, lerpFactor)
  }

  takeDamage(amount = 1) {
    if (this.invulnerable || this.health <= 0) return false

    this.health = Math.max(0, this.health - amount)
    this.invulnerable = true
    this.invulnerableTime = this.INVULNERABLE_DURATION

    return this.health <= 0
  }

  heal(amount = 1) {
    this.health = Math.min(this.maxHealth, this.health + amount)
  }

  getBoostRatio() {
    return this.boostFuel / this.maxBoostFuel
  }

  getSpeedRatio() {
    return this.speed / this.MAX_SPEED
  }

  getCamera() {
    return this.camera
  }

  getPosition() {
    return this.position
  }

  getForward() {
    return new THREE.Vector3(0, 0, -1).applyEuler(this.rotation)
  }

  reset() {
    this.position.set(0, 0, 0)
    this.rotation.set(0, 0, 0)
    this.velocity.set(0, 0, 0)
    this.speed = 0
    this.targetSpeed = 0
    this.health = this.maxHealth
    this.invulnerable = false
    this.invulnerableTime = 0
    this.boostFuel = this.maxBoostFuel
    this.fireCooldown = 0
    this.gunIndex = 0
    this.group.position.copy(this.position)
    this.group.rotation.copy(this.rotation)
    this.group.traverse((child) => {
      if (child.isMesh && child.material?.opacity !== undefined) {
        child.material.opacity = child.material === this.materials.canopy ? 0.6 : 1
      }
    })
    this.camera.position.copy(this.cameraOffset)
    this.camera.lookAt(this.cameraLookAtOffset)
    if (this.engineTrailLeft) {
      this.engineTrailLeft.points.length = 0
      this.engineTrailLeft.active = false
      this.engineTrailLeft.mesh.visible = false
    }
    if (this.engineTrailRight) {
      this.engineTrailRight.points.length = 0
      this.engineTrailRight.active = false
      this.engineTrailRight.mesh.visible = false
    }
  }

  getRotation() {
    return this.rotation
  }

  getHealth() {
    return this.health
  }

  isAlive() {
    return this.health > 0
  }

  isInvulnerable() {
    return this.invulnerable
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z)
    this.group.position.copy(this.position)
  }

  dispose() {
    if (this.group) {
      this.scene.remove(this.group)
      this.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    }
  }
}
