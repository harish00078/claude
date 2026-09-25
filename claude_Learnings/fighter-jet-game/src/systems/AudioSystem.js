/**
 * Web Audio API based sound system
 * Generates procedural sounds - no audio files needed
 */
export class AudioSystem {
  constructor() {
    this.audioContext = null
    this.masterGain = null
    this.enabled = true
    this.muted = false
    this.volume = 0.5

    // Engine sound
    this.engineOscillator = null
    this.engineGain = null
    this.engineFilter = null
    this.enginePlaying = false

    this.init()
  }

  init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.connect(this.audioContext.destination)
      this.masterGain.gain.value = this.volume
    } catch (e) {
      console.warn('Web Audio API not supported:', e)
      this.enabled = false
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume
    }
  }

  setMuted(muted) {
    this.muted = muted
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.volume
    }
  }

  // --- Procedural sound generators ---

  playShoot() {
    if (!this.enabled) return
    this.resume()

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    osc.type = 'square'
    osc.frequency.setValueAtTime(400, this.audioContext.currentTime)
    osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.1)

    filter.type = 'highpass'
    filter.frequency.value = 500

    gain.gain.setValueAtTime(0.1 * this.volume, this.audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    osc.start()
    osc.stop(this.audioContext.currentTime + 0.2)
  }

  playEnemyShoot() {
    if (!this.enabled) return
    this.resume()

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(300, this.audioContext.currentTime)
    osc.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.2)

    gain.gain.setValueAtTime(0.08 * this.volume, this.audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.25)

    osc.connect(gain)
    gain.connect(this.masterGain)

    osc.start()
    osc.stop(this.audioContext.currentTime + 0.3)
  }

  playExplosion(type = 'standard') {
    if (!this.enabled) return
    this.resume()

    // Noise-based explosion
    const bufferSize = this.audioContext.sampleRate * (type === 'bomber' ? 1.5 : 1)
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      // Decaying noise
      const decay = 1 - i / bufferSize
      data[i] = (Math.random() * 2 - 1) * decay * decay
    }

    const source = this.audioContext.createBufferSource()
    const gain = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    source.buffer = buffer
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, this.audioContext.currentTime)
    filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 1)

    gain.gain.setValueAtTime(0.3 * this.volume, this.audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1.5)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    source.start()
  }

  playHit() {
    if (!this.enabled) return
    this.resume()

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime)
    osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.05)

    gain.gain.setValueAtTime(0.15 * this.volume, this.audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1)

    osc.connect(gain)
    gain.connect(this.masterGain)

    osc.start()
    osc.stop(this.audioContext.currentTime + 0.1)
  }

  playMissileLaunch() {
    if (!this.enabled) return
    this.resume()

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, this.audioContext.currentTime)
    osc.frequency.exponentialRampToValueAtTime(60, this.audioContext.currentTime + 0.5)

    filter.type = 'lowpass'
    filter.frequency.value = 500

    gain.gain.setValueAtTime(0.1 * this.volume, this.audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.6)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    osc.start()
    osc.stop(this.audioContext.currentTime + 0.7)
  }

  playPowerUp() {
    if (!this.enabled) return
    this.resume()

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, this.audioContext.currentTime)
    osc.frequency.setValueAtTime(660, this.audioContext.currentTime + 0.1)
    osc.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.2)

    gain.gain.setValueAtTime(0.2 * this.volume, this.audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5)

    osc.connect(gain)
    gain.connect(this.masterGain)

    osc.start()
    osc.stop(this.audioContext.currentTime + 0.6)
  }

  // Engine sound management
  startEngine() {
    if (!this.enabled || this.enginePlaying) return
    this.resume()

    this.engineOscillator = this.audioContext.createOscillator()
    this.engineGain = this.audioContext.createGain()
    this.engineFilter = this.audioContext.createBiquadFilter()

    this.engineOscillator.type = 'sawtooth'
    this.engineOscillator.frequency.value = 60

    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 400
    this.engineFilter.Q.value = 2

    this.engineGain.gain.value = 0

    this.engineOscillator.connect(this.engineFilter)
    this.engineFilter.connect(this.engineGain)
    this.engineGain.connect(this.masterGain)

    this.engineOscillator.start()
    this.enginePlaying = true

    // Fade in
    this.engineGain.gain.setValueAtTime(0, this.audioContext.currentTime)
    this.engineGain.gain.linearRampToValueAtTime(0.05 * this.volume, this.audioContext.currentTime + 0.5)
  }

  stopEngine() {
    if (!this.enginePlaying || !this.engineGain) return

    this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, this.audioContext.currentTime)
    this.engineGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5)

    setTimeout(() => {
      if (this.engineOscillator) {
        this.engineOscillator.stop()
        this.engineOscillator.disconnect()
        this.engineFilter.disconnect()
        this.engineGain.disconnect()
        this.engineOscillator = null
        this.engineGain = null
        this.engineFilter = null
        this.enginePlaying = false
      }
    }, 600)
  }

  updateEngine(speedRatio, boostActive) {
    if (!this.enginePlaying || !this.engineOscillator || !this.engineFilter) return

    // Pitch based on speed
    const baseFreq = 60
    const maxFreq = 200
    const freq = baseFreq + (maxFreq - baseFreq) * speedRatio
    this.engineOscillator.frequency.setTargetAtTime(freq, this.audioContext.currentTime, 0.1)

    // Filter opens up with speed
    const filterFreq = 200 + 800 * speedRatio
    this.engineFilter.frequency.setTargetAtTime(filterFreq, this.audioContext.currentTime, 0.1)

    // Volume increases with speed and boost
    const targetGain = (0.03 + 0.07 * speedRatio) * (boostActive ? 1.5 : 1) * this.volume
    this.engineGain.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.1)
  }

  dispose() {
    this.stopEngine()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
