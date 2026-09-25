import { useEffect, useRef, useCallback } from 'react'

/**
 * Keyboard input hook for game controls
 * Tracks key states and provides clean API for game systems
 */
export function useKeyboard() {
  const keysRef = useRef(new Set())
  const justPressedRef = useRef(new Set())
  const justReleasedRef = useRef(new Set())

  const isDown = useCallback((key) => keysRef.current.has(key.toLowerCase()), [])
  const wasPressed = useCallback((key) => justPressedRef.current.has(key.toLowerCase()), [])
  const wasReleased = useCallback((key) => justReleasedRef.current.has(key.toLowerCase()), [])

  const clearTransient = useCallback(() => {
    justPressedRef.current.clear()
    justReleasedRef.current.clear()
  }, [])

  useEffect(() => {
    const handleDown = (e) => {
      // Prevent default for game keys
      const gameKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'escape']
      if (gameKeys.includes(e.key.toLowerCase())) {
        e.preventDefault()
      }

      const key = e.key.toLowerCase()
      if (!keysRef.current.has(key)) {
        justPressedRef.current.add(key)
      }
      keysRef.current.add(key)
    }

    const handleUp = (e) => {
      const key = e.key.toLowerCase()
      keysRef.current.delete(key)
      justReleasedRef.current.add(key)
    }

    const handleBlur = () => {
      keysRef.current.clear()
      justPressedRef.current.clear()
      justReleasedRef.current.clear()
    }

    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup', handleUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup', handleUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  return {
    isDown,
    wasPressed,
    wasReleased,
    clearTransient,
    // Convenience getters for common game keys
    get up() { return isDown('w') || isDown('arrowup') },
    get down() { return isDown('s') || isDown('arrowdown') },
    get left() { return isDown('a') || isDown('arrowleft') },
    get right() { return isDown('d') || isDown('arrowright') },
    get boost() { return isDown('shift') },
    get fire() { return isDown(' ') },
    get pause() { return wasPressed('escape') }
  }
}

/**
 * Mouse input hook for mouse-look style controls (optional)
 */
export function useMouse(canvasRef, enabled = false) {
  const positionRef = useRef({ x: 0, y: 0 })
  const deltaRef = useRef({ x: 0, y: 0 })
  const lockedRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !enabled) return

    const handleMove = (e) => {
      if (!lockedRef.current) return
      deltaRef.current.x = e.movementX
      deltaRef.current.y = e.movementY
    }

    const handleClick = async () => {
      try {
        await canvas.requestPointerLock()
      } catch (err) {
        console.warn('Pointer lock failed:', err)
      }
    }

    const handleLockChange = () => {
      lockedRef.current = document.pointerLockElement === canvas
    }

    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('click', handleClick)
    document.addEventListener('pointerlockchange', handleLockChange)

    return () => {
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('click', handleClick)
      document.removeEventListener('pointerlockchange', handleLockChange)
      if (lockedRef.current) document.exitPointerLock()
    }
  }, [canvasRef, enabled])

  const getDelta = useCallback(() => {
    const delta = { ...deltaRef.current }
    deltaRef.current = { x: 0, y: 0 }
    return delta
  }, [])

  const isLocked = useCallback(() => lockedRef.current, [])

  return { getDelta, isLocked }
}