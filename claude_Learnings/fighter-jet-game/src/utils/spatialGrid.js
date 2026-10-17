/**
 * Lightweight 3D Spatial Grid for fast spatial queries & O(1) collision partitioning
 */
export class SpatialGrid {
  constructor(cellSize = 50) {
    this.cellSize = cellSize
    this.grid = new Map()
  }

  clear() {
    this.grid.clear()
  }

  getKey(x, y, z) {
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    const cz = Math.floor(z / this.cellSize)
    return `${cx},${cy},${cz}`
  }

  insert(item, position) {
    const key = this.getKey(position.x, position.y, position.z)
    let cell = this.grid.get(key)
    if (!cell) {
      cell = []
      this.grid.set(key, cell)
    }
    cell.push(item)
  }

  /**
   * Returns all items in the candidate cells near the position
   */
  getNearby(position, radius = 0) {
    const cx = Math.floor(position.x / this.cellSize)
    const cy = Math.floor(position.y / this.cellSize)
    const cz = Math.floor(position.z / this.cellSize)

    const cellSpan = Math.ceil((radius || 1) / this.cellSize)
    const nearby = []

    for (let x = cx - cellSpan; x <= cx + cellSpan; x++) {
      for (let y = cy - cellSpan; y <= cy + cellSpan; y++) {
        for (let z = cz - cellSpan; z <= cz + cellSpan; z++) {
          const key = `${x},${y},${z}`
          const cell = this.grid.get(key)
          if (cell) {
            for (let i = 0; i < cell.length; i++) {
              nearby.push(cell[i])
            }
          }
        }
      }
    }

    return nearby
  }
}
