import { useEffect, useRef } from 'react'

export default function GameOverScreen({
  finalScore,
  highScore,
  wave,
  enemiesDestroyed,
  accuracy,
  onRestart,
  onMenu
}) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const isNewHighScore = finalScore >= highScore && finalScore > 0

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

      drawStars(ctx, width, height, time)
      drawExplosionRing(ctx, width / 2, height / 2 - 100, time)

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
      onRestart()
    } else if (e.code === 'Escape') {
      onMenu()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onRestart, onMenu])

  return (
    <div className="game-over-screen" onClick={onRestart}>
      <canvas ref={canvasRef} className="bg-canvas" />

      <div className="content">
        <div className="game-over-title">
          <span className="title-main">GAME OVER</span>
          {isNewHighScore && <span className="new-record">NEW HIGH SCORE!</span>}
        </div>

        <div className="stats-grid">
          <div className="stat-card final-score">
            <span className="stat-label">FINAL SCORE</span>
            <span className="stat-value">{finalScore.toLocaleString()}</span>
          </div>
          <div className="stat-card high-score">
            <span className="stat-label">HIGH SCORE</span>
            <span className="stat-value">{highScore.toLocaleString()}</span>
          </div>
          <div className="stat-card waves">
            <span className="stat-label">WAVES SURVIVED</span>
            <span className="stat-value">{wave}</span>
          </div>
          <div className="stat-card enemies">
            <span className="stat-label">ENEMIES DESTROYED</span>
            <span className="stat-value">{enemiesDestroyed}</span>
          </div>
          <div className="stat-card accuracy">
            <span className="stat-label">ACCURACY</span>
            <span className="stat-value">{accuracy}%</span>
          </div>
        </div>

        <div className="buttons">
          <button className="btn restart" onClick={(e) => { e.stopPropagation(); onRestart() }}>
            <span>▶ PLAY AGAIN</span>
            <kbd>SPACE</kbd>
          </button>
          <button className="btn menu" onClick={(e) => { e.stopPropagation(); onMenu() }}>
            <span>⌂ MAIN MENU</span>
            <kbd>ESC</kbd>
          </button>
        </div>
      </div>

      <style>{`
        .game-over-screen {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #051020;
          z-index: 100;
          font-family: 'Orbitron', 'Courier New', monospace;
          color: #e8f0ff;
          cursor: default;
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
          max-width: 600px;
          padding: 2rem;
        }

        .game-over-title {
          margin-bottom: 2rem;
        }

        .title-main {
          font-size: 4rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #ff3333;
          text-shadow:
            0 0 20px #ff3333,
            0 0 40px #ff6b35;
          display: block;
        }

        .new-record {
          display: block;
          font-size: 1.25rem;
          letter-spacing: 0.2em;
          color: #ffdd00;
          text-shadow: 0 0 20px #ffdd00;
          margin-top: 0.5rem;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin: 2rem 0;
        }

        .stat-card {
          background: linear-gradient(135deg, rgba(5, 16, 32, 0.9), rgba(10, 30, 60, 0.8));
          border: 1px solid rgba(255, 107, 53, 0.2);
          border-radius: 8px;
          padding: 1.25rem 1rem;
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          border-color: rgba(255, 107, 53, 0.5);
          box-shadow: 0 0 20px rgba(255, 107, 53, 0.2);
        }

        .stat-card.final-score { border-color: rgba(255, 221, 0, 0.4); }
        .stat-card.high-score { border-color: rgba(255, 107, 53, 0.4); }
        .stat-card.waves { border-color: rgba(0, 255, 170, 0.4); }
        .stat-card.enemies { border-color: rgba(255, 107, 53, 0.4); }
        .stat-card.accuracy { border-color: rgba(136, 170, 255, 0.4); }

        .stat-label {
          display: block;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #88aaff;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #fff;
        }

        .stat-card.final-score .stat-value { color: #ffdd00; text-shadow: 0 0 15px #ffdd00; }
        .stat-card.high-score .stat-value { color: #ff6b35; text-shadow: 0 0 15px #ff6b35; }
        .stat-card.waves .stat-value { color: #00ffaa; text-shadow: 0 0 15px #00ffaa; }
        .stat-card.enemies .stat-value { color: #ff6b35; text-shadow: 0 0 15px #ff6b35; }
        .stat-card.accuracy .stat-value { color: #88aaff; text-shadow: 0 0 15px #88aaff; }

        .buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          font-family: inherit;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          border: 2px solid;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn.restart {
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 221, 0, 0.1));
          border-color: #ff6b35;
          color: #fff;
        }

        .btn.restart:hover {
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.4), rgba(255, 221, 0, 0.2));
          box-shadow: 0 0 25px rgba(255, 107, 53, 0.5);
        }

        .btn.menu {
          background: rgba(255, 255, 255, 0.05);
          border-color: #88aaff;
          color: #88aaff;
        }

        .btn.menu:hover {
          background: rgba(136, 170, 255, 0.1);
          box-shadow: 0 0 25px rgba(136, 170, 255, 0.3);
          color: #fff;
        }

        .btn kbd {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          padding: 0.15rem 0.5rem;
          font-family: inherit;
          font-size: 0.7rem;
          color: #ffdd00;
        }

        @media (max-width: 600px) {
          .title-main { font-size: 2.5rem; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .buttons { flex-direction: column; }
          .btn { justify-content: center; }
        }
      `}</style>
    </div>
  )
}

function drawStars(ctx, width, height, time) {
  ctx.save()
  for (let i = 0; i < 150; i++) {
    const x = (i * 73.14) % width
    const y = (i * 137.43) % height
    const phase = (i * 0.1 + time) % 2
    const alpha = 0.2 + 0.5 * Math.abs(Math.sin(phase * Math.PI))
    const size = 1 + (i % 3)

    ctx.globalAlpha = alpha
    ctx.fillStyle = i % 5 === 0 ? '#ff6b35' : (i % 3 === 0 ? '#ff3333' : '#fff')
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawExplosionRing(ctx, cx, cy, time) {
  ctx.save()
  for (let ring = 0; ring < 5; ring++) {
    const radius = (time * 100 + ring * 50) % 300
    const alpha = Math.max(0, 1 - radius / 300) * 0.3
    ctx.globalAlpha = alpha
    ctx.strokeStyle = ring % 2 === 0 ? '#ffdd00' : '#ff6b35'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}
