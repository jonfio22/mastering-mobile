# Mastering Mobile - Codebase Analysis & Documentation

This directory contains a professional audio mastering web application built with Next.js, React, and TypeScript. This document serves as an index to all analysis documentation.

## Quick Start for Understanding the Codebase

### For First-Time Readers

1. **Start here**: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) (5 min read)
   - Visual architecture diagrams
   - Key APIs at a glance
   - Common patterns
   - Performance tips

2. **Deep dive**: [ARCHITECTURE.md](./ARCHITECTURE.md) (15 min read)
   - Complete system breakdown
   - All components explained
   - Design patterns
   - Current state vs needed work

### For Quick Lookups

- **How do I use the AudioEngine?** → [QUICK-REFERENCE.md](./QUICK-REFERENCE.md#key-apis)
- **What components exist?** → [ARCHITECTURE.md](./ARCHITECTURE.md#3-ui-components)
- **How is state managed?** → [ARCHITECTURE.md](./ARCHITECTURE.md#4-state-management)
- **What's the signal chain?** → [QUICK-REFERENCE.md](./QUICK-REFERENCE.md#audio-processing-signal-chain)

---

## System Overview

### What This App Does

A professional audio mastering platform that:
1. **Processes audio** in real-time with professional-grade EQ, compression, and limiting
2. **Analyzes audio** client-side using AI algorithms (no server needed)
3. **Provides UI** that emulates professional hardware mastering consoles
4. **Generates critiques** with detailed suggestions for improvement

### Core Strengths

- **Separation of Concerns**: Audio engines are completely independent from UI
- **Type Safety**: Full TypeScript with no `any` types in public APIs
- **Performance**: Low-latency processing (<10ms) using AudioWorklets
- **Client-Side**: All AI analysis runs in the browser (zero server overhead)
- **Professional Quality**: Abbey Road Studios-level mastering algorithms

---

## Directory Structure

```
mastering-mobile/
├── src/
│   ├── lib/
│   │   ├── audio/              # Audio processing engines
│   │   │   ├── AudioEngine.ts           # Worklet-based real-time
│   │   │   ├── BaseAudioEngine.ts       # File playback
│   │   │   ├── MasteringEngine.ts       # Mastering-focused
│   │   │   └── verify-setup.ts
│   │   │
│   │   ├── ai/                 # AI analysis system
│   │   │   ├── aiAnalysis.ts           # Main analysis engine
│   │   │   ├── types.ts                # AI type definitions
│   │   │   └── algorithms/
│   │   │       ├── frequencyMasking.ts
│   │   │       ├── phaseAnalysis.ts
│   │   │       ├── tonalBalance.ts
│   │   │       └── mixCritique.ts
│   │   │
│   │   ├── types/              # Core type definitions
│   │   │   ├── audio.ts
│   │   │   └── worklet.types.ts
│   │   │
│   │   ├── utils/              # Helper utilities
│   │   │   └── audioHelpers.ts
│   │   │
│   │   ├── worklets/           # Worklet management
│   │   │   └── WorkletManager.ts
│   │   │
│   │   └── test-utils/         # Testing utilities
│   │
│   ├── components/mastering/   # UI components
│   │   ├── RotaryKnob.tsx
│   │   ├── VerticalFader.tsx
│   │   ├── VUMeter.tsx
│   │   ├── HardwareButton.tsx
│   │   ├── EQSection.tsx
│   │   ├── MonitorSection.tsx
│   │   ├── MasterSection.tsx
│   │   ├── AudioUploader.tsx
│   │   └── AudioPlayer.tsx
│   │
│   ├── pages/                  # Next.js pages
│   └── styles/                 # Global styles
│
├── public/
│   └── worklets/               # AudioWorklet processors
│       ├── baxandall-eq.worklet.js
│       ├── ssl-compressor.worklet.js
│       ├── limiter.worklet.js
│       └── processor-worklet.js
│
├── ARCHITECTURE.md             # Detailed system design (13 sections)
├── QUICK-REFERENCE.md          # Quick lookup guide with diagrams
├── README-ANALYSIS.md          # This file
├── package.json
├── vitest.config.ts            # Unit test configuration
├── playwright.config.ts        # E2E test configuration
└── tsconfig.json
```

---

## Component Relationships

### Audio Engines Hierarchy

```
AudioContext (Web Audio API)
  ↓
WorkletManager (loads and manages worklets)
  ↓
  ├── AudioEngine (real-time processing)
  │   ├── Input Gain → EQ Worklet → Compressor Worklet → Limiter → Output
  │   └── Metering (60Hz updates)
  │
  ├── BaseAudioEngine (file playback)
  │   ├── File loading & decoding
  │   ├── Playback control
  │   └── Signal chain (serial/parallel)
  │
  └── MasteringEngine (specialized)
      └── Pre-configured for mastering workflow
```

### UI Component Hierarchy

```
App / Layout
  ├── AudioUploader       (file selection)
  ├── AudioPlayer         (playback controls)
  ├── MasterSection       (main controls)
  │   ├── RotaryKnob (input level)
  │   ├── RotaryKnob (stereo width)
  │   ├── Indicators (peak track, loop)
  │   └── RotaryKnob (analyze)
  ├── EQSection          (EQ controls)
  ├── MonitorSection     (monitoring)
  └── VUMeter            (level display)
```

### Data Flow (To Be Implemented)

```
User Input
  ↓
UI Component (MasterSection, EQSection, etc.)
  ↓
Zustand Store (audio state)
  ↓
Audio Engine (AudioEngine, BaseAudioEngine)
  ↓
AudioWorklets / AI Analysis
  ↓
Metering/Results
  ↓
Zustand Store (update state)
  ↓
UI Components (render updates)
```

---

## What's Ready to Use

### Fully Implemented (No Further Development Needed)

✓ **AudioEngine** - Real-time mastering with worklets
✓ **BaseAudioEngine** - File playback with flexible signal chain
✓ **AIAnalysis** - Complete audio analysis system
✓ **4 AudioWorklets** - EQ, Compressor, Limiter, Generic
✓ **All UI Components** - RotaryKnob, Faders, Meters, etc.
✓ **Type Definitions** - Full TypeScript coverage
✓ **Error Handling** - Comprehensive error framework
✓ **Test Infrastructure** - Vitest & Playwright configured

### In Progress (UI ↔ Engine Integration)

~ **State Management** - Zustand installed but not yet used
~ **Component Connections** - UI not wired to audio engines
~ **Metering Display** - Components exist but not connected
~ **Error Notifications** - Framework exists but no UI

### Not Yet Implemented

✗ **Zustand Store** - Create for audio engine state
✗ **AudioUploader Integration** - Connect to BaseAudioEngine
✗ **AudioPlayer Integration** - Connect to playback controls
✗ **Parameter Binding** - UI knobs to engine parameters
✗ **Analysis Results Display** - Show AI findings to user
✗ **Error Notifications** - User-facing error messages
✗ **E2E Tests** - Full user flow testing

---

## Key Algorithms & Capabilities

### Audio Processing

**EQ (Baxandall Shelving)**
- Bass control: -12 to +12 dB @ variable frequency
- Treble control: -12 to +12 dB @ variable frequency
- Real-time adjustment

**Compressor (SSL-style)**
- Threshold: -20 to 0 dB
- Ratio: 1:1 to 10:1
- Attack: 0.1 to 100 ms
- Release: 10 to 1000 ms
- Makeup gain: automatic or manual

**Limiter (Fast)**
- Threshold: -30 to 0 dB
- Release: 10 to 1000 ms
- Ceiling: prevents clipping

### AI Analysis

**Frequency Masking Detection**
- Uses 24 Bark scale critical bands
- Psychoacoustic masking models
- Detects frequency interference issues

**Phase Correlation Analysis**
- Stereo field coherence checking
- Mono compatibility warnings
- Frequency-dependent analysis

**Tonal Balance**
- Compares against 3 reference curves (K-weighting, Fletcher-Munson, Flat)
- Energy distribution by frequency band
- Deviation from ideal response

**Mix Critique**
- Overall quality score (0-100)
- Category breakdown (frequency, dynamics, stereo, clarity, loudness)
- Specific actionable suggestions
- Genre-specific recommendations (optional)

---

## Technology Stack Details

### Runtime
- **Next.js 14.2.16** - React framework with API routes
- **React 18.3.1** - Component library
- **TypeScript 5** - Type system

### Styling
- **Tailwind CSS 3.4** - Utility-first styling
- **Lucide React** - Icon library

### State Management
- **Zustand 5.0.8** - Lightweight state (installed, not yet used)

### Testing
- **Vitest 4.0.6** - Unit testing framework
- **Playwright 1.56.1** - E2E testing framework
- **@testing-library/react** - Component testing

### Audio/ML
- **Web Audio API** - Native browser audio
- **AudioWorklet** - Low-latency audio processing
- **TensorFlow.js 4.22.0** - ML library (installed, not yet used)

---

## Installation & Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
cd /Users/fiorante/Documents/mastering-mobile
npm install
```

### Development
```bash
npm run dev              # Start dev server (localhost:3000)
npm run typecheck       # Check TypeScript
npm run lint            # Run ESLint
```

### Testing
```bash
npm run test            # Unit tests
npm run test:coverage   # Coverage report
npm run test:e2e        # E2E tests
npm run test:e2e:debug  # Debug E2E
```

### Production
```bash
npm run build           # Build for production
npm run start           # Start production server
```

---

## Integration Roadmap

### Phase 1: State Management (Priority: High)
1. Create `src/lib/stores/audioStore.ts` with Zustand
2. Define state interface for audio engines
3. Add actions for parameter updates
4. Connect metering callbacks

### Phase 2: Core Integration (Priority: High)
1. Connect MasterSection → AudioEngine
2. Connect EQSection → EQ parameters
3. Connect VUMeter → Real-time metering
4. Add loading/error states

### Phase 3: File Workflow (Priority: Medium)
1. Wire AudioUploader → BaseAudioEngine
2. Wire AudioPlayer → Playback controls
3. Implement analysis trigger
4. Display analysis results

### Phase 4: Polish (Priority: Medium)
1. Add error boundaries
2. Implement error notifications
3. Add E2E tests
4. Performance optimization

---

## Common Tasks

### Task: Use AudioEngine for Real-Time Processing
See: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md#key-apis) → AudioEngine API

### Task: Implement File Upload
See: [ARCHITECTURE.md](./ARCHITECTURE.md#3-ui-components) → AudioUploader section

### Task: Display Analysis Results
See: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md#type-system-quick-guide) → AI Analysis Types

### Task: Create State Management
See: [ARCHITECTURE.md](./ARCHITECTURE.md#4-state-management) → Recommendations

### Task: Understand Signal Chain
See: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md#audio-processing-signal-chain)

---

## Performance Tips

### Audio Processing
- Worklets run off-main-thread (no jank)
- Adjust metering rate if needed (default 60Hz)
- Use bypass for disabled processors

### AI Analysis
- Processing runs asynchronously
- Typical time: 100-500ms for 3-minute track
- Use Web Workers for long tracks if needed

### React Rendering
- Wrap metering components with React.memo
- Debounce parameter updates
- Use requestAnimationFrame for visualizations

---

## Deployment Checklist

- [ ] All worklets in `public/worklets/` are served
- [ ] HTTPS enabled (AudioContext requirement)
- [ ] AudioContext initialized after user interaction
- [ ] Error boundaries implemented
- [ ] Loading states visible
- [ ] Tested on: Chrome, Firefox, Safari, Edge
- [ ] Mobile touch support for controls
- [ ] Memory cleanup on unmount
- [ ] Analytics configured (optional)

---

## Resources

### Official Documentation
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode)
- [Zustand](https://github.com/pmndrs/zustand)
- [Next.js](https://nextjs.org/)

### Audio Theory
- [Bark Scale (Critical Bands)](https://en.wikipedia.org/wiki/Bark_scale)
- [Psychoacoustics](https://en.wikipedia.org/wiki/Psychoacoustics)
- [LUFS Loudness](https://en.wikipedia.org/wiki/LUFS)

### Related Files in This Project
- `src/lib/audio/AudioEngine.ts` - Real-time processing
- `src/lib/audio/BaseAudioEngine.ts` - File playback
- `src/lib/ai/aiAnalysis.ts` - AI analysis system
- `src/lib/ai/algorithms/*.ts` - Specific algorithms
- `public/worklets/*.js` - Audio processors

---

## File Statistics

| Category | Files | Status |
|----------|-------|--------|
| Audio Engines | 3 | Complete |
| AI Algorithms | 4 | Complete |
| UI Components | 9 | Complete |
| Type Definitions | 3 | Complete |
| Utilities | 3 | Complete |
| Tests | 3 | Partial |
| Worklets | 4 | Complete |
| Documentation | 3 | Complete |

**Total Lines of Code**: ~8,000+ in src/lib alone

---

## Next Steps

1. Read [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for overview (5 min)
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for deep dive (15 min)
3. Start Phase 1 integration (create Zustand store)
4. Connect UI to audio engines
5. Test and optimize

---

## Questions?

Refer to the relevant section in [ARCHITECTURE.md](./ARCHITECTURE.md) or [QUICK-REFERENCE.md](./QUICK-REFERENCE.md).

Last updated: 2025-10-31
