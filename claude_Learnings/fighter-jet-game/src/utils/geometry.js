import * as THREE from 'three'
import { randomVec3 } from './math'

// Create a photorealistic 5th-Gen Stealth Fighter Jet geometry (F-22 Raptor Style)
export function createJetGeometry() {
  const group = new THREE.Group()

  // Nose Cone (sleek pointed radar radome)
  const noseGeo = new THREE.ConeGeometry(0.35, 1.8, 32)
  noseGeo.rotateX(-Math.PI / 2)
  const nose = new THREE.Mesh(noseGeo)
  nose.position.z = -2.2
  group.add(nose)

  // Main Fuselage (smoothed stealth body)
  const fuselageGeo = new THREE.CylinderGeometry(0.45, 0.55, 3.2, 32)
  fuselageGeo.rotateX(Math.PI / 2)
  fuselageGeo.scale(1.2, 0.7, 1.0)
  const fuselage = new THREE.Mesh(fuselageGeo)
  fuselage.position.z = -0.2
  group.add(fuselage)

  // Cockpit Bubble Canopy (smooth glass dome)
  const canopyGeo = new THREE.SphereGeometry(0.38, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  canopyGeo.scale(0.9, 0.7, 1.8)
  canopyGeo.rotateX(Math.PI / 2)
  const canopy = new THREE.Mesh(canopyGeo)
  canopy.position.set(0, 0.28, -0.8)
  group.add(canopy)

  // Swept Main Delta Wings (aerodynamic stealth wings)
  const wingGeo = new THREE.BoxGeometry(5.8, 0.08, 2.2, 8, 2, 8)
  const wing = new THREE.Mesh(wingGeo)
  wing.position.set(0, -0.05, -0.2)
  group.add(wing)

  // Twin Canted Vertical Stabilizers (F-22 20° outward angle)
  const finGeo = new THREE.BoxGeometry(0.08, 1.3, 1.1, 2, 4, 4)

  const leftFin = new THREE.Mesh(finGeo)
  leftFin.position.set(-0.8, 0.65, 1.2)
  leftFin.rotation.z = -0.35 // 20 deg angle
  group.add(leftFin)

  const rightFin = new THREE.Mesh(finGeo)
  rightFin.position.set(0.8, 0.65, 1.2)
  rightFin.rotation.z = 0.35
  group.add(rightFin)

  // Horizontal Elevator Stabilizers
  const stabGeo = new THREE.BoxGeometry(2.4, 0.06, 0.9)
  const stab = new THREE.Mesh(stabGeo)
  stab.position.set(0, -0.02, 1.5)
  group.add(stab)

  // Dual Vectoring Afterburner Engine Nozzles
  const nozzleGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.5, 32)
  nozzleGeo.rotateX(Math.PI / 2)

  const leftNozzle = new THREE.Mesh(nozzleGeo)
  leftNozzle.position.set(-0.4, -0.05, 1.5)
  group.add(leftNozzle)

  const rightNozzle = new THREE.Mesh(nozzleGeo)
  rightNozzle.position.set(0.4, -0.05, 1.5)
  group.add(rightNozzle)

  // Gun positions
  group.userData.gunPositions = [
    new THREE.Vector3(-0.5, 0, -2.0),
    new THREE.Vector3(0.5, 0, -2.0)
  ]

  // Engine positions
  group.userData.enginePositions = [
    new THREE.Vector3(-0.4, -0.05, 1.7),
    new THREE.Vector3(0.4, -0.05, 1.7)
  ]

  group.userData.collisionRadius = 1.4
  return group
}

// Enemy geometries by type
export function createDroneGeometry() {
  const group = new THREE.Group()

  // Simple octahedron-like drone
  const bodyGeo = new THREE.OctahedronGeometry(0.5, 0)
  const body = new THREE.Mesh(bodyGeo)
  group.add(body)

  // Four small wings
  const wingGeo = new THREE.BoxGeometry(1.2, 0.05, 0.3)
  for (let i = 0; i < 4; i++) {
    const wing = new THREE.Mesh(wingGeo)
    wing.rotation.y = (i * Math.PI) / 2
    group.add(wing)
  }

  group.userData.collisionRadius = 0.6
  group.userData.type = 'drone'
  group.userData.scoreValue = 10
  group.userData.health = 1

  return group
}

export function createInterceptorGeometry() {
  const group = new THREE.Group()

  // Sleek arrow shape
  const bodyGeo = new THREE.ConeGeometry(0.3, 2.5, 6)
  bodyGeo.rotateX(Math.PI / 2)
  const body = new THREE.Mesh(bodyGeo)
  group.add(body)

  // Swept wings
  const wingGeo = new THREE.BoxGeometry(3, 0.06, 1)
  const wing = new THREE.Mesh(wingGeo)
  wing.position.z = 0.3
  wing.rotation.z = -0.4
  group.add(wing)

  // Vertical fins
  const finGeo = new THREE.BoxGeometry(0.06, 0.6, 0.5)
  const leftFin = new THREE.Mesh(finGeo)
  leftFin.position.set(-1, 0.2, 0.8)
  group.add(leftFin)

  const rightFin = new THREE.Mesh(finGeo)
  rightFin.position.set(1, 0.2, 0.8)
  group.add(rightFin)

  group.userData.gunPositions = [new THREE.Vector3(0, 0, -1.2)]
  group.userData.collisionRadius = 0.8
  group.userData.type = 'interceptor'
  group.userData.scoreValue = 25
  group.userData.health = 2

  return group
}

export function createBomberGeometry() {
  const group = new THREE.Group()

  // Chunky body
  const bodyGeo = new THREE.BoxGeometry(1.2, 0.8, 3)
  const body = new THREE.Mesh(bodyGeo)
  group.add(body)

  // Large wings
  const wingGeo = new THREE.BoxGeometry(5, 0.1, 1.8)
  const wing = new THREE.Mesh(wingGeo)
  wing.position.z = -0.2
  group.add(wing)

  // Twin tail
  const tailGeo = new THREE.BoxGeometry(0.15, 1, 0.5)
  for (const x of [-1.2, 1.2]) {
    const tail = new THREE.Mesh(tailGeo)
    tail.position.set(x, 0.5, 1.5)
    group.add(tail)
  }

  // Bomb bay (visual)
  const bayGeo = new THREE.BoxGeometry(0.6, 0.2, 1)
  const bay = new THREE.Mesh(bayGeo)
  bay.position.set(0, -0.5, 0)
  group.add(bay)

  group.userData.collisionRadius = 1.5
  group.userData.type = 'bomber'
  group.userData.scoreValue = 50
  group.userData.health = 5

  return group
}

export function createAceGeometry() {
  const group = new THREE.Group()

  // Advanced fighter shape - like player but sharper
  const bodyGeo = new THREE.ConeGeometry(0.35, 3, 8)
  bodyGeo.rotateX(Math.PI / 2)
  const body = new THREE.Mesh(bodyGeo)
  group.add(body)

  // Canopy
  const canopyGeo = new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)
  canopyGeo.scale(1, 0.5, 1.3)
  canopyGeo.rotateX(Math.PI / 2)
  const canopy = new THREE.Mesh(canopyGeo)
  canopy.position.set(0, 0.2, -0.4)
  group.add(canopy)

  // Swept wings
  const wingGeo = new THREE.BoxGeometry(4, 0.08, 1.3)
  const wing = new THREE.Mesh(wingGeo)
  wing.position.z = 0
  wing.rotation.z = -0.5
  group.add(wing)

  // Single vertical tail
  const tailGeo = new THREE.BoxGeometry(0.1, 1, 0.7)
  const tail = new THREE.Mesh(tailGeo)
  tail.position.set(0, 0.5, 1.3)
  group.add(tail)

  group.userData.gunPositions = [
    new THREE.Vector3(-0.5, 0, -1.3),
    new THREE.Vector3(0.5, 0, -1.3)
  ]
  group.userData.collisionRadius = 1.0
  group.userData.type = 'ace'
  group.userData.scoreValue = 100
  group.userData.health = 3

  return group
}

// Factory function
export function createEnemyGeometry(type) {
  switch (type) {
    case 'drone': return createDroneGeometry()
    case 'interceptor': return createInterceptorGeometry()
    case 'bomber': return createBomberGeometry()
    case 'ace': return createAceGeometry()
    default: return createDroneGeometry()
  }
}

// Projectile geometry
export function createBulletGeometry() {
  const geo = new THREE.CapsuleGeometry(0.05, 0.3, 4, 8)
  geo.rotateX(Math.PI / 2)
  return geo
}

// Explosion debris geometry
export function createDebrisGeometry() {
  const geo = new THREE.TetrahedronGeometry(0.15, 0)
  return geo
}

// Starfield geometry
export function createStarfieldGeometry(count = 3000, radius = 500) {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const vec = new THREE.Vector3()
    randomVec3(radius, vec)
    positions[i * 3] = vec.x
    positions[i * 3 + 1] = vec.y
    positions[i * 3 + 2] = vec.z

    // Slight color variation
    const colorChoice = Math.random()
    if (colorChoice < 0.4) {
      colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1
    } else if (colorChoice < 0.7) {
      colors[i * 3] = 1; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.7
    } else {
      colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1
    }

    sizes[i] = Math.random() * 2 + 0.5
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  return geo
}

// Sample elevation for terrain collision
export function getTerrainHeight(x, z) {
  const mountain = Math.sin(x * 0.008) * Math.cos(z * 0.008) * 28
  const ridge = Math.sin(x * 0.02 + z * 0.015) * 12
  const detail = Math.sin(x * 0.06) * Math.cos(z * 0.06) * 3
  return -50 + mountain + ridge + detail
}

// High-density realistic smooth terrain geometry
export function createTerrainGeometry(width = 2000, depth = 2000, segments = 128) {
  const geo = new THREE.PlaneGeometry(width, depth, segments, segments)
  geo.rotateX(-Math.PI / 2)

  const positions = geo.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)
    const mountain = Math.sin(x * 0.008) * Math.cos(z * 0.008) * 28
    const ridge = Math.sin(x * 0.02 + z * 0.015) * 12
    const detail = Math.sin(x * 0.06) * Math.cos(z * 0.06) * 3
    positions.setY(i, mountain + ridge + detail)
  }
  geo.computeVertexNormals()

  return geo
}

// Muzzle flash geometry (plane facing camera)
export function createMuzzleFlashGeometry() {
  return new THREE.PlaneGeometry(0.5, 0.5)
}

// Particle geometry for explosions
export function createParticleGeometry(count = 100) {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const lifetimes = new Float32Array(count)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
  geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  return geo
}

// Trail/ribbon geometry for engine trails
export function createTrailGeometry(maxPoints = 50) {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(maxPoints * 3 * 2) // Two ribbon edges
  const uvs = new Float32Array(maxPoints * 2 * 2)
  const alphas = new Float32Array(maxPoints * 2)

  // Triangle indices connecting consecutive ribbon segments
  // Each segment (pair of points) forms a quad = 2 triangles
  const indices = []
  for (let i = 0; i < maxPoints - 1; i++) {
    const a = i * 2
    const b = i * 2 + 1
    const c = (i + 1) * 2
    const d = (i + 1) * 2 + 1
    indices.push(a, b, c)
    indices.push(b, d, c)
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
  geo.setIndex(indices)
  geo.setDrawRange(0, 0)

  return geo
}
