import { useRef, useEffect, forwardRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PlayerJet } from '../systems/PlayerJet'
import { EnemyManager } from '../systems/EnemyManager'
import { ProjectileSystem } from '../systems/ProjectileSystem'
import { ParticleSystem } from '../systems/ParticleSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { AudioSystem } from '../systems/AudioSystem'
import { Environment } from '../systems/Environment'
import { MultiplayerManager } from '../systems/MultiplayerManager'
import { useGameLoop } from '../hooks/useGameLoop'
import { useKeyboard } from '../hooks/useKeyboard'
import { getTerrainHeight } from '../utils/geometry'
import { MobileControls } from './MobileControls'

const GameCanvas = forwardRef((props, ref) => {
  const {
    gameState,
    touchInput,
    onScoreChange,
    onHighScoreChange,
    onWaveChange,
    onLivesChange,
    onBoostChange,
    onSpeedChange,
    onComboChange,
    onGameOver,
    onPause
  } = props

  const mountedRef = useRef(false)
  const { scene, set } = useThree()

  // Game systems
  const playerJetRef = useRef(null)
  const enemyManagerRef = useRef(null)
  const projectileSystemRef = useRef(null)
  const particleSystemRef = useRef(null)
  const scoreSystemRef = useRef(null)
  const audioSystemRef = useRef(null)
  const environmentRef = useRef(null)
  const multiplayerRef = useRef(null)

  // Keyboard & Touch input
  const keyboard = useKeyboard()
  const touchInputRef = useRef({ up: false, down: false, left: false, right: false, boost: false, fire: false })

  useEffect(() => {
    if (touchInput) {
      touchInputRef.current = touchInput
    }
  }, [touchInput])

  // Initialize systems
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    scene.fog = new THREE.Fog(0x051020, 100, 1000)

    // Initialize systems
    audioSystemRef.current = new AudioSystem()
    scoreSystemRef.current = new ScoreSystem()

    playerJetRef.current = new PlayerJet(scene)
    projectileSystemRef.current = new ProjectileSystem(scene)
    particleSystemRef.current = new ParticleSystem(scene)
    enemyManagerRef.current = new EnemyManager(
      scene,
      projectileSystemRef.current,
      particleSystemRef.current,
      audioSystemRef.current
    )
    environmentRef.current = new Environment(scene)
    multiplayerRef.current = new MultiplayerManager(
      scene,
      projectileSystemRef.current,
      particleSystemRef.current,
      audioSystemRef.current
    )
    multiplayerRef.current.connect()

    set({ camera: playerJetRef.current.getCamera() })

    // Set up callbacks
    // Accuracy tracking (score is added only via onEnemyKilled to avoid double counting)
    projectileSystemRef.current.onPlayerShot = () => {
      scoreSystemRef.current.recordShot()
      if (playerJetRef.current) {
        multiplayerRef.current?.emitFireWeapon(
          playerJetRef.current.getPosition(),
          playerJetRef.current.getForward()
        )
      }
    }
    projectileSystemRef.current.onEnemyHit = () => {
      scoreSystemRef.current.recordHit()
    }

    enemyManagerRef.current.onEnemyKilled = (score, type) => {
      scoreSystemRef.current.addScore(score, type)
      onScoreChange(scoreSystemRef.current.getScore())
      onHighScoreChange(scoreSystemRef.current.getHighScore())
      onComboChange(scoreSystemRef.current.combo)
    }

    enemyManagerRef.current.onWaveComplete = (wave) => {
      onWaveChange(wave)
      if (audioSystemRef.current) audioSystemRef.current.playPowerUp()
    }

    enemyManagerRef.current.startWave(1)
    onHighScoreChange(scoreSystemRef.current.getHighScore())
    audioSystemRef.current.startEngine()

    // Expose methods via ref
    const api = {
      camera: playerJetRef.current.getCamera(),
      startGame: () => {
        scoreSystemRef.current.reset()
        playerJetRef.current.reset()
        projectileSystemRef.current.clearActive()
        particleSystemRef.current.reset()
        enemyManagerRef.current.reset()
        onScoreChange(0)
        onHighScoreChange(scoreSystemRef.current.getHighScore())
        onWaveChange(1)
        onLivesChange(3)
        onComboChange(0)
        onBoostChange(1)
        onSpeedChange(0)
        audioSystemRef.current.startEngine()
      },
      pause: () => {
        audioSystemRef.current.stopEngine()
      },
      resume: () => {
        audioSystemRef.current.startEngine()
      },
      getEnemiesDestroyed: () => scoreSystemRef.current.enemiesDestroyed,
      getAccuracy: () => scoreSystemRef.current.getAccuracy(),
      getAirspeedKnots: () => playerJetRef.current?.getAirspeedKnots() || 0,
      getAltitudeFeet: () => playerJetRef.current?.getAltitudeFeet() || 0,
      getThrottlePercent: () => playerJetRef.current?.getThrottlePercent() || 0,
      isStalled: () => playerJetRef.current?.isStalled || false,
      toggleCameraMode: () => playerJetRef.current?.toggleCameraMode() || 'cockpit',
      dispose: () => {
        playerJetRef.current?.dispose()
        enemyManagerRef.current?.dispose()
        projectileSystemRef.current?.dispose()
        particleSystemRef.current?.dispose()
        environmentRef.current?.dispose()
        audioSystemRef.current?.dispose()
        multiplayerRef.current?.dispose()
        scoreSystemRef.current = null
      }
    }

    if (ref && typeof ref === 'object') {
      ref.current = api
    } else if (typeof ref === 'function') {
      ref(api)
    }

    return () => {
      api.dispose()
      mountedRef.current = false
      if (ref && typeof ref === 'object') {
        ref.current = null
      } else if (typeof ref === 'function') {
        ref(null)
      }
    }
  }, [scene, set])

  // Game loop
  useGameLoop((deltaTime, elapsedTime) => {
    if (gameState !== 'playing') return

    // Update input
    const input = {
      up: keyboard.up || touchInputRef.current.up,
      down: keyboard.down || touchInputRef.current.down,
      left: keyboard.left || touchInputRef.current.left,
      right: keyboard.right || touchInputRef.current.right,
      boost: keyboard.boost || touchInputRef.current.boost,
      fire: keyboard.fire || touchInputRef.current.fire
    }

    if (keyboard.pause) {
      onPause?.()
      keyboard.clearTransient()
      return
    }

    playerJetRef.current?.updateInput(input)

    // Update all systems
    playerJetRef.current?.update(
      deltaTime,
      projectileSystemRef.current,
      particleSystemRef.current,
      audioSystemRef.current
    )

    projectileSystemRef.current?.update(
      deltaTime,
      enemyManagerRef.current,
      particleSystemRef.current,
      audioSystemRef.current,
      playerJetRef.current?.getPosition()
    )

    enemyManagerRef.current?.update(deltaTime)

    particleSystemRef.current?.update(deltaTime)

    environmentRef.current?.update(
      deltaTime,
      playerJetRef.current?.getPosition(),
      playerJetRef.current?.speed || 0
    )

    // Update multiplayer remote player interpolation & emit local state
    if (playerJetRef.current) {
      multiplayerRef.current?.emitLocalState(
        playerJetRef.current.getPosition(),
        playerJetRef.current.quaternion,
        playerJetRef.current.speed,
        playerJetRef.current.health,
        deltaTime
      )
    }
    multiplayerRef.current?.update(deltaTime)

    // Update player data for enemy manager
    if (playerJetRef.current && enemyManagerRef.current) {
      enemyManagerRef.current.setPlayerData(
        playerJetRef.current.getPosition(),
        playerJetRef.current.velocity,
        playerJetRef.current.getForward()
      )
    }

    // Check player collision with enemy bullets
    if (projectileSystemRef.current?.checkPlayerCollision(
      playerJetRef.current.getPosition(),
      playerJetRef.current.group.userData.collisionRadius || 2
    )) {
      const dead = playerJetRef.current.takeDamage(1)
      onLivesChange(playerJetRef.current.getHealth())

      if (audioSystemRef.current) audioSystemRef.current.playHit()
      if (particleSystemRef.current) {
        particleSystemRef.current.spawnHitSparks(playerJetRef.current.getPosition())
        particleSystemRef.current.spawnSmallExplosion(playerJetRef.current.getPosition())
      }

      if (dead) {
        onGameOver(scoreSystemRef.current.getScore())
        audioSystemRef.current?.stopEngine()
      }
    }

    // Check ground collision with terrain
    if (playerJetRef.current) {
      const pos = playerJetRef.current.getPosition()
      const terrainY = getTerrainHeight(pos.x, pos.z)
      if (pos.y <= terrainY + 1.5) {
        pos.y = terrainY + 1.5
        const dead = playerJetRef.current.takeDamage(1)
        onLivesChange(playerJetRef.current.getHealth())

        if (audioSystemRef.current) audioSystemRef.current.playExplosion()
        if (particleSystemRef.current) {
          particleSystemRef.current.spawnExplosion(pos, 'large')
        }

        if (dead) {
          onGameOver(scoreSystemRef.current.getScore())
          audioSystemRef.current?.stopEngine()
        }
      }
    }

    // Check missile collision with player
    if (projectileSystemRef.current?.checkMissilePlayerCollision(
      playerJetRef.current.getPosition(),
      playerJetRef.current.group.userData.collisionRadius
    )) {
      const dead = playerJetRef.current.takeDamage(2)
      onLivesChange(playerJetRef.current.getHealth())

      if (audioSystemRef.current) audioSystemRef.current.playExplosion()
      if (particleSystemRef.current) {
        particleSystemRef.current.spawnExplosion(playerJetRef.current.getPosition(), 'missile')
      }

      if (dead) {
        onGameOver(scoreSystemRef.current.getScore())
        audioSystemRef.current.stopEngine()
      }
    }

    // Check mine collision with player
    const minePos = projectileSystemRef.current?.checkMinePlayerCollision(
      playerJetRef.current.getPosition(),
      playerJetRef.current.group.userData.collisionRadius
    )
    if (minePos) {
      const dead = playerJetRef.current.takeDamage(2)
      onLivesChange(playerJetRef.current.getHealth())

      if (audioSystemRef.current) audioSystemRef.current.playExplosion()
      if (particleSystemRef.current) {
        particleSystemRef.current.spawnExplosion(minePos, 'missile')
      }

      if (dead) {
        onGameOver(scoreSystemRef.current.getScore())
        audioSystemRef.current.stopEngine()
      }
    }

    // Update engine sound
    if (audioSystemRef.current && playerJetRef.current) {
      audioSystemRef.current.updateEngine(
        playerJetRef.current.getSpeedRatio(),
        playerJetRef.current.input.boost
      )
    }

    // Update HUD values
    onBoostChange(playerJetRef.current?.getBoostRatio() || 0)
    onSpeedChange(playerJetRef.current?.getSpeedRatio() || 0)
    keyboard.clearTransient()

  }, [], gameState !== 'playing')

  return null
})

GameCanvas.displayName = 'GameCanvas'

export default GameCanvas
