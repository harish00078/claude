export class ScoreSystem {
  constructor() {
    this.score = 0
    this.highScore = 0
    this.wave = 1
    this.enemiesDestroyed = 0
    this.shotsFired = 0
    this.shotsHit = 0
    this.combo = 0
    this.maxCombo = 0
    this.lastKillTime = 0
    this.COMBO_TIMEOUT = 2.0 // seconds

    this.loadHighScore()
  }

  loadHighScore() {
    try {
      const saved = localStorage.getItem('fighterJetHighScore')
      if (saved) {
        this.highScore = parseInt(saved, 10)
      }
    } catch (e) {
      console.warn('Could not load high score:', e)
    }
  }

  saveHighScore() {
    try {
      localStorage.setItem('fighterJetHighScore', this.highScore.toString())
    } catch (e) {
      console.warn('Could not save high score:', e)
    }
  }

  addScore(points, enemyType = '') {
    this.score += points

    // Combo system
    const now = performance.now() / 1000
    if (now - this.lastKillTime < this.COMBO_TIMEOUT) {
      this.combo++
      // Bonus for combos
      const comboBonus = Math.floor(this.combo * 10)
      this.score += comboBonus
    } else {
      this.combo = 1
    }
    this.lastKillTime = now

    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo
    }

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score
      this.saveHighScore()
    }

    this.enemiesDestroyed++
  }

  recordShot() {
    this.shotsFired++
  }

  recordHit() {
    this.shotsHit++
  }

  getAccuracy() {
    if (this.shotsFired === 0) return 0
    return Math.min(100, Math.round((this.shotsHit / this.shotsFired) * 100))
  }

  setWave(wave) {
    this.wave = wave
  }

  getScore() {
    return this.score
  }

  getHighScore() {
    return this.highScore
  }

  getWave() {
    return this.wave
  }

  getStats() {
    return {
      score: this.score,
      highScore: this.highScore,
      wave: this.wave,
      enemiesDestroyed: this.enemiesDestroyed,
      accuracy: this.getAccuracy(),
      maxCombo: this.maxCombo
    }
  }

  reset() {
    this.score = 0
    this.wave = 1
    this.enemiesDestroyed = 0
    this.shotsFired = 0
    this.shotsHit = 0
    this.combo = 0
    this.maxCombo = 0
    this.lastKillTime = 0
  }
}
