/**
 * Global Test Setup
 *
 * This file is automatically run before all tests.
 * It sets up global mocks and test environment configuration.
 */

import { expect, afterEach, vi, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MockAudioContext, MockAudioWorkletNode } from './audioTestHelpers'

// ============================================================================
// Cleanup after each test
// ============================================================================

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// ============================================================================
// Web Audio API Mocks
// ============================================================================

beforeAll(() => {
  // Mock AudioContext
  global.AudioContext = MockAudioContext as any
  global.webkitAudioContext = MockAudioContext as any

  // Mock AudioWorkletNode
  ;(global as any).AudioWorkletNode = MockAudioWorkletNode as any

  // Mock OfflineAudioContext
  ;(global as any).OfflineAudioContext = class MockOfflineAudioContext extends MockAudioContext {
    public length: number
    private _renderPromise: Promise<AudioBuffer> | null = null

    constructor(
      numberOfChannels: number,
      length: number,
      sampleRate: number
    ) {
      super()
      this.length = length
      this.sampleRate = sampleRate
    }

    startRendering(): Promise<AudioBuffer> {
      if (!this._renderPromise) {
        this._renderPromise = Promise.resolve(
          this.createBuffer(2, this.length, this.sampleRate)
        )
      }
      return this._renderPromise
    }

    async suspend(): Promise<void> {
      await super.suspend()
    }

    async resume(): Promise<void> {
      await super.resume()
    }
  } as any

  // Mock HTMLMediaElement properties needed for audio
  Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
    get() {
      return false
    },
    set() {},
  })

  Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
    get() {
      return 1.0
    },
    set() {},
  })

  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
    get() {
      return 0
    },
    set() {},
  })

  Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
    get() {
      return 100
    },
  })

  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    get() {
      return true
    },
  })

  Object.defineProperty(HTMLMediaElement.prototype, 'ended', {
    get() {
      return false
    },
  })

  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    value: vi.fn().mockResolvedValue(undefined),
  })

  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    value: vi.fn(),
  })

  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    value: vi.fn(),
  })
})

// ============================================================================
// Browser API Mocks
// ============================================================================

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  setTimeout(() => callback(Date.now()), 16)
  return 1
}) as any

global.cancelAnimationFrame = vi.fn()

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock FileReader
global.FileReader = class MockFileReader {
  result: string | ArrayBuffer | null = null
  error: DOMException | null = null
  readyState: number = 0
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null

  readAsArrayBuffer(blob: Blob): void {
    this.readyState = 2
    this.result = new ArrayBuffer(8)

    const self = this as any
    setTimeout(() => {
      if (self.onload) {
        self.onload({ target: self } as any)
      }
      if (self.onloadend) {
        self.onloadend({ target: self } as any)
      }
    }, 0)
  }

  readAsDataURL(blob: Blob): void {
    this.readyState = 2
    this.result = 'data:audio/wav;base64,mockdata'

    const self = this as any
    setTimeout(() => {
      if (self.onload) {
        self.onload({ target: self } as any)
      }
      if (self.onloadend) {
        self.onloadend({ target: self } as any)
      }
    }, 0)
  }

  readAsText(blob: Blob): void {
    this.readyState = 2
    this.result = 'mock text'

    const self = this as any
    setTimeout(() => {
      if (self.onload) {
        self.onload({ target: self } as any)
      }
      if (self.onloadend) {
        self.onloadend({ target: self } as any)
      }
    }, 0)
  }

  abort(): void {
    this.readyState = 2
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true
  }
} as any

// ============================================================================
// Custom Matchers (optional, can be expanded)
// ============================================================================

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      }
    }
  },

  toBeCloseToDb(received: number, expected: number, tolerance: number = 0.5) {
    const pass = Math.abs(received - expected) <= tolerance
    if (pass) {
      return {
        message: () =>
          `expected ${received}dB not to be close to ${expected}dB (within ${tolerance}dB)`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${received}dB to be close to ${expected}dB (within ${tolerance}dB), but difference is ${Math.abs(received - expected).toFixed(2)}dB`,
        pass: false,
      }
    }
  },
})

// ============================================================================
// TypeScript declarations for custom matchers
// ============================================================================

interface CustomMatchers<R = unknown> {
  toBeWithinRange(floor: number, ceiling: number): R
  toBeCloseToDb(expected: number, tolerance?: number): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// ============================================================================
// Mock localStorage
// ============================================================================

class LocalStorageMock {
  private store: Map<string, string> = new Map()

  getItem(key: string): string | null {
    return this.store.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null
  }

  get length(): number {
    return this.store.size
  }
}

global.localStorage = new LocalStorageMock() as Storage

// ============================================================================
// Console suppression for cleaner test output (optional)
// ============================================================================

// Suppress console errors in tests unless debugging
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Allow errors through if they're expected (e.g., testing error states)
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented') ||
        args[0].includes('Warning: ReactDOM.render'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})
