import { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import GameCanvas from './components/GameCanvas'
import HUD from './components/HUD'
import { SimulatorHUD } from './components/SimulatorHUD'
import StartScreen from './components/StartScreen'
import GameOverScreen from './components/GameOverScreen'
import { MobileControls } from './components/MobileControls'

const GAME_STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over'
}

function App() {
  const [gameState, setGameState] = useState(GAME_STATES.MENU)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [lives, setLives] = useState(3)
  const [boostRatio, setBoostRatio] = useState(1)
  const [speedRatio, setSpeedRatio] = useState(0)
  const [combo, setCombo] = useState(0)
  const [touchInput, setTouchInput] = useState({ up: false, down: false, left: false, right: false, boost: false, fire: false })

  // Flight Sim Telemetry State
  const [airspeed, setAirspeed] = useState(80)
  const [altitude, setAltitude] = useState(500)
  const [throttle, setThrottle] = useState(60)
  const [isStalled, setIsStalled] = useState(false)
  const [cameraMode, setCameraMode] = useState('cockpit')

  // Refs for game systems (initialized in GameCanvas)
  const gameSystemsRef = useRef(null)

  // Telemetry loop for HUD
  useEffect(() => {
    if (gameState !== GAME_STATES.PLAYING) return
    const interval = setInterval(() => {
      if (gameSystemsRef.current) {
        setAirspeed(gameSystemsRef.current.getAirspeedKnots() || 0)
        setAltitude(gameSystemsRef.current.getAltitudeFeet() || 0)
        setThrottle(gameSystemsRef.current.getThrottlePercent() || 0)
        setIsStalled(gameSystemsRef.current.isStalled() || false)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [gameState])

  // Key C camera mode toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'c' && gameState === GAME_STATES.PLAYING) {
        if (gameSystemsRef.current) {
          const newMode = gameSystemsRef.current.toggleCameraMode()
          setCameraMode(newMode)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fighterJetHighScore')
      if (saved) setHighScore(parseInt(saved, 10) || 0)
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (gameSystemsRef.current?.camera) {
        gameSystemsRef.current.camera.aspect = window.innerWidth / window.innerHeight
        gameSystemsRef.current.camera.updateProjectionMatrix()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Game state callbacks from GameCanvas
  const onScoreChange = useCallback((newScore) => {
    setScore(newScore)
  }, [])

  const onHighScoreChange = useCallback((newHighScore) => {
    setHighScore(newHighScore)
  }, [])

  const onWaveChange = useCallback((newWave) => {
    setWave(newWave)
  }, [])

  const onLivesChange = useCallback((newLives) => {
    setLives(newLives)
  }, [])

  const onBoostChange = useCallback((ratio) => {
    setBoostRatio(ratio)
  }, [])

  const onSpeedChange = useCallback((ratio) => {
    setSpeedRatio(ratio)
  }, [])

  const onComboChange = useCallback((c) => {
    setCombo(c)
  }, [])

  const onGameOver = useCallback((finalScore) => {
    setGameState(GAME_STATES.GAME_OVER)
  }, [])

  const startGame = useCallback(() => {
    setGameState(GAME_STATES.PLAYING)
    setScore(0)
    setWave(1)
    setLives(3)
    setCombo(0)
    if (gameSystemsRef.current) {
      gameSystemsRef.current.startGame()
    }
  }, [])

  const restartGame = useCallback(() => {
    startGame()
  }, [startGame])

  const togglePause = useCallback(() => {
    if (gameState === GAME_STATES.PLAYING) {
      setGameState(GAME_STATES.PAUSED)
      gameSystemsRef.current?.pause()
    } else if (gameState === GAME_STATES.PAUSED) {
      setGameState(GAME_STATES.PLAYING)
      gameSystemsRef.current?.resume()
    }
  }, [gameState])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={gameSystemsRef.current?.camera}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: false }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onCreated={({ gl, camera }) => {
          // Store renderer reference if needed
        }}
      >
        <GameCanvas
          ref={gameSystemsRef}
          gameState={gameState}
          touchInput={touchInput}
          onScoreChange={onScoreChange}
          onHighScoreChange={onHighScoreChange}
          onWaveChange={onWaveChange}
          onLivesChange={onLivesChange}
          onBoostChange={onBoostChange}
          onSpeedChange={onSpeedChange}
          onComboChange={onComboChange}
          onGameOver={onGameOver}
          onPause={togglePause}
        />
      </Canvas>

      {/* UI Overlays - rendered outside Canvas for DOM overlay */}
      {gameState === GAME_STATES.PLAYING && (
        <>
          <MobileControls onInputChange={setTouchInput} />
          <SimulatorHUD
            airspeed={airspeed}
            altitude={altitude}
            throttle={throttle}
            isStalled={isStalled}
            cameraMode={cameraMode}
            onToggleCamera={() => {
              if (gameSystemsRef.current) {
                const newMode = gameSystemsRef.current.toggleCameraMode()
                setCameraMode(newMode)
              }
            }}
            gameState={gameState}
          />
        </>
      )}

      <HUD
        score={score}
        highScore={highScore}
        wave={wave}
        lives={lives}
        boostRatio={boostRatio}
        speedRatio={speedRatio}
        combo={combo}
        gameState={gameState}
      />

      {gameState === GAME_STATES.MENU && (
        <StartScreen onStart={startGame} highScore={highScore} />
      )}

      {gameState === GAME_STATES.PAUSED && (
        <div className="pause-overlay">
          <div className="pause-menu">
            <h2>PAUSED</h2>
            <p>Press ESC to resume</p>
          </div>
        </div>
      )}

      {gameState === GAME_STATES.GAME_OVER && (
        <GameOverScreen
          finalScore={score}
          highScore={highScore}
          wave={wave}
          enemiesDestroyed={gameSystemsRef.current?.getEnemiesDestroyed?.() || 0}
          accuracy={gameSystemsRef.current?.getAccuracy?.() || 0}
          onRestart={restartGame}
          onMenu={() => setGameState(GAME_STATES.MENU)}
        />
      )}

      <style>{`
        .pause-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          color: white;
          font-family: 'Orbitron', 'Arial', sans-serif;
        }
        .pause-menu {
          text-align: center;
          padding: 2rem;
          background: rgba(20, 30, 50, 0.9);
          border: 2px solid #ff6b35;
          border-radius: 8px;
          box-shadow: 0 0 30px rgba(255, 107, 53, 0.3);
        }
        .pause-menu h2 {
          margin: 0 0 1rem;
          font-size: 2.5rem;
          color: #ff6b35;
          text-shadow: 0 0 20px #ff6b35;
        }
      `}</style>
    </div>
  )
}

export default App
