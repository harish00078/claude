import * as THREE from 'three'
import { createParticleGeometry, createTrailGeometry, createMuzzleFlashGeometry, createDebrisGeometry } from '../utils/geometry'
import { createExplosionParticleMaterial, createSparkParticleMaterial, createSmokeParticleMaterial, createTrailMaterial, createMuzzleFlashMaterial } from '../utils/materials'
import { randomRange, randomVec3, randomInt } from '../utils/math'

const MAX_EXPLOSION_PARTICLES = 500
const MAX_SPARK_PARTICLES = 200
const MAX_SMOKE_PARTICLES = 100
const MAX_MUZZLE_FLASHES = 20
const MAX_DEBRIS = 100

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene

    // Explosion particles (points)
    this.explosionGeo = createParticleGeometry(MAX_EXPLOSION_PARTICLES)
    this.explosionMat = createExplosionParticleMaterial()
    this.explosionParticles = new THREE.Points(this.explosionGeo, this.explosionMat)
    this.scene.add(this.explosionParticles)
    this.explosionCount = 0
    this.explosionParticlesData = []

    // Spark particles
    this.sparkGeo = createParticleGeometry(MAX_SPARK_PARTICLES)
    this.sparkMat = createSparkParticleMaterial()
    this.sparkParticles = new THREE.Points(this.sparkGeo, this.sparkMat)
    this.scene.add(this.sparkParticles)
    this.sparkCount = 0
    this.sparkParticlesData = []

    // Smoke particles
    this.smokeGeo = createParticleGeometry(MAX_SMOKE_PARTICLES)
    this.smokeMat = createSmokeParticleMaterial()
    this.smokeParticles = new THREE.Points(this.smokeGeo, this.smokeMat)
    this.scene.add(this.smokeParticles)
    this.smokeCount = 0
    this.smokeParticlesData = []

    // Muzzle flashes (sprites/planes)
    this.muzzleFlashes = []
    this.muzzleFlashGeo = createMuzzleFlashGeometry()
    this.muzzleFlashMat = createMuzzleFlashMaterial()
    for (let i = 0; i < MAX_MUZZLE_FLASHES; i++) {
      const flash = new THREE.Mesh(this.muzzleFlashGeo, this.muzzleFlashMat)
      flash.visible = false
      flash.userData = { lifetime: 0 }
      this.scene.add(flash)
      this.muzzleFlashes.push(flash)
    }

    // Debris (meshes for larger explosions)
    this.debris = []
    this.debrisGeo = createDebrisGeometry()
    this.debrisMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      metalness: 0.5,
      roughness: 0.5,
      flatShading: true
    })
    for (let i = 0; i < MAX_DEBRIS; i++) {
      const piece = new THREE.Mesh(this.debrisGeo, this.debrisMat)
      piece.visible = false
      piece.userData = { lifetime: 0, velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3() }
      this.scene.add(piece)
      this.debris.push(piece)
    }

    // Engine trails (per-engine)
    this.trails = []
  }

  // Create a trail for an engine
  createTrail(maxPoints = 40) {
    const geo = createTrailGeometry(maxPoints)
    const mat = createTrailMaterial()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    mesh.frustumCulled = false // geometry updates every frame, skip culling
    this.scene.add(mesh)
    const trail = {
      mesh,
      geo,
      mat,
      points: [],
      maxPoints,
      active: false
    }
    this.trails.push(trail)
    return trail
  }

  updateTrail(trail, position, deltaTime) {
    if (!trail.active) return

    trail.points.unshift(position.clone())
    if (trail.points.length > trail.maxPoints) {
      trail.points.pop()
    }

    // Update geometry
    const positions = trail.geo.attributes.position.array
    const alphas = trail.geo.attributes.alpha.array
    const uvs = trail.geo.attributes.uv.array

    const count = trail.points.length
    // Indexed geometry: 6 indices (2 triangles) per segment
    trail.geo.setDrawRange(0, Math.max(0, (count - 1) * 6))

    for (let i = 0; i < count; i++) {
      const point = trail.points[i]
      const nextPoint = trail.points[i + 1] || point
      const trailDir = new THREE.Vector3().subVectors(nextPoint, point).normalize()
      const up = new THREE.Vector3(0, 1, 0)
      const side = new THREE.Vector3().crossVectors(trailDir, up).normalize().multiplyScalar(0.3 * (1 - i / count))

      // Two vertices per point (ribbon edges)
      positions[i * 6] = point.x + side.x
      positions[i * 6 + 1] = point.y + side.y
      positions[i * 6 + 2] = point.z + side.z

      positions[i * 6 + 3] = point.x - side.x
      positions[i * 6 + 4] = point.y - side.y
      positions[i * 6 + 5] = point.z - side.z

      // Alpha fade
      const alpha = (1 - i / count) * 0.6
      alphas[i * 2] = alpha
      alphas[i * 2 + 1] = alpha

      // UVs
      uvs[i * 4] = 0; uvs[i * 4 + 1] = i / count
      uvs[i * 4 + 2] = 1; uvs[i * 4 + 3] = i / count
    }

    trail.geo.attributes.position.needsUpdate = true
    trail.geo.attributes.alpha.needsUpdate = true
    trail.geo.attributes.uv.needsUpdate = true
  }

  update(deltaTime) {
    this.updateExplosions(deltaTime)
    this.updateSparks(deltaTime)
    this.updateSmoke(deltaTime)
    this.updateMuzzleFlashes(deltaTime)
    this.updateDebris(deltaTime)
  }

  updateExplosions(deltaTime) {
    const positions = this.explosionGeo.attributes.position.array
    const sizes = this.explosionGeo.attributes.size.array
    const colors = this.explosionGeo.attributes.color.array
    const lifetimes = this.explosionGeo.attributes.lifetime.array
    const velocities = this.explosionGeo.attributes.velocity.array

    let alive = 0
    for (let i = 0; i < this.explosionCount; i++) {
      const data = this.explosionParticlesData[i]
      if (!data || data.lifetime <= 0) continue

      data.lifetime -= deltaTime
      if (data.lifetime <= 0) continue

      // Update position
      data.position.add(data.velocity.clone().multiplyScalar(deltaTime))
      data.velocity.y -= 9.8 * deltaTime * 0.5 // Gravity
      data.velocity.multiplyScalar(0.98) // Drag

      // Update attributes
      const idx = i * 3
      positions[idx] = data.position.x
      positions[idx + 1] = data.position.y
      positions[idx + 2] = data.position.z

      sizes[i] = data.size * (data.lifetime / data.maxLifetime)

      // Color fade from yellow to red to dark
      const lifeRatio = data.lifetime / data.maxLifetime
      if (lifeRatio > 0.5) {
        // Yellow to orange
        const t = (lifeRatio - 0.5) * 2
        colors[idx] = 1
        colors[idx + 1] = lerp(0.2, 1, t)
        colors[idx + 2] = 0
      } else {
        // Orange to red to dark
        const t = lifeRatio * 2
        colors[idx] = t
        colors[idx + 1] = t * 0.3
        colors[idx + 2] = 0
      }

      alive++
    }
    this.explosionGeo.attributes.position.needsUpdate = true
    this.explosionGeo.attributes.size.needsUpdate = true
    this.explosionGeo.attributes.color.needsUpdate = true
    this.explosionCount = alive
  }

  updateSparks(deltaTime) {
    const positions = this.sparkGeo.attributes.position.array
    const sizes = this.sparkGeo.attributes.size.array
    const lifetimes = this.sparkGeo.attributes.lifetime.array
    const velocities = this.sparkGeo.attributes.velocity.array

    let alive = 0
    for (let i = 0; i < this.sparkCount; i++) {
      const data = this.sparkParticlesData[i]
      if (!data || data.lifetime <= 0) continue

      data.lifetime -= deltaTime
      if (data.lifetime <= 0) continue

      data.position.add(data.velocity.clone().multiplyScalar(deltaTime))
      data.velocity.y -= 20 * deltaTime
      data.velocity.multiplyScalar(0.95)

      const idx = i * 3
      positions[idx] = data.position.x
      positions[idx + 1] = data.position.y
      positions[idx + 2] = data.position.z

      sizes[i] = data.size * (data.lifetime / data.maxLifetime)

      alive++
    }
    this.sparkGeo.attributes.position.needsUpdate = true
    this.sparkGeo.attributes.size.needsUpdate = true
    this.sparkCount = alive
  }

  updateSmoke(deltaTime) {
    const positions = this.smokeGeo.attributes.position.array
    const sizes = this.smokeGeo.attributes.size.array
    const colors = this.smokeGeo.attributes.color.array
    const lifetimes = this.smokeGeo.attributes.lifetime.array
    const velocities = this.smokeGeo.attributes.velocity.array

    let alive = 0
    for (let i = 0; i < this.smokeCount; i++) {
      const data = this.smokeParticlesData[i]
      if (!data || data.lifetime <= 0) continue

      data.lifetime -= deltaTime
      if (data.lifetime <= 0) continue

      data.position.add(data.velocity.clone().multiplyScalar(deltaTime))
      data.velocity.y += 2 * deltaTime // Smoke rises
      data.velocity.multiplyScalar(0.97)

      const idx = i * 3
      positions[idx] = data.position.x
      positions[idx + 1] = data.position.y
      positions[idx + 2] = data.position.z

      sizes[i] = data.size * (1 + (1 - data.lifetime / data.maxLifetime) * 2)

      // Fade from gray to transparent
      const lifeRatio = data.lifetime / data.maxLifetime
      const gray = lerp(0.1, 0.5, lifeRatio)
      colors[idx] = gray
      colors[idx + 1] = gray
      colors[idx + 2] = gray

      alive++
    }
    this.smokeGeo.attributes.position.needsUpdate = true
    this.smokeGeo.attributes.size.needsUpdate = true
    this.smokeGeo.attributes.color.needsUpdate = true
    this.smokeCount = alive
  }

  updateMuzzleFlashes(deltaTime) {
    for (const flash of this.muzzleFlashes) {
      if (!flash.visible) continue

      flash.userData.lifetime -= deltaTime
      if (flash.userData.lifetime <= 0) {
        flash.visible = false
        continue
      }

      // Scale and fade
      const lifeRatio = flash.userData.lifetime / flash.userData.maxLifetime
      flash.scale.setScalar(lerp(0.1, 1, lifeRatio))
      flash.material.opacity = lifeRatio
    }
  }

  updateDebris(deltaTime) {
    for (const piece of this.debris) {
      if (!piece.visible) continue

      piece.userData.lifetime -= deltaTime
      if (piece.userData.lifetime <= 0) {
        piece.visible = false
        continue
      }

      piece.position.add(piece.userData.velocity.clone().multiplyScalar(deltaTime))
      piece.userData.velocity.y -= 9.8 * deltaTime
      piece.userData.velocity.multiplyScalar(0.99)

      piece.rotation.x += piece.userData.angularVelocity.x * deltaTime
      piece.rotation.y += piece.userData.angularVelocity.y * deltaTime
      piece.rotation.z += piece.userData.angularVelocity.z * deltaTime
    }
  }

  // Public API

  spawnExplosion(position, type = 'standard') {
    const config = this.getExplosionConfig(type)
    const count = Math.min(config.count, MAX_EXPLOSION_PARTICLES - this.explosionCount)

    for (let i = 0; i < count; i++) {
      if (this.explosionCount >= MAX_EXPLOSION_PARTICLES) break

      const data = {
        position: position.clone(),
        velocity: new THREE.Vector3(),
        size: config.size,
        maxLifetime: config.lifetime,
        lifetime: config.lifetime
      }

      // Random direction with bias
      randomVec3(1, data.velocity).multiplyScalar(config.speed)
      data.velocity.y += randomRange(0, config.upwardBias)

      this.explosionParticlesData[this.explosionCount] = data
      this.explosionCount++
    }

    // Spawn debris for larger explosions
    if (type === 'large' || type === 'missile' || type === 'bomber') {
      this.spawnDebris(position, type)
    }

    // Spawn smoke
    this.spawnSmoke(position, type)
  }

  spawnDebris(position, type) {
    const count = type === 'bomber' ? 8 : randomInt(3, 6)

    for (let i = 0; i < count; i++) {
      const piece = this.debris.find(p => !p.visible)
      if (!piece) break

      piece.position.copy(position)
      piece.visible = true
      piece.userData.lifetime = randomRange(2, 4)
      piece.userData.maxLifetime = piece.userData.lifetime

      randomVec3(1, piece.userData.velocity).multiplyScalar(randomRange(5, 15))
      piece.userData.velocity.y += randomRange(2, 8)

      piece.userData.angularVelocity.set(
        randomRange(-10, 10),
        randomRange(-10, 10),
        randomRange(-10, 10)
      )
      piece.rotation.set(0, 0, 0)
    }
  }

  spawnSmoke(position, type) {
    const count = type === 'bomber' ? 15 : randomInt(5, 10)

    for (let i = 0; i < count; i++) {
      if (this.smokeCount >= MAX_SMOKE_PARTICLES) break

      const data = {
        position: position.clone(),
        velocity: new THREE.Vector3(),
        size: randomRange(1, 3),
        maxLifetime: randomRange(2, 4),
        lifetime: randomRange(2, 4)
      }

      randomVec3(0.5, data.velocity).multiplyScalar(randomRange(2, 5))
      data.velocity.y += randomRange(1, 3)

      this.smokeParticlesData[this.smokeCount] = data
      this.smokeCount++
    }
  }

  spawnHitSparks(position) {
    const count = randomInt(5, 10)

    for (let i = 0; i < count; i++) {
      if (this.sparkCount >= MAX_SPARK_PARTICLES) break

      const data = {
        position: position.clone(),
        velocity: new THREE.Vector3(),
        size: randomRange(0.1, 0.3),
        maxLifetime: randomRange(0.2, 0.5),
        lifetime: randomRange(0.2, 0.5)
      }

      randomVec3(1, data.velocity).multiplyScalar(randomRange(10, 30))

      this.sparkParticlesData[this.sparkCount] = data
      this.sparkCount++
    }
  }

  spawnMuzzleFlash(position, direction) {
    const flash = this.muzzleFlashes.find(f => !f.visible)
    if (!flash) return

    flash.position.copy(position)
    flash.lookAt(position.clone().add(direction))
    flash.rotation.z = Math.random() * Math.PI * 2
    flash.visible = true
    flash.userData.lifetime = 0.05
    flash.userData.maxLifetime = 0.05
    flash.scale.setScalar(0.5)
    flash.material.opacity = 1
  }

  spawnSmallExplosion(position) {
    this.spawnExplosion(position, 'small')
  }

  getExplosionConfig(type) {
    switch (type) {
      case 'drone':
        return { count: 15, size: 0.4, speed: 15, lifetime: 0.8, upwardBias: 5 }
      case 'interceptor':
        return { count: 25, size: 0.5, speed: 20, lifetime: 1, upwardBias: 8 }
      case 'bomber':
        return { count: 50, size: 0.8, speed: 25, lifetime: 1.5, upwardBias: 10 }
      case 'ace':
        return { count: 35, size: 0.6, speed: 22, lifetime: 1.2, upwardBias: 8 }
      case 'missile':
        return { count: 30, size: 0.7, speed: 30, lifetime: 1, upwardBias: 5 }
      case 'small':
        return { count: 8, size: 0.3, speed: 10, lifetime: 0.4, upwardBias: 3 }
      default:
        return { count: 20, size: 0.5, speed: 18, lifetime: 1, upwardBias: 5 }
    }
  }

  dispose() {
    this.scene.remove(this.explosionParticles)
    this.scene.remove(this.sparkParticles)
    this.scene.remove(this.smokeParticles)

    this.explosionGeo.dispose()
    this.sparkGeo.dispose()
    this.smokeGeo.dispose()
    this.explosionMat.dispose()
    this.sparkMat.dispose()
    this.smokeMat.dispose()

    this.muzzleFlashes.forEach(f => {
      this.scene.remove(f)
    })
    this.muzzleFlashGeo.dispose()
    this.muzzleFlashMat.dispose()

    this.debris.forEach(d => {
      this.scene.remove(d)
    })
    this.debrisGeo.dispose()
    this.debrisMat.dispose()

    this.trails.forEach(trail => {
      this.scene.remove(trail.mesh)
      trail.geo.dispose()
      trail.mat.dispose()
    })
    this.trails.length = 0
  }
}

// Helper
function lerp(a, b, t) {
  return a + (b - a) * t
}