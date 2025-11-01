# Testing Infrastructure Documentation

## Overview

This document describes the testing setup for the mastering-mobile audio application. The testing infrastructure includes both unit tests (Vitest) and end-to-end tests (Playwright), with comprehensive support for testing Web Audio API functionality.

## Test Stack

### Unit Testing: Vitest
- **Framework**: Vitest (v4.0.6)
- **Test Environment**: jsdom
- **UI**: Vitest UI for interactive test running
- **Coverage**: V8 coverage provider
- **Testing Library**: React Testing Library with Jest DOM matchers

### E2E Testing: Playwright
- **Framework**: Playwright Test
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 13, iPad Pro emulation
- **Features**: Screenshots, videos, traces on failure

## Running Tests

### Unit Tests

```bash
# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### End-to-End Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

## Project Structure

```
mastering-mobile/
├── src/
│   └── lib/
│       ├── test-utils/
│       │   ├── audioTestHelpers.ts    # Audio testing utilities
│       │   └── setup.ts                # Global test setup
│       ├── utils/
│       │   └── audioHelpers.test.ts   # Audio helper function tests
│       └── audioEngine.test.ts        # Audio engine tests (skeleton)
├── e2e/
│   └── example.spec.ts                # E2E test examples
├── vitest.config.ts                   # Vitest configuration
└── playwright.config.ts               # Playwright configuration
```

## Audio Test Helpers

The `/Users/fiorante/Documents/mastering-mobile/src/lib/test-utils/audioTestHelpers.ts` file provides comprehensive utilities for testing audio functionality:

### Mock Web Audio API

```typescript
import { MockAudioContext } from '@/lib/test-utils/audioTestHelpers'

const audioContext = new MockAudioContext()
const gainNode = audioContext.createGain()
const filter = audioContext.createBiquadFilter()
```

### Test Signal Generators

```typescript
import {
  generateSineWave,
  generateWhiteNoise,
  generateImpulse
} from '@/lib/test-utils/audioTestHelpers'

// Generate a 440Hz sine wave at 44.1kHz for 1 second
const sineWave = generateSineWave(440, 1.0, 44100, 1.0)

// Generate white noise
const noise = generateWhiteNoise(1.0, 44100, 0.5)

// Generate impulse response
const impulse = generateImpulse(0.1, 44100, 1.0, 0.05)
```

### Audio Analysis Functions

```typescript
import {
  calculateRMS,
  calculatePeak,
  linearToDb,
  dbToLinear,
  detectClipping
} from '@/lib/test-utils/audioTestHelpers'

const rms = calculateRMS(audioBuffer)
const peak = calculatePeak(audioBuffer)
const dbValue = linearToDb(0.5)  // -6.02 dB
const hasClipping = detectClipping(audioBuffer, 0.99)
```

### Assertion Helpers

```typescript
import {
  assertAudioLevelInRange,
  assertBuffersEqual,
  assertNoClipping
} from '@/lib/test-utils/audioTestHelpers'

// Assert audio level is between -10dB and 0dB
assertAudioLevelInRange(buffer, -10, 0)

// Assert two buffers are equal within tolerance
assertBuffersEqual(actual, expected, 0.001)

// Assert no clipping occurred
assertNoClipping(processedBuffer)
```

### FFT Helpers

```typescript
import {
  calculateFFTMagnitude,
  findDominantFrequency
} from '@/lib/test-utils/audioTestHelpers'

const fft = calculateFFTMagnitude(audioBuffer)
const dominantFreq = findDominantFrequency(fft, 44100)
```

## Global Test Setup

The `/Users/fiorante/Documents/mastering-mobile/src/lib/test-utils/setup.ts` file automatically:

- Mocks the Web Audio API (AudioContext, OfflineAudioContext, AudioWorkletNode)
- Mocks browser APIs (FileReader, URL.createObjectURL, requestAnimationFrame)
- Sets up React Testing Library cleanup
- Provides custom matchers:
  - `toBeWithinRange(min, max)` - Check if number is within range
  - `toBeCloseToDb(expected, tolerance)` - Check if dB values are close

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MockAudioContext, generateSineWave } from '@/lib/test-utils/audioTestHelpers'

describe('Audio Processing', () => {
  let audioContext: MockAudioContext

  beforeEach(() => {
    audioContext = new MockAudioContext()
  })

  it('should process audio correctly', () => {
    const input = generateSineWave(440, 1.0, 44100)
    // Your processing logic here
    expect(input.length).toBe(44100)
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should load audio processor', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Mastering/)
  // Test your audio UI
})
```

## Test Configuration

### Vitest Configuration

Key settings in `/Users/fiorante/Documents/mastering-mobile/vitest.config.ts`:

- **Environment**: jsdom (for DOM and Web Audio API)
- **Globals**: true (no need to import test functions)
- **Setup Files**: Automatically runs global setup
- **Coverage**: V8 provider with HTML/LCOV reporting
- **Timeout**: 10 seconds (for audio processing tests)
- **Path Aliases**: `@/*` maps to `./src/*`

### Playwright Configuration

Key settings in `/Users/fiorante/Documents/mastering-mobile/playwright.config.ts`:

- **Base URL**: http://localhost:3000
- **Browsers**: Desktop (Chrome, Firefox, Safari) + Mobile (Pixel 5, iPhone 13, iPad Pro)
- **Artifacts**: Screenshots and videos on failure, traces on retry
- **Dev Server**: Automatically starts Next.js dev server
- **Audio Permissions**: Configured for microphone access
- **Fake Media**: Uses fake audio/video streams for testing

## Testing Strategy

### Unit Tests

Focus on testing:
1. **Audio Signal Processing** - EQ, compression, limiting algorithms
2. **Audio Utilities** - Level calculations, conversions, analysis
3. **DSP Functions** - FFT, filtering, effects
4. **Audio Helpers** - File loading, format conversion

### Integration Tests

Test component integration:
1. **Audio Engine** - Full processing chain
2. **Parameter Changes** - UI → Engine → Output
3. **State Management** - Audio state persistence
4. **File I/O** - Upload and download workflows

### E2E Tests

Test user workflows:
1. **Audio Upload** - Drag & drop, file picker
2. **Processing** - Apply EQ, compression, limiting
3. **Playback** - Play, pause, seek
4. **Export** - Download processed audio
5. **UI Interactions** - Knobs, faders, buttons

## Coverage Goals

- **Overall Coverage**: 80%+
- **Audio Processing Core**: 90%+
- **UI Components**: 70%+
- **Utilities**: 85%+

## CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run Unit Tests
  run: npm run test -- --run

- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Best Practices

### Audio Testing

1. **Use Test Signals**: Always use generated test signals (sine waves, noise) for reproducible tests
2. **Tolerance**: Use appropriate tolerances for floating-point comparisons (audio is inherently imprecise)
3. **RMS vs Peak**: Test both RMS and peak levels for comprehensive level analysis
4. **Frequency Domain**: Use FFT tests to verify EQ and filter behavior
5. **Mock Async**: Web Audio API is async - mock it properly or tests will be flaky

### General Testing

1. **Arrange-Act-Assert**: Structure tests clearly
2. **One Assertion Per Test**: Keep tests focused
3. **Descriptive Names**: Test names should describe what they test
4. **Cleanup**: Always clean up audio contexts and nodes
5. **Isolation**: Tests should not depend on each other

## Troubleshooting

### Common Issues

**Tests hang or timeout:**
- Check for unmocked async Audio API calls
- Ensure audio contexts are properly closed
- Increase timeout in vitest.config.ts

**Web Audio API errors:**
- Verify mocks are loaded (check setup.ts)
- Ensure AudioContext is created in beforeEach, not globally

**Path resolution errors:**
- Check tsconfig.json paths match vitest.config.ts
- Verify `@/` alias is working

**Playwright can't find browser:**
- Run `npx playwright install` to download browsers

## Next Steps

1. **Task 1.10**: Implement actual audio engine tests
2. **Add Integration Tests**: Test full processing chain
3. **Add E2E Tests**: Test complete user workflows
4. **Set up CI**: Automate test running
5. **Coverage Monitoring**: Track coverage over time

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Web Audio API Testing Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Testing)
