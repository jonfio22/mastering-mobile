# AudioWorklet Infrastructure Documentation

## Overview

This is the low-latency audio processing infrastructure for the mastering application. It provides <10ms latency audio processing using AudioWorklet API with a clean TypeScript interface.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Main Thread                          │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │AudioEngine │───▶│WorkletManager│───▶│TypeScript    │    │
│  │            │    │              │    │Types         │    │
│  └────────────┘    └──────────────┘    └──────────────┘    │
│         │                  │                                 │
│         │                  │ postMessage()                   │
│         │                  ▼                                 │
└─────────┼──────────────────────────────────────────────────┘
          │
          │ Web Audio API
          │
┌─────────▼──────────────────────────────────────────────────┐
│                       Audio Thread                          │
│  ┌──────────┐   ┌────────────┐   ┌─────────┐              │
│  │Baxandall │──▶│SSL         │──▶│Limiter  │──▶ Output     │
│  │EQ        │   │Compressor  │   │         │               │
│  └──────────┘   └────────────┘   └─────────┘              │
│      128 samples/block (~2.67ms at 48kHz)                   │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
/public/worklets/
├── processor-worklet.js          # Base processor class
├── baxandall-eq.worklet.js       # Baxandall EQ processor
├── ssl-compressor.worklet.js     # SSL compressor processor
└── limiter.worklet.js            # Brick-wall limiter processor

/src/lib/
├── audio/
│   ├── AudioEngine.ts            # Main audio engine
│   └── README.md                 # This file
├── worklets/
│   └── WorkletManager.ts         # Worklet lifecycle manager
└── types/
    └── worklet.types.ts          # TypeScript type definitions
```

## Quick Start

### 1. Initialize the AudioEngine

```typescript
import { AudioEngine } from '@/lib/audio/AudioEngine';

// Create engine instance
const engine = new AudioEngine({
  sampleRate: 48000,
  latencyHint: 'interactive',
  meteringRate: 60 // Hz
});

// Initialize (loads worklets)
await engine.initialize();

// Resume after user interaction (required by browsers)
await engine.resume();
```

### 2. Connect Audio Source

```typescript
// Option A: Connect HTML audio element
const audioElement = document.querySelector('audio');
engine.connectMediaElement(audioElement);

// Option B: Connect microphone/input
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
engine.connectMediaStream(stream);

// Option C: Load audio file
const response = await fetch('/audio/track.wav');
const arrayBuffer = await response.arrayBuffer();
const audioBuffer = await engine.decodeAudioData(arrayBuffer);
const source = engine.createBufferSource(audioBuffer);
source.start();
```

### 3. Control Parameters

```typescript
// Update EQ
engine.updateEQ({
  bassGain: 3,        // +3 dB bass boost
  trebleGain: -2,     // -2 dB treble cut
  bassFreq: 100,      // 100 Hz shelf
  trebleFreq: 10000   // 10 kHz shelf
});

// Update compressor
engine.updateCompressor({
  threshold: -12,     // -12 dB threshold
  ratio: 4,           // 4:1 ratio
  attack: 10,         // 10ms attack
  release: 100,       // 100ms release
  makeupGain: 3       // +3 dB makeup
});

// Update limiter
engine.updateLimiter({
  threshold: -1,      // -1 dB threshold
  release: 100,       // 100ms release
  ceiling: -0.3       // -0.3 dB ceiling
});

// Bypass controls
engine.bypassEQ(true);
engine.bypassCompressor(false);
engine.bypassLimiter(false);

// Master gain
engine.setInputGain(1.0);   // 0 dB
engine.setOutputGain(0.8);  // -1.94 dB
```

### 4. Get Metering Data

```typescript
// Register metering callback
engine.setOnMetering((metering) => {
  console.log('EQ Output:', metering.eq?.leftPeakDB, 'dB');
  console.log('Compressor GR:', metering.compressor?.gainReduction, 'dB');
  console.log('Limiter Output:', metering.limiter?.leftPeakDB, 'dB');
});

// Get current metering snapshot
const metering = engine.getMetering();
```

### 5. Cleanup

```typescript
// When done
await engine.dispose();
```

## Latency Analysis

### Processing Latency Breakdown

| Component | Latency |
|-----------|---------|
| AudioContext base latency | ~3ms (browser-dependent) |
| Block size (128 samples @ 48kHz) | 2.67ms |
| Worklet processing overhead | <0.5ms |
| **Total round-trip latency** | **<7ms** |

### Optimization Techniques

1. **Block Size**: Fixed 128 samples for predictable latency
2. **Zero-Copy Processing**: Direct Float32Array manipulation
3. **Minimal Branching**: Optimized DSP inner loops
4. **Pre-Calculated Coefficients**: Update only on parameter change
5. **SIMD-Friendly Code**: Compiler can auto-vectorize

## Type-Safe Messaging

All worklet communication is type-safe:

```typescript
// Parameter types are enforced
interface BaxandallEQParams {
  bassGain: number;      // -12 to +12 dB
  trebleGain: number;    // -12 to +12 dB
  bassFreq: number;      // 50-500 Hz
  trebleFreq: number;    // 2000-16000 Hz
  bypass: boolean;
}

// Metering data structure
interface MeteringData {
  leftPeak: number;      // Linear 0-1
  rightPeak: number;
  leftRMS: number;
  rightRMS: number;
  leftPeakDB: number;    // dB
  rightPeakDB: number;
  leftRMSDB: number;
  rightRMSDB: number;
}
```

## Error Handling

The engine includes comprehensive error handling:

```typescript
// Register error handler
engine.setOnError((error) => {
  console.error('Audio error:', error);

  if (error instanceof WorkletError) {
    switch (error.code) {
      case WorkletErrorCode.NOT_SUPPORTED:
        // Show fallback UI
        break;
      case WorkletErrorCode.LOAD_FAILED:
        // Retry loading
        break;
      // ... handle other errors
    }
  }
});

// Check browser support
const manager = new WorkletManager();
const support = manager.checkBrowserSupport();

if (!support.supported) {
  console.error(support.reason);
  // Show fallback UI
}
```

## Browser Compatibility

| Browser | AudioWorklet Support | Notes |
|---------|---------------------|-------|
| Chrome 66+ | ✅ | Full support |
| Firefox 76+ | ✅ | Full support |
| Safari 14.1+ | ✅ | Full support |
| Edge 79+ | ✅ | Full support |

**Minimum Requirements:**
- Modern browser with AudioWorklet API
- HTTPS or localhost (required for AudioContext)
- User interaction before audio playback

## Performance Monitoring

The engine includes built-in performance monitoring:

```typescript
// Performance data is sent every second
engine.setOnMetering((metering) => {
  // Check CPU usage in worklet processors
  // High CPU load warnings are logged automatically
});

// Each worklet reports:
// - avgProcessTimeMs: Average processing time
// - maxProcessTimeMs: Peak processing time
// - cpuLoad: Percentage of available time used
// - processCount: Number of blocks processed
```

## Next Steps (Tasks 2.x)

The DSP implementations are placeholders. The actual audio processing will be implemented in:

- **Task 2.1**: Baxandall EQ DSP (shelf filter design)
- **Task 2.2**: SSL Compressor DSP (envelope follower, compression curve)
- **Task 2.3**: Limiter DSP (true peak detection, brick-wall limiting)

All infrastructure is in place for these implementations.

## Testing

To verify the infrastructure is working:

```typescript
// 1. Check browser support
const manager = new WorkletManager();
const support = manager.checkBrowserSupport();
console.log('AudioWorklet supported:', support.supported);

// 2. Initialize engine
const engine = new AudioEngine();
await engine.initialize();
console.log('Engine state:', engine.getState()); // Should be 'ready'

// 3. Check worklets loaded
console.log('Worklets:', engine.getContext()); // Should show all nodes

// 4. Test bypass
engine.bypassEQ(true);
engine.bypassCompressor(true);
engine.bypassLimiter(true);

// 5. Connect audio and verify pass-through
```

## Advanced Usage

### Custom Worklet Integration

```typescript
// Load a custom worklet
const config: WorkletConfig = {
  name: 'my-processor',
  url: '/worklets/my-processor.worklet.js',
  processorName: 'my-processor',
  processorOptions: { /* custom params */ }
};

await workletManager.loadWorklet(config);
```

### Hot-Reload (Development)

```typescript
// Reload a worklet (useful for development)
await workletManager.reloadWorklet('baxandall-eq');
```

### Direct Worklet Access

```typescript
// Get worklet node for custom routing
const eqNode = workletManager.getNode('baxandall-eq');
const customNode = audioContext.createGain();
eqNode?.connect(customNode);
```

## Troubleshooting

### Common Issues

1. **"AudioWorklet not supported"**
   - Ensure HTTPS or localhost
   - Check browser version
   - Use browser compatibility fallback

2. **"Failed to load worklet module"**
   - Verify `/public/worklets/` directory exists
   - Check Next.js static file serving
   - Inspect network tab for 404 errors

3. **"AudioContext suspended"**
   - Call `engine.resume()` after user interaction
   - Required by browser autoplay policies

4. **High CPU usage**
   - Check performance logs
   - Verify sample rate (48kHz recommended)
   - Consider increasing block size (trade-off with latency)

### Debug Mode

```typescript
// Enable verbose logging
const engine = new AudioEngine({ /* config */ });
engine.setOnStateChange((state) => {
  console.log('[DEBUG] Engine state:', state);
});
```

## Resources

- [Web Audio API Spec](https://www.w3.org/TR/webaudio/)
- [AudioWorklet Examples](https://github.com/GoogleChromeLabs/web-audio-samples)
- [MDN AudioWorklet Guide](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
