import { io } from 'socket.io-client'
import * as THREE from 'three'
import { createJetGeometry } from '../utils/geometry'
import { createJetMaterials } from '../utils/materials'

export class MultiplayerManager {
  constructor(scene, projectileSystem, particleSystem, audioSystem) {
    this.scene = scene
    this.projectileSystem = projectileSystem
    this.particleSystem = particleSystem
    this.audioSystem = audioSystem

    this.socket = null
    this.isConnected = false
    this.localPlayerId = null

    // Map of remote player ID -> { mesh, targetPosition, targetQuaternion, currentPosition, currentQuaternion }
    this.remotePlayers = new Map()

    // Shared materials for remote jets
    this.remoteMaterials = createJetMaterials()

    // Emitted state rate limiting
    this.updateInterval = 0.05 // 20 updates per second (50ms)
    this.updateTimer = 0
  }

  connect(serverUrl = 'http://localhost:3001') {
    try {
      this.socket = io(serverUrl, {
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 5000
      })

      this.socket.on('connect', () => {
        this.isConnected = true
        this.localPlayerId = this.socket.id
        console.log('🌐 Connected to Fighter Jet Multiplayer Server!', this.socket.id)

        this.socket.emit('joinGame', {
          position: { x: 0, y: 10, z: 0 },
          quaternion: { x: 0, y: 0, z: 0, w: 1 }
        })
      })

      this.socket.on('initPlayers', (players) => {
        players.forEach(p => {
          if (p.id !== this.localPlayerId) {
            this.addRemotePlayer(p)
          }
        })
      })

      this.socket.on('playerJoined', (p) => {
        if (p.id !== this.localPlayerId) {
          this.addRemotePlayer(p)
        }
      })

      this.socket.on('playerStateUpdate', (state) => {
        const remote = this.remotePlayers.get(state.id)
        if (remote) {
          remote.targetPosition.set(state.position.x, state.position.y, state.position.z)
          remote.targetQuaternion.set(
            state.quaternion.x,
            state.quaternion.y,
            state.quaternion.z,
            state.quaternion.w
          )
          remote.speed = state.speed || 0
        }
      })

      this.socket.on('remoteFired', (data) => {
        if (data.id === this.localPlayerId) return
        const pos = new THREE.Vector3(data.position.x, data.position.y, data.position.z)
        const dir = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z)

        if (this.projectileSystem) {
          this.projectileSystem.spawnEnemyBullet(pos, dir, 120)
        }
        if (this.particleSystem) {
          this.particleSystem.spawnMuzzleFlash(pos, dir)
        }
        if (this.audioSystem) {
          this.audioSystem.playEnemyShoot()
        }
      })

      this.socket.on('playerLeft', (id) => {
        this.removeRemotePlayer(id)
      })

      this.socket.on('disconnect', () => {
        this.isConnected = false
        console.log('Disconnected from multiplayer server')
      })

      this.socket.on('connect_error', (err) => {
        this.isConnected = false
        console.warn('Multiplayer server connection failed (playing offline):', err.message)
      })
    } catch (err) {
      console.warn('Socket initialization failed:', err)
    }
  }

  addRemotePlayer(playerData) {
    if (this.remotePlayers.has(playerData.id)) return

    const group = createJetGeometry()
    
    // Tint remote jet slightly (e.g. red canopy / wing strip) for clear identification
    group.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry.type.toLowerCase().includes('cone')) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x3388ff,
            metalness: 0.8,
            roughness: 0.2
          })
        } else {
          child.material = this.remoteMaterials.body
        }
      }
    })

    const initialPos = new THREE.Vector3(
      playerData.position.x,
      playerData.position.y,
      playerData.position.z
    )
    const initialQuat = new THREE.Quaternion(
      playerData.quaternion.x,
      playerData.quaternion.y,
      playerData.quaternion.z,
      playerData.quaternion.w
    )

    group.position.copy(initialPos)
    group.quaternion.copy(initialQuat)
    this.scene.add(group)

    this.remotePlayers.set(playerData.id, {
      id: playerData.id,
      mesh: group,
      targetPosition: initialPos.clone(),
      targetQuaternion: initialQuat.clone(),
      currentPosition: initialPos.clone(),
      currentQuaternion: initialQuat.clone(),
      speed: 0
    })

    console.log(`✈️ Remote player joined: ${playerData.id}`)
  }

  removeRemotePlayer(id) {
    const remote = this.remotePlayers.get(id)
    if (remote) {
      this.scene.remove(remote.mesh)
      remote.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
      })
      this.remotePlayers.delete(id)
      console.log(`✈️ Remote player left: ${id}`)
    }
  }

  emitLocalState(position, quaternion, speed, health, deltaTime) {
    if (!this.isConnected || !this.socket) return

    this.updateTimer += deltaTime
    if (this.updateTimer >= this.updateInterval) {
      this.updateTimer = 0

      this.socket.emit('updateState', {
        position: { x: position.x, y: position.y, z: position.z },
        quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
        speed: speed,
        health: health
      })
    }
  }

  emitFireWeapon(position, direction) {
    if (!this.isConnected || !this.socket) return

    this.socket.emit('fireWeapon', {
      position: { x: position.x, y: position.y, z: position.z },
      direction: { x: direction.x, y: direction.y, z: direction.z }
    })
  }

  update(deltaTime) {
    // Lerp/Slerp remote player positions & quaternions for 60FPS fluid motion
    const lerpFactor = 1 - Math.exp(-15 * deltaTime)

    this.remotePlayers.forEach((remote) => {
      remote.currentPosition.lerp(remote.targetPosition, lerpFactor)
      remote.currentQuaternion.slerp(remote.targetQuaternion, lerpFactor)

      remote.mesh.position.copy(remote.currentPosition)
      remote.mesh.quaternion.copy(remote.currentQuaternion)
    })
  }

  getRemoteCount() {
    return this.remotePlayers.size
  }

  dispose() {
    this.remotePlayers.forEach((remote) => {
      this.scene.remove(remote.mesh)
    })
    this.remotePlayers.clear()
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}
