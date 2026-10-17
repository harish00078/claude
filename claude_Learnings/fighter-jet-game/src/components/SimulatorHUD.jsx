import { useState, useEffect } from 'react'

export function SimulatorHUD({
  airspeed = 80,
  altitude = 500,
  throttle = 60,
  isStalled = false,
  pitchAngle = 0,
  rollAngle = 0,
  cameraMode = 'cockpit',
  onToggleCamera,
  gameState
}) {
  if (gameState === 'menu') return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
        fontFamily: "'Orbitron', 'Courier New', monospace",
        color: '#00ff88',
        textShadow: '0 0 8px rgba(0, 255, 136, 0.8)',
        userSelect: 'none'
      }}
    >
      {/* Top Banner / Compass */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          background: 'rgba(0, 20, 10, 0.65)',
          padding: '8px 20px',
          borderRadius: '24px',
          border: '1px solid rgba(0, 255, 136, 0.4)',
          backdropFilter: 'blur(4px)'
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>HDG 000°</span>
        <span style={{ color: 'rgba(0,255,136,0.4)' }}>|</span>
        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>REALISTIC FLIGHT SIM</span>
        <span style={{ color: 'rgba(0,255,136,0.4)' }}>|</span>
        <button
          onClick={onToggleCamera}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(0, 255, 136, 0.2)',
            border: '1px solid #00ff88',
            color: '#00ff88',
            borderRadius: '12px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
        >
          CAM: {cameraMode.toUpperCase()} [C]
        </button>
      </div>

      {/* Left Airspeed Tape */}
      <div
        style={{
          position: 'absolute',
          left: '30px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(0, 20, 10, 0.7)',
          border: '1px solid rgba(0, 255, 136, 0.5)',
          borderRadius: '8px',
          padding: '12px 16px',
          textAlign: 'center',
          minWidth: '90px'
        }}
      >
        <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '4px' }}>AIRSPEED</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ff88' }}>
          {airspeed}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>KNOTS</div>
      </div>

      {/* Right Altitude Tape */}
      <div
        style={{
          position: 'absolute',
          right: '30px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(0, 20, 10, 0.7)',
          border: '1px solid rgba(0, 255, 136, 0.5)',
          borderRadius: '8px',
          padding: '12px 16px',
          textAlign: 'center',
          minWidth: '90px'
        }}
      >
        <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '4px' }}>ALTITUDE</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ff88' }}>
          {altitude}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>FEET MSL</div>
      </div>

      {/* Center Reticle & Artificial Horizon Reticle */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        {/* Pitch / Horizon Boresight Ring */}
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '2px solid rgba(0, 255, 136, 0.8)',
            borderRadius: '50%',
            position: 'relative'
          }}
        >
          <div style={{ position: 'absolute', left: '-12px', top: '10px', width: '10px', height: '2px', background: '#00ff88' }} />
          <div style={{ position: 'absolute', right: '-12px', top: '10px', width: '10px', height: '2px', background: '#00ff88' }} />
        </div>
      </div>

      {/* Stall Warning Display */}
      {isStalled && (
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 0, 0, 0.8)',
            border: '2px solid #ff3333',
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            animation: 'pulse 0.5s infinite alternate',
            boxShadow: '0 0 20px rgba(255, 0, 0, 0.9)'
          }}
        >
          ⚠️ STALL WARNING - NOSE DOWN TO RECOVER ⚠️
        </div>
      )}

      {/* Bottom Left - Throttle Gauge */}
      <div
        style={{
          position: 'absolute',
          left: '30px',
          bottom: '30px',
          background: 'rgba(0, 20, 10, 0.7)',
          border: '1px solid rgba(0, 255, 136, 0.5)',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>THROTTLE</div>
        <div
          style={{
            width: '100px',
            height: '10px',
            background: 'rgba(0, 255, 136, 0.2)',
            borderRadius: '5px',
            overflow: 'hidden',
            border: '1px solid rgba(0, 255, 136, 0.4)'
          }}
        >
          <div
            style={{
              width: `${throttle}%`,
              height: '100%',
              background: throttle > 100 ? '#ffaa00' : '#00ff88',
              boxShadow: '0 0 8px #00ff88'
            }}
          />
        </div>
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{throttle}%</div>
      </div>

      <style>{`
        @keyframes pulse {
          from { opacity: 0.6; transform: translateX(-50%) scale(0.98); }
          to { opacity: 1; transform: translateX(-50%) scale(1.02); }
        }
      `}</style>
    </div>
  )
}
