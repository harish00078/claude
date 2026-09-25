import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for the main game loop using requestAnimationFrame
 * Provides delta time and handles pause/resume
 */
export function useGameLoop(onTick, dependencies = [], paused = false) {
  const requestRef = useRef(null)
  const previousTimeRef = useRef(0)
  const pausedRef = useRef(paused)
  const onTickRef = useRef(onTick)

  // Keep onTickRef current
  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  // Keep pausedRef current
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  const loop = useCallback((time) => {
    if (pausedRef.current) {
      requestRef.current = requestAnimationFrame(loop)
      return
    }

    const deltaTime = (time - previousTimeRef.current) / 1000 // Convert to seconds
    previousTimeRef.current = time

    // Cap delta time to prevent spiral of death on tab resume
    const cappedDelta = Math.min(deltaTime, 1 / 30)

    if (onTickRef.current) {
      onTickRef.current(cappedDelta, time / 1000)
    }

    requestRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    previousTimeRef.current = performance.now()
    requestRef.current = requestAnimationFrame(loop)

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [loop, ...dependencies])

  // Expose controls
  return {
    start: () => { pausedRef.current = false },
    stop: () => { pausedRef.current = true },
    toggle: () => { pausedRef.current = !pausedRef.current }
  }
}

/**
 * Hook for fixed timestep game loop (for physics)
 */
export function useFixedTimestepLoop(onTick, fixedTimestep = 1/60, dependencies = [], paused = false) {
  const accumulatorRef = useRef(0)
  const lastTimeRef = useRef(0)
  const requestRef = useRef(null)
  const pausedRef = useRef(paused)
  const onTickRef = useRef(onTick)

  useEffect(() => { onTickRef.current = onTick }, [onTick])
  useEffect(() => { pausedRef.current = paused }, [paused])

  const loop = useCallback((time) => {
    if (pausedRef.current) {
      requestRef.current = requestAnimationFrame(loop)
      return
    }

    const deltaTime = (time - lastTimeRef.current) / 1000
    lastTimeRef.current = time

    accumulatorRef.current += Math.min(deltaTime, 0.1)

    while (accumulatorRef.current >= fixedTimestep) {
      if (onTickRef.current) {
        onTickRef.current(fixedTimestep)
      }
      accumulatorRef.current -= fixedTimestep
    }

    requestRef.current = requestAnimationFrame(loop)
  }, [fixedTimestep])

  useEffect(() => {
    lastTimeRef.current = performance.now()
    requestRef.current = requestAnimationFrame(loop)
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [loop, ...dependencies])

  return {
    start: () => { pausedRef.current = false },
    stop: () => { pausedRef.current = true }
  }
}