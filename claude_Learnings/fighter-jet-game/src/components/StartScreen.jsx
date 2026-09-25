import { useEffect, useRef } from 'react'

export default function StartScreen({ onStart, highScore }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let time = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      time += 0.016

      const { width, height } = canvas
      ctx.fillStyle = '#051020'
      ctx.fillRect(0, 0, width, height)

      // Draw animated background
      drawStars(ctx, width, height, time)
      drawGrid(ctx, width, height, time)
      drawParticles(ctx, width, height, time)

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const handleKeyDown = (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault()
      onStart()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onStart])

  return (
    <div className="start-screen" onClick={onStart}>
      <canvas ref={canvasRef} className="bg-canvas" />

      <div className="content">
        <div className="logo">
          <span className="logo-icon">✈</span>
          <h1 className="title">FIGHTER JET</h1>
          <span className="subtitle">ENDLESS SURVIVAL</span>
        </div>

        <div className="high-score-display">
          HIGH SCORE: <span>{highScore.toLocaleString()}</span>
        </div>

        <button className="start-btn" onClick={onStart}>
          <span className="btn-text">PRESS SPACE TO START</span>
          <span className="btn-hint">Click or press SPACE / ENTER</span>
        </button>

        <div className="controls">
          <h3>CONTROLS</h3>
          <div className="control-grid">
            <div className="control-item">
              <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd>
              <span>Steer</span>
            </div>
            <div className="control-item">
              <kbd>Shift</kbd>
              <span>Boost</span>
            </div>
            <div className="control-item">
              <kbd>Space</kbd>
              <span>Fire</span>
            </div>
            <div className="control-item">
              <kbd>Esc</kbd>
              <span>Pause</span>
            </div>
          </div>
        </div>

        <div className="enemies-preview">
          <h3>ENEMY TYPES</h3>
          <div className="enemy-list">
            <div className="enemy-item">
              <span className="enemy-color drone"></span>
              <span>Drone</span>
              <span className="enemy-score">10 pts</span>
            </div>
            <div className="enemy-item">
              <span className="enemy-color interceptor"></span>
              <span>Interceptor</span>
              <span className="enemy-score">25 pts</span>
            </div>
            <div className="enemy-item">
              <span className="enemy-color bomber"></span>
              <span>Bomber</span>
              <span className="enemy-score">50 pts</span>
            </div>
            <div className="enemy-item">
              <span className="enemy-color ace"></span>
              <span>Ace</span>
              <span className="enemy-score">100 pts</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .start-screen {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #051020;
          z-index: 100;
          font-family: 'Orbitron', 'Courier New', monospace;
          color: #e8f0ff;
          cursor: pointer;
        }

        .bg-canvas {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0;
        }

        .content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 500px;
          padding: 2rem;
        }

        .logo {
          margin-bottom: 1rem;
        }

        .logo-icon {
          font-size: 4rem;
          display: block;
          margin-bottom: 0.5rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }

        .title {
          font-size: 4rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          margin: 0;
          background: linear-gradient(135deg, #fff, #ff6b35, #ffdd00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 60px rgba(255, 107, 53, 0.5);
        }

        .subtitle {
          font-size: 1rem;
          letter-spacing: 0.3em;
          color: #ff6b35;
          text-transform: uppercase;
          display: block;
          margin-top: 0.5rem;
        }

        .high-score-display {
          margin: 1.5rem 0;
          font-size: 1.1rem;
          color: #88aaff;
        }

        .high-score-display span {
          color: #ffdd00;
          font-weight: 700;
          text-shadow: 0 0 10px #ffdd00;
        }

        .start-btn {
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 221, 0, 0.1));
          border: 2px solid #ff6b35;
          border-radius: 8px;
          padding: 1.5rem 3rem;
          font-family: inherit;
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .start-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .start-btn:hover {
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.4), rgba(255, 221, 0, 0.2));
          box-shadow: 0 0 30px rgba(255, 107, 53, 0.5);
          transform: scale(1.02);
        }

        .btn-text {
          display: block;
          animation: blink 1.5s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .btn-hint {
          display: block;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
          color: #88aaff;
          margin-top: 0.5rem;
          opacity: 0.7;
        }

        .controls {
          margin: 2.5rem 0;
          text-align: left;
        }

        .controls h3 {
          font-size: 0.8rem;
          letter-spacing: 0.1em;
          color: #88aaff;
          margin-bottom: 1rem;
          text-transform: uppercase;
        }

        .control-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .control-item {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(255, 107, 53, 0.05);
          border: 1px solid rgba(255, 107, 53, 0.1);
          border-radius: 6px;
        }

        .control-item:first-child {
          grid-column: 1 / -1;
        }

        .control-item kbd {
          background: rgba(255, 107, 53, 0.2);
          border: 1px solid rgba(255, 107, 53, 0.4);
          border-radius: 4px;
          padding: 0.2rem 0.5rem;
          font-family: inherit;
          font-size: 0.75rem;
          color: #ffdd00;
          white-space: nowrap;
        }

        .control-item span:last-child {
          color: #ccc;
          font-size: 0.9rem;
        }

        .enemies-preview {
          margin-top: 2rem;
          text-align: left;
        }

        .enemies-preview h3 {
          font-size: 0.8rem;
          letter-spacing: 0.1em;
          color: #88aaff;
          margin-bottom: 1rem;
          text-transform: uppercase;
        }

        .enemy-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .enemy-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
        }

        .enemy-color {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          box-shadow: 0 0 10px currentColor;
        }

        .enemy-color.drone { background: #cc3333; }
        .enemy-color.interceptor { background: #ffaa00; }
        .enemy-color.bomber { background: #666666; }
        .enemy-color.ace { background: #8800ff; }

        .enemy-item span:nth-child(2) {
          flex: 1;
          font-size: 0.9rem;
        }

        .enemy-score {
          color: #ffdd00;
          font-weight: 700;
          font-size: 0.85rem;
        }

        @media (max-width: 600px) {
          .title { font-size: 2.5rem; }
          .control-grid { grid-template-columns: 1fr; }
          .content { padding: 1rem; }
        }
      `}</style>
    </div>
  )
}

// Background drawing functions
function drawStars(ctx, width, height, time) {
  ctx.save()
  for (let i = 0; i < 200; i++) {
    const x = (i * 73.14) % width
    const y = (i * 137.43) % height
    const phase = (i * 0.1 + time) % 2
    const alpha = 0.3 + 0.7 * Math.abs(Math.sin(phase * Math.PI))
    const size = 1 + (i % 3)

    ctx.globalAlpha = alpha
    ctx.fillStyle = i % 5 === 0 ? '#ffdd00' : (i % 3 === 0 ? '#ff6b35' : '#fff')
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawGrid(ctx, width, height, time) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 107, 53, 0.1)'
  ctx.lineWidth = 1

  const gridSize = 80
  const offset = (time * 30) % gridSize

  // Vertical lines
  for (let x = -offset; x < width + offset; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // Horizontal lines (perspective)
  for (let i = 0; i < 20; i++) {
    const y = height - i * 40 - (time * 100) % 40
    const alpha = 0.05 + 0.1 * (1 - i / 20)
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.moveTo(width * 0.3, y)
    ctx.lineTo(width * 0.7, y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawParticles(ctx, width, height, time) {
  ctx.save()
  for (let i = 0; i < 30; i++) {
    const x = (i * 127.3 + time * 50) % width
    const y = (i * 233.7 + time * 30) % height
    const size = 2 + Math.sin(time + i) * 1.5

    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 2 + i)
    ctx.fillStyle = '#ff6b35'
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
