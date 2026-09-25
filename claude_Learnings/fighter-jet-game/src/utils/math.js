import * as THREE from 'three'

// Math utilities for the game

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export const lerp = (a, b, t) => a + (b - a) * t

export const lerpVec3 = (a, b, t, out = new THREE.Vector3()) => {
  out.x = lerp(a.x, b.x, t)
  out.y = lerp(a.y, b.y, t)
  out.z = lerp(a.z, b.z, t)
  return out
}

export const randomRange = (min, max) => Math.random() * (max - min) + min

export const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

export const randomVec3 = (radius = 1, out = new THREE.Vector3()) => {
  const u = Math.random()
  const v = Math.random()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  const r = radius * Math.cbrt(Math.random())
  out.x = r * Math.sin(phi) * Math.cos(theta)
  out.y = r * Math.sin(phi) * Math.sin(theta)
  out.z = r * Math.cos(phi)
  return out
}

export const degToRad = (deg) => deg * (Math.PI / 180)

export const radToDeg = (rad) => rad * (180 / Math.PI)

export const smoothStep = (t) => t * t * (3 - 2 * t)

export const smootherStep = (t) => t * t * t * (t * (t * 6 - 15) + 10)

export const approach = (current, target, rate) => {
  if (current < target) return Math.min(current + rate, target)
  if (current > target) return Math.max(current - rate, target)
  return current
}

export const wrapAngle = (angle) => {
  while (angle > Math.PI) angle -= 2 * Math.PI
  while (angle < -Math.PI) angle += 2 * Math.PI
  return angle
}

export const angleDiff = (a, b) => wrapAngle(a - b)
