import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createJetGeometry } from '../utils/geometry'
import { createJetMaterials } from '../utils/materials'
import { clamp, lerp, approach, wrapAngle, degToRad } from '../utils/math'

export class PlayerJet {
  constructor(scene) {
    this.scene = scene
    this.group = null
    this.camera = null
    this.fallbackMesh = null
    this.realModel = null

    // Movement & Aerodynamic Flight Sim State
    this.position = new THREE.Vector3(0, 50, 0)
    this.rotation = new THREE.Euler(0, 0, 0)
    this.quaternion = new THREE.Quaternion()
    this.speed = 55
    this.velocity = new THREE.Vector3(0, 0, -55)
    this.throttle = 0.7
    this.airspeedKnots = 110
    this.altitudeFeet = 600

    // Aerodynamic Physics Constants
    this.STALL_SPEED = 20
    this.CRUISE_SPEED = 55
    this.MAX_THROTTLE_SPEED = 120
    this.GRAVITY = 9.81
    this.LIFT_COEFF = 0.003924
    this.DRAG_COEFF = 0.012
    this.isStalled = false

    // Control Surface Authorities
    this.pitchRate = 2.0
    this.yawRate = 1.5
    this.rollRate = 3.2

    // Default Camera Mode: 'chase' (toggleable to 'cockpit' via C)
    this.cameraMode = 'chase'

    // Shooting
    this.fireCooldown = 0
    this.fireRate = 0.1
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
    this.boostConsumption = 25
    this.boostRegen = 10

    // Visual effects
    this.engineTrailLeft = null
    this.engineTrailRight = null
    this.maxTrailPoints = 40

    // Input state
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
    this.group = new THREE.Group()
    this.scene.add(this.group)

    // Set default hardpoints
    this.group.userData = {
      gunPositions: [
        new THREE.Vector3(-0.7, 0, -2.0),
        new THREE.Vector3(0.7, 0, -2.0)
      ],
      enginePositions: [
        new THREE.Vector3(-0.4, 0, 2.0),
        new THREE.Vector3(0.4, 0, 2.0)
      ],
      collisionRadius: 2.2
    }

    // Immediate procedural fallback while GLB model loads
    this.fallbackMesh = createJetGeometry()
    this.group.add(this.fallbackMesh)
    this.materials = createJetMaterials()

    // Asynchronously load realistic 3D fighter jet GLB model
    const loader = new GLTFLoader()
    loader.load(
      '/assets/models/fighter-jet.glb',
      (gltf) => {
        if (this.fallbackMesh) {
          this.group.remove(this.fallbackMesh)
          this.fallbackMesh = null
        }

        const model = gltf.scene

        // Center model bounds so pivot is at center of gravity
        const box = new THREE.Box3().setFromObject(model)
        const center = new THREE.Vector3()
        box.getCenter(center)
        model.position.x -= center.x
        model.position.y -= center.y
        model.position.z -= center.z

        const container = new THREE.Group()
        container.add(model)
        container.scale.setScalar(0.24) // Perfectly scaled to the scene

        // Enable real-time shadow casting and PBR properties
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            if (child.material) {
              child.material.roughness = 0.35
              child.material.metalness = 0.7
              child.material.needsUpdate = true
            }
          }
        })

        this.realModel = container
        this.group.add(container)
        console.log('✈️ Photorealistic Fighter Jet 3D Model Loaded Successfully!')
      },
      undefined,
      (err) => {
        console.warn('Could not load GLB fighter jet, fallback active:', err)
      }
    )

    // Create camera rig
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000)
    this.camera.position.set(0, 2.8, 8)
    this.camera.lookAt(0, 0, 0)

    this.cameraOffset = new THREE.Vector3(0, 2.8, 8)
    this.cameraLookAtOffset = new THREE.Vector3(0, 0.4, -6)
  }

  updateInput(input) {
    this.input.pitch = (input.up ? 1 : 0) + (input.down ? -1 : 0)
    this.input.yaw = (input.left ? 1 : 0) + (input.right ? -1 : 0)
    this.input.roll = (input.left ? 1 : 0) + (input.right ? -1 : 0)
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

    if (!this.engineTrailLeft) {
      this.engineTrailLeft = particleSystem.createTrail(this.maxTrailPoints)
      this.engineTrailRight = particleSystem.createTrail(this.maxTrailPoints)
    }

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

    if (boost && this.boostFuel > 0) {
      this.throttle = Math.min(1.3, this.throttle + 0.5 * deltaTime)
    } else {
      const targetThrottle = 0.65
      this.throttle = approach(this.throttle, targetThrottle, 0.2 * deltaTime)
    }

    const airspeedNorm = clamp(this.speed / this.CRUISE_SPEED, 0.2, 1.8)
    const dynamicAuthority = Math.sqrt(airspeedNorm)

    const pitchAngle = pitch * this.pitchRate * dynamicAuthority * deltaTime
    const yawAngle = yaw * this.yawRate * dynamicAuthority * deltaTime
    const rollAngle = roll * this.rollRate * dynamicAuthority * deltaTime

    const deltaQuat = new THREE.Quaternion()
    const eulerDelta = new THREE.Euler(pitchAngle, yawAngle, rollAngle, 'YXZ')
    deltaQuat.setFromEuler(eulerDelta)

    this.quaternion.multiply(deltaQuat)

    // Auto-leveling toward horizon when neutral
    if (Math.abs(roll) < 0.1 && Math.abs(yaw) < 0.1) {
      const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion)
      if (currentUp.y > 0.1) {
        const targetUp = new THREE.Vector3(0, 1, 0)
        const alignmentQuat = new THREE.Quaternion().setFromUnitVectors(currentUp, targetUp)
        this.quaternion.slerp(alignmentQuat.multiply(this.quaternion), deltaTime * 2.0)
      }
    }

    this.rotation.setFromQuaternion(this.quaternion)

    // Aerodynamic Forces & Physics Calculation
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion)

    const thrustForce = this.throttle * 45
    let liftForce = (this.speed * this.speed) * this.LIFT_COEFF

    if (this.speed < this.STALL_SPEED) {
      this.isStalled = true
      liftForce *= 0.2
      const stallNoseDown = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.8 * deltaTime)
      this.quaternion.multiply(stallNoseDown)
    } else {
      this.isStalled = false
    }

    const dragForce = (this.speed * this.speed) * this.DRAG_COEFF

    const accelVector = new THREE.Vector3()
      .addScaledVector(forward, thrustForce - dragForce)
      .addScaledVector(up, liftForce)
      .add(new THREE.Vector3(0, -this.GRAVITY, 0))

    this.velocity.addScaledVector(accelVector, deltaTime)
    this.speed = this.velocity.length()

    if (this.speed > 2) {
      const flightDir = this.velocity.clone().normalize()
      this.position.addScaledVector(flightDir, this.speed * deltaTime)
    }

    this.airspeedKnots = Math.round(this.speed * 2.2)
    this.altitudeFeet = Math.round((this.position.y + 50) * 3.28)

    this.group.position.copy(this.position)
    this.group.quaternion.copy(this.quaternion)
  }

  handleShooting(deltaTime, projectileSystem, particleSystem, audioSystem) {
    this.fireCooldown -= deltaTime

    if (this.input.fire && this.fireCooldown <= 0) {
      const gunPositions = this.group.userData.gunPositions
      if (gunPositions && gunPositions.length > 0) {
        const gunPos = gunPositions[this.gunIndex]
        const worldPos = new THREE.Vector3().copy(gunPos).applyMatrix4(this.group.matrixWorld)
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion)

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
      this.group.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true
          child.material.opacity = Math.sin(this.invulnerableTime * 30) * 0.4 + 0.6
        }
      })

      if (this.invulnerableTime <= 0) {
        this.invulnerable = false
        this.group.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.opacity = 1.0
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
    // Engine glow modulation
    const speedRatio = this.speed / this.MAX_THROTTLE_SPEED
    if (this.materials?.engine) {
      const boostGlow = this.input.boost && this.boostFuel > 0 ? 0.6 : 0
      this.materials.engine.emissiveIntensity = lerp(0.2, 1.5, Math.min(1, speedRatio)) + boostGlow
    }
  }

  updateCamera(deltaTime) {
    if (this.cameraMode === 'cockpit') {
      const cockpitOffset = new THREE.Vector3(0, 0.45, -0.4).applyQuaternion(this.quaternion)
      const lookAtTarget = new THREE.Vector3(0, 0.45, -15).applyQuaternion(this.quaternion).add(this.position)

      this.camera.position.copy(this.position).add(cockpitOffset)
      const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion)
      this.camera.up.copy(upVector)
      this.camera.lookAt(lookAtTarget)
    } else {
      const desiredPos = new THREE.Vector3()
        .copy(this.cameraOffset)
        .applyQuaternion(this.quaternion)
        .add(this.position)

      const desiredLookAt = new THREE.Vector3()
        .copy(this.cameraLookAtOffset)
        .applyQuaternion(this.quaternion)
        .add(this.position)

      const lerpFactor = 1 - Math.exp(-8 * deltaTime)
      this.camera.position.lerp(desiredPos, lerpFactor)

      const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion)
      this.camera.up.copy(upVector)
      this.camera.lookAt(desiredLookAt)
    }
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
    return this.speed / this.MAX_THROTTLE_SPEED
  }

  toggleCameraMode() {
    this.cameraMode = this.cameraMode === 'cockpit' ? 'chase' : 'cockpit'
    return this.cameraMode
  }

  getAirspeedKnots() {
    return this.airspeedKnots || Math.round(this.speed * 2.2)
  }

  getAltitudeFeet() {
    return this.altitudeFeet || Math.round((this.position.y + 50) * 3.28)
  }

  getThrottlePercent() {
    return Math.round(Math.min(100, this.throttle * 100))
  }

  getCamera() {
    return this.camera
  }

  getPosition() {
    return this.position
  }

  getForward() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion)
  }

  reset() {
    this.position.set(0, 50, 0)
    this.rotation.set(0, 0, 0)
    this.quaternion.identity()
    this.speed = 55
    this.velocity.set(0, 0, -55)
    this.throttle = 0.7
    this.isStalled = false
    this.health = this.maxHealth
    this.invulnerable = false
    this.invulnerableTime = 0
    this.boostFuel = this.maxBoostFuel
    this.fireCooldown = 0
    this.gunIndex = 0
    this.group.position.copy(this.position)
    this.group.quaternion.copy(this.quaternion)
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
