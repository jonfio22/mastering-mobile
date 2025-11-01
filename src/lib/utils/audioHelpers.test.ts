/**
 * Audio Helpers Unit Tests
 *
 * Tests for audio utility functions.
 * This file structure is ready for tests - actual implementations will be added
 * as audio helper functions are created.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateSineWave,
  generateWhiteNoise,
  generateImpulse,
  calculateRMS,
  calculatePeak,
  linearToDb,
  dbToLinear,
  detectClipping,
  countZeroCrossings,
  assertAudioLevelInRange,
  assertBuffersEqual,
  assertNoClipping,
} from '@/lib/test-utils/audioTestHelpers'

describe('Audio Signal Generators', () => {
  describe('generateSineWave', () => {
    it('should generate a sine wave with correct length', () => {
      const duration = 1.0 // 1 second
      const sampleRate = 44100
      const frequency = 440 // A4
      const buffer = generateSineWave(frequency, duration, sampleRate)

      expect(buffer.length).toBe(44100)
    })

    it('should generate sine wave with correct amplitude', () => {
      const buffer = generateSineWave(440, 0.1, 44100, 0.5)
      const peak = calculatePeak(buffer)

      expect(peak).toBeCloseTo(0.5, 1)
    })

    it('should generate sine wave at correct frequency', () => {
      const frequency = 440
      const sampleRate = 44100
      const duration = 0.1
      const buffer = generateSineWave(frequency, duration, sampleRate)

      // Count zero crossings - should be approximately 2x frequency for sine wave
      const crossings = countZeroCrossings(buffer)
      const estimatedFreq = (crossings / 2) / duration

      expect(estimatedFreq).toBeCloseTo(frequency, -1) // Within 10Hz
    })
  })

  describe('generateWhiteNoise', () => {
    it('should generate noise with correct length', () => {
      const duration = 0.5
      const sampleRate = 44100
      const buffer = generateWhiteNoise(duration, sampleRate)

      expect(buffer.length).toBe(22050)
    })

    it('should generate noise within amplitude range', () => {
      const amplitude = 0.5
      const buffer = generateWhiteNoise(0.1, 44100, amplitude)
      const peak = calculatePeak(buffer)

      expect(peak).toBeLessThanOrEqual(amplitude)
    })

    it('should have statistical properties of white noise', () => {
      const buffer = generateWhiteNoise(1.0, 44100)
      const rms = calculateRMS(buffer)

      // White noise should have RMS around 0.577 * amplitude for uniform distribution
      // (for amplitude 1.0, RMS ≈ 0.577)
      expect(rms).toBeGreaterThan(0.4)
      expect(rms).toBeLessThan(0.7)
    })
  })

  describe('generateImpulse', () => {
    it('should generate impulse at correct position', () => {
      const duration = 1.0
      const sampleRate = 44100
      const position = 0.5 // Middle of buffer
      const buffer = generateImpulse(duration, sampleRate, 1.0, position)

      const impulseIndex = Math.floor(position * sampleRate)
      expect(buffer[impulseIndex]).toBe(1.0)
    })

    it('should have only one non-zero sample', () => {
      const buffer = generateImpulse(0.1, 44100, 1.0, 0.05)
      const nonZeroCount = Array.from(buffer).filter(v => v !== 0).length

      expect(nonZeroCount).toBe(1)
    })
  })
})

describe('Audio Analysis Functions', () => {
  describe('calculateRMS', () => {
    it('should calculate RMS of sine wave correctly', () => {
      // RMS of a sine wave is amplitude / sqrt(2) ≈ 0.707
      const buffer = generateSineWave(440, 1.0, 44100, 1.0)
      const rms = calculateRMS(buffer)

      expect(rms).toBeCloseTo(0.707, 2)
    })

    it('should return 0 for silence', () => {
      const buffer = new Float32Array(1000)
      const rms = calculateRMS(buffer)

      expect(rms).toBe(0)
    })

    it('should handle DC offset correctly', () => {
      const buffer = new Float32Array(1000)
      buffer.fill(0.5)
      const rms = calculateRMS(buffer)

      expect(rms).toBe(0.5)
    })
  })

  describe('calculatePeak', () => {
    it('should find peak in positive signal', () => {
      const buffer = new Float32Array([0.1, 0.5, 0.3, 0.9, 0.2])
      const peak = calculatePeak(buffer)

      expect(peak).toBe(0.9)
    })

    it('should find peak in negative signal', () => {
      const buffer = new Float32Array([0.1, -0.5, 0.3, -0.9, 0.2])
      const peak = calculatePeak(buffer)

      expect(peak).toBe(0.9)
    })

    it('should return 0 for silence', () => {
      const buffer = new Float32Array(1000)
      const peak = calculatePeak(buffer)

      expect(peak).toBe(0)
    })
  })

  describe('dB conversion functions', () => {
    it('should convert linear to dB correctly', () => {
      expect(linearToDb(1.0)).toBeCloseTo(0, 1)
      expect(linearToDb(0.5)).toBeCloseTo(-6.02, 1)
      expect(linearToDb(0.1)).toBeCloseTo(-20, 1)
    })

    it('should convert dB to linear correctly', () => {
      expect(dbToLinear(0)).toBeCloseTo(1.0, 2)
      expect(dbToLinear(-6)).toBeCloseTo(0.501, 2)
      expect(dbToLinear(-20)).toBeCloseTo(0.1, 2)
    })

    it('should be reciprocal operations', () => {
      const linear = 0.7
      const db = linearToDb(linear)
      const backToLinear = dbToLinear(db)

      expect(backToLinear).toBeCloseTo(linear, 5)
    })
  })

  describe('detectClipping', () => {
    it('should detect clipping in signal', () => {
      const buffer = new Float32Array([0.5, 0.8, 1.0, 0.7])
      const hasClipping = detectClipping(buffer, 0.99)

      expect(hasClipping).toBe(true)
    })

    it('should not detect clipping in clean signal', () => {
      const buffer = new Float32Array([0.5, 0.8, 0.95, 0.7])
      const hasClipping = detectClipping(buffer, 0.99)

      expect(hasClipping).toBe(false)
    })

    it('should respect custom threshold', () => {
      const buffer = new Float32Array([0.5, 0.8, 0.85, 0.7])
      const hasClipping = detectClipping(buffer, 0.8)

      expect(hasClipping).toBe(true)
    })
  })

  describe('countZeroCrossings', () => {
    it('should count zero crossings in square wave', () => {
      const buffer = new Float32Array([1, 1, -1, -1, 1, 1, -1, -1])
      const crossings = countZeroCrossings(buffer)

      expect(crossings).toBe(4)
    })

    it('should return 0 for DC signal', () => {
      const buffer = new Float32Array(100)
      buffer.fill(0.5)
      const crossings = countZeroCrossings(buffer)

      expect(crossings).toBe(0)
    })

    it('should count correctly for sine wave', () => {
      const buffer = generateSineWave(100, 0.1, 44100)
      const crossings = countZeroCrossings(buffer)

      // For 100Hz over 0.1s, we expect ~20 crossings (10 cycles * 2)
      expect(crossings).toBeGreaterThan(15)
      expect(crossings).toBeLessThan(25)
    })
  })
})

describe('Assertion Helpers', () => {
  describe('assertAudioLevelInRange', () => {
    it('should pass for level within range', () => {
      const buffer = generateSineWave(440, 1.0, 44100, 0.5)

      expect(() => {
        assertAudioLevelInRange(buffer, -10, 0)
      }).not.toThrow()
    })

    it('should throw for level outside range', () => {
      const buffer = generateSineWave(440, 1.0, 44100, 0.01)

      expect(() => {
        assertAudioLevelInRange(buffer, -10, 0)
      }).toThrow(/outside expected range/)
    })
  })

  describe('assertBuffersEqual', () => {
    it('should pass for equal buffers', () => {
      const buffer1 = generateSineWave(440, 0.1, 44100)
      const buffer2 = new Float32Array(buffer1)

      expect(() => {
        assertBuffersEqual(buffer1, buffer2)
      }).not.toThrow()
    })

    it('should throw for different buffers', () => {
      const buffer1 = generateSineWave(440, 0.1, 44100)
      const buffer2 = generateSineWave(880, 0.1, 44100)

      expect(() => {
        assertBuffersEqual(buffer1, buffer2)
      }).toThrow(/Buffers differ/)
    })

    it('should respect tolerance', () => {
      const buffer1 = new Float32Array([0.5, 0.6, 0.7])
      const buffer2 = new Float32Array([0.501, 0.601, 0.701])

      expect(() => {
        assertBuffersEqual(buffer1, buffer2, 0.01)
      }).not.toThrow()
    })
  })

  describe('assertNoClipping', () => {
    it('should pass for clean signal', () => {
      const buffer = generateSineWave(440, 0.1, 44100, 0.8)

      expect(() => {
        assertNoClipping(buffer)
      }).not.toThrow()
    })

    it('should throw for clipped signal', () => {
      const buffer = new Float32Array([0.5, 0.8, 1.0, 0.7])

      expect(() => {
        assertNoClipping(buffer, 0.99)
      }).toThrow(/clipping detected/)
    })
  })
})

// ============================================================================
// Placeholder for actual audio helper functions when they're implemented
// ============================================================================

describe('Audio Helper Functions (placeholder)', () => {
  describe.skip('normalize', () => {
    it('should normalize audio to target level', () => {
      // TODO: Implement when normalize function is created
    })
  })

  describe.skip('applyFade', () => {
    it('should apply fade in', () => {
      // TODO: Implement when fade functions are created
    })

    it('should apply fade out', () => {
      // TODO: Implement when fade functions are created
    })
  })

  describe.skip('mixBuffers', () => {
    it('should mix two audio buffers', () => {
      // TODO: Implement when mixing functions are created
    })
  })
})
