import { useState, useEffect, useRef } from 'react'

export function MobileControls({ onInputChange }) {
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const joystickRef = useRef(null)
  const [joystickActive, setJoystickActive] = useState(false)
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 })

  const inputRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    fire: false
  })

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    checkTouch()
    window.addEventListener('resize', checkTouch)
    return () => window.removeEventListener('resize', checkTouch)
  }, [])

  const updateInput = (key, value) => {
    inputRef.current[key] = value
    onInputChange?.({ ...inputRef.current })
  }

  const handleJoystickMove = (clientX, clientY) => {
    if (!joystickRef.current) return
    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = clientX - centerX
    const dy = clientY - centerY
    const radius = rect.width / 2

    const clampedX = Math.max(-radius, Math.min(radius, dx))
    const clampedY = Math.max(-radius, Math.min(radius, dy))

    setTouchPos({ x: clampedX, y: clampedY })

    // Thresholds for directional inputs
    const threshold = radius * 0.3
    updateInput('left', clampedX < -threshold)
    updateInput('right', clampedX > threshold)
    updateInput('up', clampedY < -threshold)
    updateInput('down', clampedY > threshold)
  }

  if (!isTouchDevice) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '24px',
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* Joystick Area */}
      <div
        ref={joystickRef}
        onTouchStart={(e) => {
          setJoystickActive(true)
          handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY)
        }}
        onTouchMove={(e) => {
          if (joystickActive) {
            handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY)
          }
        }}
        onTouchEnd={() => {
          setJoystickActive(false)
          setTouchPos({ x: 0, y: 0 })
          updateInput('up', false)
          updateInput('down', false)
          updateInput('left', false)
          updateInput('right', false)
        }}
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(4px)',
          position: 'relative',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'rgba(0, 200, 255, 0.7)',
            boxShadow: '0 0 12px rgba(0, 200, 255, 0.8)',
            transform: `translate(${touchPos.x}px, ${touchPos.y}px)`,
            transition: joystickActive ? 'none' : 'transform 0.15s ease-out'
          }}
        />
      </div>

      {/* Action Buttons Area */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          pointerEvents: 'auto'
        }}
      >
        {/* Boost Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault()
            updateInput('boost', true)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            updateInput('boost', false)
          }}
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'rgba(255, 165, 0, 0.4)',
            border: '2px solid rgba(255, 165, 0, 0.8)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '12px',
            backdropFilter: 'blur(4px)',
            touchAction: 'none'
          }}
        >
          BOOST
        </button>

        {/* Fire Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault()
            updateInput('fire', true)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            updateInput('fire', false)
          }}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255, 50, 50, 0.5)',
            border: '2px solid rgba(255, 50, 50, 0.9)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            backdropFilter: 'blur(4px)',
            touchAction: 'none'
          }}
        >
          FIRE
        </button>
      </div>
    </div>
  )
}
