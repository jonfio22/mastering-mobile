/**
 * Audio Test Helpers
 *
 * Comprehensive utilities for testing audio processing functionality.
 * Includes mocks, test signal generation, and audio analysis helpers.
 */

import { vi } from 'vitest'

// ============================================================================
// Mock AudioContext and Web Audio API
// ============================================================================

export class MockAudioContext {
  public sampleRate: number = 44100
  public currentTime: number = 0
  public state: AudioContextState = 'running'
  public destination: AudioDestinationNode
  private _nodes: Set<AudioNode> = new Set()

  constructor() {
    this.destination = this.createGain() as unknown as AudioDestinationNode
  }

  createGain(): GainNode {
    const node = {
      context: this,
      gain: { value: 1, setValueAtTime: vi.fn() },
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 2,
    } as unknown as GainNode
    this._nodes.add(node)
    return node
  }

  createBiquadFilter(): BiquadFilterNode {
    const node = {
      context: this,
      type: 'lowpass' as BiquadFilterType,
      frequency: { value: 350, setValueAtTime: vi.fn() },
      Q: { value: 1, setValueAtTime: vi.fn() },
      gain: { value: 0, setValueAtTime: vi.fn() },
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      getFrequencyResponse: vi.fn((frequencies, magResponse, phaseResponse) => {
        // Simple mock response
        for (let i = 0; i < frequencies.length; i++) {
          magResponse[i] = 1.0
          phaseResponse[i] = 0.0
        }
      }),
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 2,
    } as unknown as BiquadFilterNode
    this._nodes.add(node)
    return node
  }

  createDynamicsCompressor(): DynamicsCompressorNode {
    const node = {
      context: this,
      threshold: { value: -24, setValueAtTime: vi.fn() },
      knee: { value: 30, setValueAtTime: vi.fn() },
      ratio: { value: 12, setValueAtTime: vi.fn() },
      attack: { value: 0.003, setValueAtTime: vi.fn() },
      release: { value: 0.25, setValueAtTime: vi.fn() },
      reduction: 0,
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 2,
    } as unknown as DynamicsCompressorNode
    this._nodes.add(node)
    return node
  }

  createAnalyser(): AnalyserNode {
    const node = {
      context: this,
      fftSize: 2048,
      frequencyBinCount: 1024,
      minDecibels: -100,
      maxDecibels: -30,
      smoothingTimeConstant: 0.8,
      getByteFrequencyData: vi.fn(),
      getFloatFrequencyData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
      getFloatTimeDomainData: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 2,
    } as unknown as AnalyserNode
    this._nodes.add(node)
    return node
  }

  createBufferSource(): AudioBufferSourceNode {
    const node = {
      context: this,
      buffer: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      playbackRate: { value: 1, setValueAtTime: vi.fn() },
      detune: { value: 0, setValueAtTime: vi.fn() },
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      numberOfInputs: 0,
      numberOfOutputs: 1,
      channelCount: 2,
    } as unknown as AudioBufferSourceNode
    this._nodes.add(node)
    return node
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    const channelData: Float32Array[] = []
    for (let i = 0; i < numberOfChannels; i++) {
      channelData.push(new Float32Array(length))
    }

    return {
      sampleRate,
      length,
      duration: length / sampleRate,
      numberOfChannels,
      getChannelData: (channel: number) => channelData[channel],
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as AudioBuffer
  }

  createMediaElementSource(mediaElement: HTMLMediaElement): MediaElementAudioSourceNode {
    const node = {
      context: this,
      mediaElement,
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      numberOfInputs: 0,
      numberOfOutputs: 1,
      channelCount: 2,
    } as unknown as MediaElementAudioSourceNode
    this._nodes.add(node)
    return node
  }

  async resume(): Promise<void> {
    this.state = 'running'
  }

  async suspend(): Promise<void> {
    this.state = 'suspended'
  }

  async close(): Promise<void> {
    this.state = 'closed'
    this._nodes.clear()
  }

  decodeAudioData(
    audioData: ArrayBuffer,
    successCallback?: (buffer: AudioBuffer) => void,
    errorCallback?: (error: Error) => void
  ): Promise<AudioBuffer> {
    const buffer = this.createBuffer(2, 44100, 44100)
    if (successCallback) successCallback(buffer)
    return Promise.resolve(buffer)
  }
}

// ============================================================================
// Mock AudioWorklet
// ============================================================================

export class MockAudioWorkletNode {
  public parameters: Map<string, AudioParam> = new Map()
  public port: MessagePort

  constructor(
    public context: AudioContext,
    public name: string,
    options?: AudioWorkletNodeOptions
  ) {
    this.port = {
      postMessage: vi.fn(),
      onmessage: null,
      onmessageerror: null,
      close: vi.fn(),
      start: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MessagePort
  }

  connect = vi.fn().mockReturnThis()
  disconnect = vi.fn()
}

// ============================================================================
// Test Signal Generators
// ============================================================================

/**
 * Generate a sine wave test signal
 */
export function generateSineWave(
  frequency: number,
  duration: number,
  sampleRate: number = 44100,
  amplitude: number = 1.0
): Float32Array {
  const length = Math.floor(duration * sampleRate)
  const buffer = new Float32Array(length)
  const omega = (2 * Math.PI * frequency) / sampleRate

  for (let i = 0; i < length; i++) {
    buffer[i] = amplitude * Math.sin(omega * i)
  }

  return buffer
}

/**
 * Generate white noise test signal
 */
export function generateWhiteNoise(
  duration: number,
  sampleRate: number = 44100,
  amplitude: number = 1.0
): Float32Array {
  const length = Math.floor(duration * sampleRate)
  const buffer = new Float32Array(length)

  for (let i = 0; i < length; i++) {
    buffer[i] = amplitude * (Math.random() * 2 - 1)
  }

  return buffer
}

/**
 * Generate impulse test signal (Dirac delta function)
 */
export function generateImpulse(
  duration: number,
  sampleRate: number = 44100,
  amplitude: number = 1.0,
  position: number = 0
): Float32Array {
  const length = Math.floor(duration * sampleRate)
  const buffer = new Float32Array(length)

  const impulseIndex = Math.floor(position * sampleRate)
  if (impulseIndex < length) {
    buffer[impulseIndex] = amplitude
  }

  return buffer
}

/**
 * Generate a square wave test signal
 */
export function generateSquareWave(
  frequency: number,
  duration: number,
  sampleRate: number = 44100,
  amplitude: number = 1.0
): Float32Array {
  const length = Math.floor(duration * sampleRate)
  const buffer = new Float32Array(length)
  const period = sampleRate / frequency

  for (let i = 0; i < length; i++) {
    buffer[i] = amplitude * (Math.floor((i % period) / (period / 2)) * 2 - 1)
  }

  return buffer
}

/**
 * Generate DC offset signal
 */
export function generateDCOffset(
  duration: number,
  level: number,
  sampleRate: number = 44100
): Float32Array {
  const length = Math.floor(duration * sampleRate)
  const buffer = new Float32Array(length)
  buffer.fill(level)
  return buffer
}

// ============================================================================
// Audio Analysis Helpers
// ============================================================================

/**
 * Calculate RMS (Root Mean Square) level of audio buffer
 */
export function calculateRMS(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i]
  }
  return Math.sqrt(sum / buffer.length)
}

/**
 * Calculate peak level of audio buffer
 */
export function calculatePeak(buffer: Float32Array): number {
  let peak = 0
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i])
    if (abs > peak) peak = abs
  }
  return peak
}

/**
 * Convert linear amplitude to decibels
 */
export function linearToDb(linear: number): number {
  return 20 * Math.log10(linear)
}

/**
 * Convert decibels to linear amplitude
 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

/**
 * Calculate Signal-to-Noise Ratio
 */
export function calculateSNR(signal: Float32Array, noise: Float32Array): number {
  const signalPower = calculateRMS(signal)
  const noisePower = calculateRMS(noise)
  return linearToDb(signalPower / noisePower)
}

/**
 * Detect if audio contains clipping
 */
export function detectClipping(buffer: Float32Array, threshold: number = 0.99): boolean {
  for (let i = 0; i < buffer.length; i++) {
    if (Math.abs(buffer[i]) >= threshold) {
      return true
    }
  }
  return false
}

/**
 * Count number of zero crossings (useful for frequency estimation)
 */
export function countZeroCrossings(buffer: Float32Array): number {
  let count = 0
  for (let i = 1; i < buffer.length; i++) {
    if ((buffer[i - 1] >= 0 && buffer[i] < 0) || (buffer[i - 1] < 0 && buffer[i] >= 0)) {
      count++
    }
  }
  return count
}

// ============================================================================
// FFT Test Helpers
// ============================================================================

/**
 * Simple FFT implementation for testing (not optimized)
 * Returns magnitude spectrum
 */
export function calculateFFTMagnitude(buffer: Float32Array): Float32Array {
  const n = buffer.length
  const magnitude = new Float32Array(n / 2)

  // Very simplified - in real tests you'd use a proper FFT library
  // This is just for demonstration
  for (let k = 0; k < n / 2; k++) {
    let real = 0
    let imag = 0

    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * k * i) / n
      real += buffer[i] * Math.cos(angle)
      imag -= buffer[i] * Math.sin(angle)
    }

    magnitude[k] = Math.sqrt(real * real + imag * imag) / n
  }

  return magnitude
}

/**
 * Find dominant frequency in FFT spectrum
 */
export function findDominantFrequency(
  fftMagnitude: Float32Array,
  sampleRate: number
): number {
  let maxMag = 0
  let maxIndex = 0

  for (let i = 1; i < fftMagnitude.length; i++) {
    if (fftMagnitude[i] > maxMag) {
      maxMag = fftMagnitude[i]
      maxIndex = i
    }
  }

  return (maxIndex * sampleRate) / (2 * fftMagnitude.length)
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert audio level is within expected range (in dB)
 */
export function assertAudioLevelInRange(
  buffer: Float32Array,
  minDb: number,
  maxDb: number,
  message?: string
): void {
  const rms = calculateRMS(buffer)
  const db = linearToDb(rms)

  if (db < minDb || db > maxDb) {
    throw new Error(
      message ||
      `Audio level ${db.toFixed(2)}dB is outside expected range [${minDb}, ${maxDb}]dB`
    )
  }
}

/**
 * Assert audio buffers are approximately equal
 */
export function assertBuffersEqual(
  actual: Float32Array,
  expected: Float32Array,
  tolerance: number = 0.001,
  message?: string
): void {
  if (actual.length !== expected.length) {
    throw new Error(
      message ||
      `Buffer lengths differ: ${actual.length} vs ${expected.length}`
    )
  }

  for (let i = 0; i < actual.length; i++) {
    if (Math.abs(actual[i] - expected[i]) > tolerance) {
      throw new Error(
        message ||
        `Buffers differ at index ${i}: ${actual[i]} vs ${expected[i]} (tolerance: ${tolerance})`
      )
    }
  }
}

/**
 * Assert no clipping in audio buffer
 */
export function assertNoClipping(
  buffer: Float32Array,
  threshold: number = 0.99,
  message?: string
): void {
  if (detectClipping(buffer, threshold)) {
    throw new Error(message || `Audio clipping detected (threshold: ${threshold})`)
  }
}

/**
 * Assert frequency is present in signal
 */
export function assertFrequencyPresent(
  buffer: Float32Array,
  targetFrequency: number,
  sampleRate: number,
  tolerance: number = 10,
  message?: string
): void {
  const fft = calculateFFTMagnitude(buffer)
  const dominantFreq = findDominantFrequency(fft, sampleRate)

  if (Math.abs(dominantFreq - targetFrequency) > tolerance) {
    throw new Error(
      message ||
      `Expected frequency ${targetFrequency}Hz, found ${dominantFreq.toFixed(2)}Hz (tolerance: ${tolerance}Hz)`
    )
  }
}

// ============================================================================
// Mock Audio File Helpers
// ============================================================================

/**
 * Create a mock audio file blob for testing file uploads
 */
export function createMockAudioFile(
  duration: number = 1.0,
  sampleRate: number = 44100,
  filename: string = 'test.wav'
): File {
  const buffer = generateSineWave(440, duration, sampleRate)
  const blob = new Blob([buffer as any], { type: 'audio/wav' })

  return new File([blob], filename, { type: 'audio/wav' })
}

/**
 * Create a mock AudioBuffer for testing
 */
export function createMockAudioBuffer(
  data: Float32Array,
  numberOfChannels: number = 2,
  sampleRate: number = 44100
): AudioBuffer {
  const ctx = new MockAudioContext()
  const buffer = ctx.createBuffer(numberOfChannels, data.length, sampleRate)

  for (let channel = 0; channel < numberOfChannels; channel++) {
    buffer.getChannelData(channel).set(data)
  }

  return buffer
}

// ============================================================================
// Timing Helpers
// ============================================================================

/**
 * Wait for audio processing to complete (useful for async audio operations)
 */
export async function waitForAudioProcessing(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create a controlled clock for audio timing tests
 */
export function createAudioClock() {
  let currentTime = 0

  return {
    getCurrentTime: () => currentTime,
    advance: (seconds: number) => {
      currentTime += seconds
    },
    reset: () => {
      currentTime = 0
    },
  }
}
