export default function HUD({
  score,
  highScore,
  wave,
  lives,
  boostRatio,
  speedRatio,
  combo,
  gameState
}) {
  if (gameState === 'menu') return null

  return (
    <div className="hud">
      {/* Top left - Score & Wave */}
      <div className="hud-panel top-left">
        <div className="hud-row">
          <span className="hud-label">SCORE</span>
          <span className="hud-value score">{score.toLocaleString()}</span>
        </div>
        <div className="hud-row">
          <span className="hud-label">HI-SCORE</span>
          <span className="hud-value high-score">{highScore.toLocaleString()}</span>
        </div>
        <div className="hud-row">
          <span className="hud-label">WAVE</span>
          <span className="hud-value wave">{wave}</span>
        </div>
        {combo > 1 && (
          <div className="hud-row combo">
            <span className="hud-label">COMBO</span>
            <span className="hud-value">{combo}x</span>
          </div>
        )}
      </div>

      {/* Top right - Lives */}
      <div className="hud-panel top-right">
        <div className="hud-row">
          <span className="hud-label">LIVES</span>
          <div className="lives-display">
            {[...Array(3)].map((_, i) => (
              <span
                key={i}
                className={`life-icon ${i < lives ? 'active' : 'inactive'}`}
              >
                △
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom center - Speed & Boost bars */}
      <div className="hud-panel bottom-center">
        <div className="bar-container">
          <div className="bar-label">SPEED</div>
          <div className="bar">
            <div
              className="bar-fill speed"
              style={{ width: `${Math.round(speedRatio * 100)}%` }}
            ></div>
          </div>
        </div>
        <div className="bar-container">
          <div className="bar-label">BOOST</div>
          <div className="bar">
            <div
              className="bar-fill boost"
              style={{ width: `${Math.round(boostRatio * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Bottom left - Controls hint */}
      <div className="hud-panel bottom-left controls-hint">
        <div className="control-row">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / Arrows: Steer
        </div>
        <div className="control-row">
          <kbd>Shift</kbd>: Boost
        </div>
        <div className="control-row">
          <kbd>Space</kbd>: Fire
        </div>
        <div className="control-row">
          <kbd>Esc</kbd>: Pause
        </div>
      </div>

      <style>{`
        .hud {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          font-family: 'Orbitron', 'Courier New', monospace;
          color: #e8f0ff;
          text-shadow: 0 0 5px rgba(0, 100, 255, 0.5);
          z-index: 50;
        }

        .hud-panel {
          position: absolute;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(5, 16, 32, 0.9), rgba(10, 30, 60, 0.8));
          border: 1px solid rgba(255, 107, 53, 0.3);
          border-radius: 8px;
          backdrop-filter: blur(4px);
          box-shadow:
            0 4 20px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .top-left { top: 20px; left: 20px; min-width: 200px; }
        .top-right { top: 20px; right: 20px; text-align: right; }
        .bottom-center {
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 2rem;
        }
        .bottom-left {
          bottom: 20px;
          left: 20px;
          font-size: 0.75rem;
          opacity: 0.6;
        }

        .hud-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          margin: 0.3rem 0;
        }

        .hud-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #88aaff;
          opacity: 0.8;
        }

        .hud-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .hud-value.score { color: #ffdd00; text-shadow: 0 0 10px #ffdd00; }
        .hud-value.high-score { color: #ff6b35; text-shadow: 0 0 10px #ff6b35; }
        .hud-value.wave { color: #00ffaa; text-shadow: 0 0 10px #00ffaa; }

        .combo .hud-value {
          color: #ff6b35;
          animation: pulse 0.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .lives-display {
          display: flex;
          gap: 0.5rem;
        }

        .life-icon {
          font-size: 1.5rem;
          color: #ff6b35;
          text-shadow: 0 0 10px #ff6b35;
          transition: all 0.2s ease;
        }

        .life-icon.inactive {
          color: #334455;
          text-shadow: none;
          opacity: 0.3;
        }

        .bar-container {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 180px;
        }

        .bar-label {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #88aaff;
        }

        .bar {
          height: 8px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(255, 107, 53, 0.2);
        }

        .bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.1s ease-out;
        }

        .bar-fill.speed {
          background: linear-gradient(90deg, #00ffaa, #0088ff);
          box-shadow: 0 0 10px #00ffaa;
        }

        .bar-fill.boost {
          background: linear-gradient(90deg, #ff6b35, #ffdd00);
          box-shadow: 0 0 10px #ff6b35;
        }

        .controls-hint {
          background: rgba(5, 16, 32, 0.7) !important;
          border-color: rgba(255, 107, 53, 0.15) !important;
        }

        .control-row {
          margin: 0.2rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .control-row kbd {
          background: rgba(255, 107, 53, 0.2);
          border: 1px solid rgba(255, 107, 53, 0.4);
          border-radius: 4px;
          padding: 0.15rem 0.5rem;
          font-size: 0.7rem;
          font-family: inherit;
          color: #ffdd00;
          min-width: 2.5em;
          text-align: center;
        }

        @media (max-width: 768px) {
          .hud-panel { padding: 0.75rem 1rem; }
          .top-left { top: 10px; left: 10px; min-width: 160px; }
          .top-right { top: 10px; right: 10px; }
          .bottom-center { bottom: 10px; gap: 1rem; }
          .bottom-left { display: none; }
          .bar-container { min-width: 120px; }
        }
      `}</style>
    </div>
  )
}
