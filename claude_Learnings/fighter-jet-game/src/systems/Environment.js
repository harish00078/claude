import * as THREE from 'three'
import { createStarfieldGeometry, createTerrainGeometry } from '../utils/geometry'
import { createStarfieldMaterial, createTerrainMaterial, createSkyMaterial } from '../utils/materials'

export class Environment {
  constructor(scene) {
    this.scene = scene

    this.starfield = null
    this.terrain = null
    this.skySphere = null
    this.lights = []

    // Terrain scrolling
    this.terrainSegments = 64
    this.terrainSize = 2000
    this.terrainTiles = []
    this.tileSize = 1000

    this.init()
  }

  init() {
    this.createLighting()
    this.createStarfield()
    this.createTerrain()
    this.createSky()
  }

  createLighting() {
    const ambient = new THREE.AmbientLight(0x8fb3ff, 0.45)

    const sun = new THREE.DirectionalLight(0xfff1c4, 1.8)
    sun.position.set(80, 120, 40)

    const fill = new THREE.HemisphereLight(0x88aaff, 0x1a3a2a, 0.8)

    this.lights.push(ambient, sun, fill)
    this.lights.forEach(light => this.scene.add(light))
  }

  createStarfield() {
    const geo = createStarfieldGeometry(4000, 800)
    const mat = createStarfieldMaterial()

    this.starfield = new THREE.Points(geo, mat)
    this.scene.add(this.starfield)
  }

  createTerrain() {
    // Create a few terrain tiles that we'll recycle
    const tileCount = 4

    for (let i = 0; i < tileCount; i++) {
      const geo = createTerrainGeometry(this.tileSize, this.tileSize, 32)
      const mat = createTerrainMaterial()

      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = -50
      mesh.position.z = -i * this.tileSize
      mesh.receiveShadow = true

      this.scene.add(mesh)
      this.terrainTiles.push(mesh)
    }
  }

  createSky() {
    // Large sphere for sky gradient
    const geo = new THREE.SphereGeometry(1000, 32, 16)
    geo.scale(-1, 1, 1) // Invert normals for inside view
    const mat = createSkyMaterial()

    this.skySphere = new THREE.Mesh(geo, mat)
    this.scene.add(this.skySphere)
  }

  update(deltaTime, playerPosition, playerSpeed) {
    this.updateStarfield(deltaTime, playerPosition, playerSpeed)
    this.updateTerrain(playerPosition)
    this.updateSky(playerPosition)
  }

  updateStarfield(deltaTime, playerPosition, playerSpeed) {
    if (!this.starfield) return

    // Move starfield with player (parallax)
    const positions = this.starfield.geometry.attributes.position.array
    const count = positions.length / 3

    // Slow parallax movement
    const parallaxSpeed = playerSpeed * 0.01

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 2] += parallaxSpeed * deltaTime

      // Wrap stars that pass the camera
      if (positions[i * 3 + 2] > playerPosition.z + 400) {
        positions[i * 3 + 2] -= 800
        // Randomize X/Y slightly for variety
        positions[i * 3] += (Math.random() - 0.5) * 10
        positions[i * 3 + 1] += (Math.random() - 0.5) * 10
      }
    }

    this.starfield.geometry.attributes.position.needsUpdate = true
  }

  updateTerrain(playerPosition) {
    // Scroll terrain tiles based on player Z position
    const playerTileIndex = Math.floor(-playerPosition.z / this.tileSize)

    for (let i = 0; i < this.terrainTiles.length; i++) {
      const tile = this.terrainTiles[i]
      const targetTileIndex = playerTileIndex + i - 1

      tile.position.z = -targetTileIndex * this.tileSize

      // Add subtle height variation based on position for infinite variety
      // This is handled in the geometry creation with noise functions
    }
  }

  updateSky(playerPosition) {
    if (!this.skySphere) return

    // Sky sphere follows player horizontally but stays fixed vertically
    this.skySphere.position.x = playerPosition.x
    this.skySphere.position.z = playerPosition.z
    this.skySphere.position.y = 0

    // Update sun direction uniform for time-of-day effect
    if (this.skySphere.material.uniforms) {
      const time = Date.now() * 0.0001
      this.skySphere.material.uniforms.sunDirection.value.set(
        Math.sin(time) * 0.5,
        0.5,
        -Math.cos(time) * 0.7
      ).normalize()
    }
  }

  dispose() {
    this.lights.forEach(light => this.scene.remove(light))
    this.lights = []

    if (this.starfield) {
      this.scene.remove(this.starfield)
      this.starfield.geometry.dispose()
      this.starfield.material.dispose()
    }

    this.terrainTiles.forEach(tile => {
      this.scene.remove(tile)
      tile.geometry.dispose()
      tile.material.dispose()
    })

    if (this.skySphere) {
      this.scene.remove(this.skySphere)
      this.skySphere.geometry.dispose()
      this.skySphere.material.dispose()
    }
  }
}
