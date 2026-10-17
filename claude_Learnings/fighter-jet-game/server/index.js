import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

const PORT = process.env.PORT || 3001

// Connected players state
const players = new Map()

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`)

  // Register new player
  socket.on('joinGame', (playerData) => {
    const player = {
      id: socket.id,
      name: playerData?.name || `Pilot-${socket.id.slice(0, 4)}`,
      position: playerData?.position || { x: 0, y: 10, z: 0 },
      quaternion: playerData?.quaternion || { x: 0, y: 0, z: 0, w: 1 },
      speed: playerData?.speed || 0,
      health: playerData?.health || 3,
      score: 0
    }

    players.set(socket.id, player)

    // Send current players list to the newly connected player
    socket.emit('initPlayers', Array.from(players.values()))

    // Broadcast new player join to all other players
    socket.broadcast.emit('playerJoined', player)
  })

  // Synchronize player position/quaternion
  socket.on('updateState', (state) => {
    const player = players.get(socket.id)
    if (player) {
      player.position = state.position
      player.quaternion = state.quaternion
      player.speed = state.speed
      player.health = state.health

      // Broadcast position update to all other connected clients
      socket.broadcast.emit('playerStateUpdate', {
        id: socket.id,
        position: state.position,
        quaternion: state.quaternion,
        speed: state.speed,
        health: state.health
      })
    }
  })

  // Handle firing weapons
  socket.on('fireWeapon', (data) => {
    socket.broadcast.emit('remoteFired', {
      id: socket.id,
      position: data.position,
      direction: data.direction
    })
  })

  // Handle player damage
  socket.on('playerHit', (data) => {
    io.to(data.targetId).emit('takeDamage', {
      damage: data.damage,
      shooterId: socket.id
    })
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`)
    players.delete(socket.id)
    io.emit('playerLeft', socket.id)
  })
})

httpServer.listen(PORT, () => {
  console.log(`🎮 Fighter Jet Multiplayer Server running on port ${PORT}`)
})
