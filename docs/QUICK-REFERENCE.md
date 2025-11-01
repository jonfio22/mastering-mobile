# Mastering Mobile - Quick Reference Guide

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      React UI Layer                              │
│  ┌─────────────┬──────────────┬─────────────┬──────────────┐    │
│  │AudioUploader│ AudioPlayer  │MasterSection│  EQSection   │    │
│  │             │              │             │              │    │
│  │RotaryKnob  │VerticalFader │ VUMeter    │HardwareButton│    │
│  └─────────────┴──────────────┴─────────────┴──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            △
                            │ State/Metering
                            │
┌─────────────────────────────────────────────────────────────────┐
│                    State Management Layer                        │
│            (Zustand Store - To Be Implemented)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Audio Engine State │ Metering Data │ Analysis Results   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            △
                            │
┌─────────────────────────────────────────────────────────────────┐
│                  Audio Processing Layer                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Audio Engines (TypeScript)                    │   │
│  │  ┌──────────────────┬──────────────────────────────────┐ │   │
│  │  │  BaseAudioEngine │  AudioEngine/MasteringEngine     │ │   │
│  │  │                  │  (Worklet-based)                │ │   │
│  │  │  ├─ File Loading │  ├─ Real-time Processing       │ │   │
│  │  │  ├─ Playback     │  ├─ Low-latency (<10ms)        │ │   │
│  │  │  ├─ Metering     │  ├─ Worklet Chain              │ │   │
│  │  │  └─ 44.1-192kHz  │  └─ Metering/Perf Monitoring   │ │   │
│  │  └──────────────────┴──────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            △
                            │
┌─────────────────────────────────────────────────────────────────┐
│               Audio Worklet Processing Layer                     │
│                                                                   │
│  Input → EQ Worklet → Compressor Worklet → Limiter → Output    │
│          (Baxandall) (SSL-style)         (Fast)                 │
│          Parameters: bassGain,  threshold, threshold,           │
│          trebleGain trebleGain  ratio      release               │
│                                 attack     ceiling               │
│                                 release                          │
│                                 makeupGain                       │
└─────────────────────────────────────────────────────────────────┘
                            △
                            │
┌─────────────────────────────────────────────────────────────────┐
│                   AI Analysis Layer                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            AIAnalysis (Client-side)                      │   │
│  │                                                          │   │
│  │  Frequency    │ Phase       │ Tonal      │ Mix          │   │
│  │  Masking      │ Correlation │ Balance    │ Critique     │   │
│  │  Detection    │ Analysis    │ Analysis   │ Generation   │   │
│  │               │             │            │              │   │
│  │  ├─ FFT       │ ├─ Phase    │ ├─ K-weight│ ├─ Scoring  │   │
│  │  ├─ Critical  │ ├─ Stereo   │ ├─ Fletcher│ ├─ Issues   │   │
│  │  └─ Bands     │ └─ Compatibility      │ │ └─ Feedback│   │
│  │               │                       └─ Flat Curve    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Audio Processing Signal Chain

```
                    Real-time Processing (AudioEngine)
                    
Input Source ──→ Input Gain ──→ EQ ──→ Compressor ──→ Limiter ──→ Output Gain ──→ Destination
(File/Stream)                  (3-5) (-20 to 50)  (-30 to 0)     dB adjust       Speaker
                               |     |            |
                    Metering ←─┴─────┴────────────┘
                    (60Hz updates)
```

## AI Analysis Pipeline

```
Audio Buffer (WAV, MP3, etc.)
        │
        ↓
    Spectral Analysis (FFT 8192)
        │
        ├────→ Frequency Masking Detection
        │      ├─ 24 Bark scale bands
        │      ├─ Psychoacoustic masking
        │      └─ Outputs: MaskingIssue[]
        │
        ├────→ Phase Correlation Analysis
        │      ├─ Stereo coherence check
        │      ├─ Frequency-dependent analysis
        │      └─ Outputs: PhaseIssue[]
        │
        ├────→ Tonal Balance Analysis
        │      ├─ Reference curve comparison
        │      ├─ Energy distribution
        │      └─ Outputs: TonalIssue[]
        │
        ├────→ Dynamic Range Analysis
        │      ├─ Crest factor
        │      ├─ Peak-to-RMS
        │      └─ Outputs: DynamicRangeData
        │
        └────→ Loudness Analysis (LUFS)
               ├─ Integrated LUFS
               ├─ Momentary max
               └─ Outputs: LoudnessData
               
        All Results ──→ Mix Critique Generator
                       ├─ Quality Score (0-100)
                       ├─ Strengths/Improvements
                       ├─ Priority Issues
                       └─ Outputs: MixCritique

Final Output: AnalysisResult {
  issues, issuesBySeverity, critique, metrics...
}
```

## Component Integration Map

```
Component Tree:

App/Layout
│
├─ AudioUploader
│  └─ File Selection → BaseAudioEngine.loadAudio()
│
├─ AudioPlayer
│  ├─ Play/Pause/Stop → BaseAudioEngine.play/pause/stop()
│  └─ Progress → BaseAudioEngine.getCurrentTime()
│
├─ MasterSection
│  ├─ Input Level Knob → AudioEngine.setInputGain()
│  ├─ Stereo Width → AudioEngine.updateCompressor()
│  ├─ LUFS Meter → AIAnalysis.loudness data
│  └─ Analyze Button → AIAnalysis.analyzeAudio()
│
├─ EQSection
│  ├─ Bass Knob → AudioEngine.updateEQ({ bassGain })
│  └─ Treble Knob → AudioEngine.updateEQ({ trebleGain })
│
├─ MonitorSection
│  └─ Reference Level → Display setting
│
└─ VUMeter
   └─ Metering Display ← AudioEngine.getMetering() data
```

## Type System Quick Guide

### Audio Types
```typescript
// Engine State
type AudioEngineState = 'idle' | 'loading' | 'ready' | 'processing' | 'error'

// Processing Parameters
interface BaxandallEQParams {
  bassGain: number       // -12 to +12 dB
  trebleGain: number     // -12 to +12 dB
  bassFreq: number       // Hz
  trebleFreq: number     // Hz
}

interface SSLCompressorParams {
  threshold: number      // dB
  ratio: number          // Compression ratio
  attack: number         // ms
  release: number        // ms
  makeupGain: number     // dB
}

// Metering
interface MeteringData {
  peakL: number          // dBFS
  peakR: number          // dBFS
  rmsL: number           // dBFS
  rmsR: number           // dBFS
  timestamp: number      // ms
  samplePosition: number // sample index
}
```

### AI Analysis Types
```typescript
// Analysis Result
interface AnalysisResult {
  timestamp: number
  duration: number
  issues: AudioIssue[]           // All detected issues
  issuesBySeverity: {
    critical: AudioIssue[]
    high: AudioIssue[]
    medium: AudioIssue[]
    low: AudioIssue[]
  }
  critique: MixCritique          // Professional critique
  spectralAnalysis: SpectralAnalysis
  criticalBands: CriticalBandEnergy[]
  phaseCorrelation: PhaseData
  dynamicRange: DynamicRangeData
  loudness: LoudnessData
  processingTime: number         // ms
}

// Issue Types
type Severity = 'low' | 'medium' | 'high' | 'critical'
type AudioIssue = MaskingIssue | PhaseIssue | TonalIssue

// Mix Critique
interface MixCritique {
  summary: string
  score: QualityScore              // 0-100
  strengths: string[]
  improvements: string[]
  priorityIssues: AudioIssue[]
  estimatedImprovement: {
    scoreIncrease: number
    description: string
  }
}
```

## Key APIs

### AudioEngine
```typescript
// Initialization
const engine = new AudioEngine({ sampleRate: 48000 })
await engine.initialize()

// Parameter Control
engine.updateEQ({ bassGain: 6, trebleGain: -3 })
engine.updateCompressor({ threshold: -10, ratio: 4 })
engine.updateLimiter({ threshold: -1 })
engine.setInputGain(0.8)
engine.setOutputGain(1.0)

// Bypass
engine.bypassEQ(false)

// Metering
const metering = engine.getMetering()
// → { input, eq, compressor, limiter, output }

// Event Handlers
engine.setOnMetering((data) => console.log(data))
engine.setOnError((error) => console.error(error))
engine.setOnStateChange((state) => console.log(state))

// Cleanup
await engine.dispose()
```

### BaseAudioEngine
```typescript
// File Handling
const engine = new BaseAudioEngine(48000)
await engine.initialize()
await engine.loadAudio(file)

// Playback Control
engine.play()
engine.pause()
engine.stop()
engine.seek(10.5)

// Metering
const metering = engine.getMeteringData()
// → { peakL, peakR, rmsL, rmsR, ... }

// Cleanup
engine.cleanup()
```

### AIAnalysis
```typescript
// Configuration
const analyzer = new AIAnalysis({
  fftSize: 8192,
  enableMaskingDetection: true,
  enablePhaseAnalysis: true,
  enableTonalBalance: true,
  confidenceThreshold: 0.6,
  referenceCurve: 'k-weighting'
})

// Initialize & Analyze
await analyzer.initialize()
const result = await analyzer.analyzeAudio(audioBuffer)

// Result Structure
console.log(result.issues)           // All issues found
console.log(result.critique.score)   // Quality score (0-100)
console.log(result.loudness)         // LUFS measurements
console.log(result.processingTime)   // Analysis time (ms)

// Cleanup
analyzer.cleanup()
```

## Common Integration Patterns

### Pattern 1: Real-time Mastering
```typescript
// Initialize engine
const engine = new AudioEngine()
await engine.initialize()

// Connect input (e.g., microphone)
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
engine.connectMediaStream(stream)

// Setup metering
engine.setOnMetering((metering) => {
  updateVUMeter(metering.output)
})

// Apply processing
engine.updateEQ({ bassGain: 3 })
engine.updateCompressor({ threshold: -15, ratio: 3 })

// Adjust
engine.setOutputGain(0.9)
```

### Pattern 2: File Analysis
```typescript
// Load and analyze
const engine = new BaseAudioEngine(48000)
await engine.initialize()
await engine.loadAudio(audioFile)

// Analyze with AI
const analyzer = new AIAnalysis()
await analyzer.initialize()
const result = await analyzer.analyzeAudio(engine.getAudioBuffer())

// Display results
displayIssues(result.issues)
displayCritique(result.critique)
displayMetrics(result.loudness, result.dynamicRange)
```

### Pattern 3: Signal Chain Customization
```typescript
// Create custom processor
const myProcessor = audioContext.createGain()

// Add to engine
engine.connectProcessor(myProcessor)

// Can also add in parallel
engine.connectProcessor(anotherProcessor, true) // parallel = true

// Control order via connectProcessor order
```

## Testing Strategy

```bash
# Unit Tests (Vitest)
npm run test              # Run all tests
npm run test:coverage     # Coverage report
npm run test:ui          # Interactive test UI

# E2E Tests (Playwright)
npm run test:e2e         # Run tests
npm run test:e2e:ui      # UI mode
npm run test:e2e:debug   # Debug mode

# Code Quality
npm run lint             # ESLint
npm run typecheck        # TypeScript checking
```

## Performance Considerations

### Audio Processing
- Worklet threads don't block main thread
- Metering runs at configurable rate (default 60Hz)
- Buffer sizes optimized for real-time response
- Latency <10ms typical

### AI Analysis
- Client-side processing (no network overhead)
- FFT analysis parallelizable
- Processing time: ~100-500ms for typical track
- Memory efficient (no model loading required)

### UI Rendering
- Use React.memo for metering components
- Debounce parameter updates
- Consider requestAnimationFrame for visualizations

## Deployment Checklist

- [ ] All worklets in public/worklets/ are served correctly
- [ ] AudioContext initialization after user interaction
- [ ] Error boundaries implemented
- [ ] Loading states visible
- [ ] HTTPS for production (AudioContext requirement)
- [ ] Test on target browsers (Chrome, Firefox, Safari, Edge)
- [ ] Mobile touch handling for knobs/faders
- [ ] Memory cleanup on unmount
- [ ] Service Worker for offline capability (optional)
- [ ] Analytics/error reporting configured

---

## Additional Resources

- ARCHITECTURE.md - Detailed system design
- src/lib/audio/ - Audio engine implementations
- src/lib/ai/ - AI analysis modules
- public/worklets/ - AudioWorklet processors
- src/components/mastering/ - UI components

