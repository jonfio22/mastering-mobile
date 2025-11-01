# Product Requirements Document
## Maestro Mastering Suite - Frontend Integration

**Version**: 1.0
**Date**: October 31, 2025
**Author**: Product Team
**Status**: Ready for Implementation

---

## 1. Executive Summary

### Current State
We have a fully functional backend audio processing infrastructure (~10,600 lines) with professional-grade audio engines, AI analysis, and AudioWorklet processors. However, the frontend UI components exist but are **completely disconnected** from this backend, rendering the application non-functional for users.

### Problem Statement
Users cannot access any of the professional mastering capabilities because the UI components are not wired to the backend engines. The application appears to work but actually does nothing - controls don't affect audio, meters show fake data, and AI analysis never runs.

### Solution
Integrate the existing UI components with the backend audio processing infrastructure to create a fully functional mobile mastering suite.

---

## 2. Product Goals & Objectives

### Primary Goal
Create a professional mobile mastering application that allows users to:
- Upload audio files
- See real-time AI analysis of their mix
- Apply professional processing (EQ, compression, limiting)
- Monitor with accurate metering (LUFS, true peak, phase correlation)
- Export mastered audio

### Success Metrics
- **Functional Integration**: 100% of UI controls connected to backend
- **Performance**: < 10ms latency for real-time processing
- **Accuracy**: Professional-grade metering within 0.1 dB of reference tools
- **User Satisfaction**: Intuitive workflow from upload to export

---

## 3. User Stories

### Must Have (P0)

1. **As a music producer**, I want to upload my mix and immediately see AI-powered analysis so I can understand issues before processing.

2. **As a mastering engineer**, I want real-time EQ adjustments that I can hear immediately so I can shape the tonal balance.

3. **As a mixing engineer**, I want accurate LUFS metering so I can meet streaming platform requirements.

4. **As a mobile user**, I want the application to work smoothly on my phone so I can master tracks anywhere.

### Should Have (P1)

5. **As a DJ**, I want to see phase correlation meters so I can ensure mono compatibility for club systems.

6. **As a podcast producer**, I want compression controls that work in real-time so I can control dynamics.

7. **As a content creator**, I want to see a mix critique score so I know how professional my mix sounds.

### Nice to Have (P2)

8. **As a user**, I want to A/B compare processed vs unprocessed audio.

9. **As a user**, I want to save and recall processing presets.

10. **As a user**, I want to export at different loudness targets (streaming, club, broadcast).

---

## 4. Functional Requirements

### 4.1 Audio Engine Integration

#### 4.1.1 Engine Initialization
- **Requirement**: Main page must initialize `MasteringEngine` and `AIAnalysis` on component mount
- **Location**: `src/pages/index.tsx`
- **Implementation**:
  ```typescript
  - Create singleton instances of MasteringEngine and AIAnalysis
  - Initialize with optimal settings (48kHz, interactive latency)
  - Pass instances to child components via props or context
  - Handle cleanup on unmount
  ```

#### 4.1.2 State Management
- **Requirement**: Centralized state for audio processing parameters
- **Options**:
  - React Context (simple, already available)
  - Zustand (recommended, already installed)
  - Redux Toolkit (overkill for this scope)
- **Decision Needed**: Confirm state management approach

### 4.2 Component Integration

#### 4.2.1 AudioUploader Component
**File**: `src/components/mastering/AudioUploader.tsx`

**Current State**: Handles file selection but doesn't process

**Required Changes**:
- Accept `engine` and `analyzer` props
- On file upload:
  1. Validate file format using audio utilities
  2. Load into `engine.loadAudio(file)`
  3. Create AudioBuffer for analysis
  4. Call `analyzer.analyzeAudio(buffer)`
  5. Emit analysis results to parent
- Show loading state during analysis
- Display error messages for invalid files

#### 4.2.2 AudioPlayer Component
**File**: `src/components/mastering/AudioPlayer.tsx`

**Current State**: Basic Web Audio playback

**Required Changes**:
- Replace entire Web Audio implementation with `BaseAudioEngine`
- Connect to engine instance:
  - Play/pause/stop controls → `engine.play()`, `engine.pause()`, `engine.stop()`
  - Seek bar → `engine.seek(time)`
  - Time display → `engine.getCurrentTime()`, `engine.getDuration()`
- Remove basic analyser, use engine's professional metering
- Add transport state management (playing/paused/stopped)

#### 4.2.3 EQSection Component
**File**: `src/components/mastering/EQSection.tsx`

**Current State**: Visual controls only, no functionality

**Required Changes**:
- Accept `engine` prop
- Connect Baxandall EQ controls:
  - Bass Gain (-12 to +12 dB) → `engine.updateEQ({ bassGain })`
  - Bass Frequency (20-500 Hz) → `engine.updateEQ({ bassFreq })`
  - Treble Gain (-12 to +12 dB) → `engine.updateEQ({ trebleGain })`
  - Treble Frequency (1k-20k Hz) → `engine.updateEQ({ trebleFreq })`
- Add bypass toggle → `engine.updateEQ({ bypassed })`
- Display actual parameter values
- Implement smooth parameter ramping

#### 4.2.4 MonitorSection Component
**File**: `src/components/mastering/MonitorSection.tsx`

**Current State**: Shows fake/random meter data

**Required Changes**:
- Accept `engine` prop
- Subscribe to real metering:
  ```typescript
  engine.setOnMetering((data) => {
    // Update VU meters with data.master.leftPeakDB, rightPeakDB
    // Update LUFS with data.master.lufs
    // Update phase correlation with data.master.phaseCorrelation
  })
  ```
- Display professional metrics:
  - LUFS (integrated, short-term, momentary)
  - True Peak (dBTP)
  - RMS levels
  - Phase correlation (-1 to +1)
  - Frequency spectrum (real FFT data)
- Color-code levels (green/yellow/red zones)

#### 4.2.5 MasterSection Component
**File**: `src/components/mastering/MasterSection.tsx`

**Current State**: Visual controls only

**Required Changes**:
- Accept `engine` prop
- Connect master processing:
  - Input Gain → `engine.updateMaster({ inputGain })`
  - Output Gain → `engine.updateMaster({ outputGain })`
  - Limiter Threshold → `engine.updateLimiter({ threshold })`
  - Limiter Release → `engine.updateLimiter({ release })`
- Add loudness target selector:
  - Streaming (-14 LUFS)
  - Club/DJ (-9 LUFS)
  - Broadcast (-23 LUFS)
  - Custom
- Show gain reduction meter for limiter

### 4.3 New Components

#### 4.3.1 AnalysisPanel Component
**New File**: `src/components/mastering/AnalysisPanel.tsx`

**Purpose**: Display AI analysis results

**Requirements**:
- Accept `analysisResult` prop
- Display sections:
  1. **Overall Score** (0-100 with color coding)
  2. **Issues List** (sorted by severity)
     - Frequency masking problems
     - Phase coherence issues
     - Tonal balance problems
     - Dynamic range issues
  3. **Recommendations** (actionable fixes)
  4. **Spectral Display** (frequency analysis visualization)
- Collapsible sections for mobile
- Export analysis as PDF/text report

#### 4.3.2 ProcessingChain Component
**New File**: `src/components/mastering/ProcessingChain.tsx`

**Purpose**: Visual representation of signal flow

**Requirements**:
- Show processing chain: Input → EQ → Compressor → Limiter → Output
- Indicate active/bypassed state for each processor
- Show gain reduction for dynamics processors
- Click to focus on specific processor

### 4.4 Audio Processing Pipeline

#### Signal Flow
```
Audio Input
    ↓
[Input Gain] → [Metering]
    ↓
[Baxandall EQ] → [Metering]
    ↓
[SSL Compressor] → [Metering]
    ↓
[Limiter] → [Metering]
    ↓
[Output Gain] → [Master Metering]
    ↓
Audio Output
```

#### Real-time Requirements
- **Latency**: < 10ms for control changes
- **Metering Rate**: 60 Hz minimum
- **FFT Size**: 2048 for spectrum, 8192 for analysis
- **Buffer Size**: 256-512 samples (adaptive)

---

## 5. Technical Architecture

### 5.1 Component Hierarchy
```
MasteringDAW (index.tsx)
├── MasteringEngine (singleton)
├── AIAnalysis (singleton)
├── AudioUploader
│   └── [triggers analysis]
├── AudioPlayer
│   └── [uses BaseAudioEngine]
├── AnalysisPanel (NEW)
│   └── [displays AI results]
├── ProcessingChain (NEW)
│   └── [visual signal flow]
├── EQSection
│   └── [controls BaxandallEQ worklet]
├── MonitorSection
│   └── [displays real metering]
└── MasterSection
    └── [controls master bus]
```

### 5.2 State Management Architecture

#### Option 1: Zustand (Recommended)
```typescript
// src/store/audioStore.ts
interface AudioStore {
  // Engine instances
  engine: MasteringEngine | null
  analyzer: AIAnalysis | null

  // Audio state
  audioFile: File | null
  isPlaying: boolean
  currentTime: number
  duration: number

  // Analysis results
  analysisResult: AnalysisResult | null

  // Processing parameters
  eqParams: BaxandallEQParams
  compressorParams: SSLCompressorParams
  limiterParams: LimiterParams

  // Metering data
  meteringData: AudioEngineMetering | null

  // Actions
  initialize: () => void
  loadAudio: (file: File) => Promise<void>
  updateEQ: (params: Partial<BaxandallEQParams>) => void
  // ... other actions
}
```

#### Option 2: React Context
```typescript
// src/context/AudioContext.tsx
interface AudioContextValue {
  engine: MasteringEngine | null
  analyzer: AIAnalysis | null
  // ... same as above
}
```

### 5.3 Data Flow

1. **File Upload**
   ```
   User selects file
   → AudioUploader validates
   → Load into MasteringEngine
   → Create AudioBuffer
   → AIAnalysis.analyzeAudio()
   → Display results in AnalysisPanel
   ```

2. **Real-time Processing**
   ```
   User adjusts control
   → Update store/context
   → Engine.updateProcessor()
   → AudioWorklet processes
   → Metering callback fires
   → UI updates (60Hz)
   ```

3. **Metering Pipeline**
   ```
   AudioWorklet (process 128 samples)
   → Calculate levels
   → Post message to main thread
   → Engine aggregates data
   → Fire metering callback
   → Component setState
   → React re-render
   ```

---

## 6. Implementation Phases

### Phase 1: Core Integration (Week 1)
**Priority: P0 - CRITICAL**

1. **Day 1-2**: Engine initialization and state management
   - Set up Zustand store
   - Initialize engines in index.tsx
   - Create context providers

2. **Day 3-4**: AudioPlayer integration
   - Replace Web Audio with BaseAudioEngine
   - Connect transport controls
   - Verify playback works

3. **Day 5-7**: AudioUploader + AI Analysis
   - Connect file loading to engine
   - Implement AI analysis trigger
   - Create basic AnalysisPanel component

**Deliverable**: Can upload, play, and see analysis

### Phase 2: Processing Controls (Week 2)
**Priority: P0 - CRITICAL**

1. **Day 1-2**: EQ integration
   - Connect rotary knobs to engine
   - Verify parameter updates
   - Test frequency response

2. **Day 3-4**: Monitor section
   - Connect real metering
   - Implement all meter types
   - Add spectrum analyzer

3. **Day 5-7**: Master section
   - Connect dynamics processing
   - Add loudness targets
   - Test gain staging

**Deliverable**: Full processing chain functional

### Phase 3: Polish & Optimization (Week 3)
**Priority: P1 - IMPORTANT**

1. **Day 1-2**: Performance optimization
   - Profile and optimize rendering
   - Implement parameter smoothing
   - Reduce re-renders

2. **Day 3-4**: Mobile responsiveness
   - Test on various devices
   - Optimize touch interactions
   - Adjust layouts

3. **Day 5-7**: Error handling & validation
   - Add comprehensive error states
   - Implement recovery flows
   - Add user notifications

**Deliverable**: Production-ready application

### Phase 4: Advanced Features (Week 4)
**Priority: P2 - NICE TO HAVE**

1. Export functionality
2. Preset management
3. A/B comparison
4. Keyboard shortcuts
5. Help documentation

---

## 7. Testing Requirements

### 7.1 Unit Tests
- [ ] Engine initialization
- [ ] Parameter updates
- [ ] Metering calculations
- [ ] AI analysis algorithms
- [ ] State management

### 7.2 Integration Tests
- [ ] File upload → Analysis flow
- [ ] Control → Engine → Audio output
- [ ] Metering subscription
- [ ] Error recovery

### 7.3 E2E Tests (Playwright)
- [ ] Complete mastering workflow
- [ ] Mobile interactions
- [ ] Performance under load
- [ ] Browser compatibility

### 7.4 Manual Testing Checklist
- [ ] Audio plays without glitches
- [ ] Controls feel responsive
- [ ] Meters are accurate
- [ ] Mobile gestures work
- [ ] No memory leaks

---

## 8. Performance Requirements

### Metrics
- **Initial Load**: < 3 seconds
- **File Analysis**: < 5 seconds for 5-minute track
- **Control Latency**: < 10ms
- **Metering Rate**: 60 FPS minimum
- **Memory Usage**: < 200MB active

### Optimization Strategies
- Lazy load components
- Debounce parameter updates
- Use React.memo for meters
- Implement virtual scrolling for long lists
- Web Worker for heavy calculations

---

## 9. Accessibility Requirements

- **Keyboard Navigation**: All controls accessible via keyboard
- **Screen Readers**: Proper ARIA labels
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG AA compliant
- **Touch Targets**: Minimum 44x44px on mobile

---

## 10. Browser & Device Support

### Required Support
- **Chrome**: 90+ (primary)
- **Safari**: 14+ (iOS requirement)
- **Firefox**: 88+
- **Edge**: 90+

### Device Requirements
- **Desktop**: Full functionality
- **Tablet**: Full functionality with optimized layout
- **Mobile**: Core features with simplified UI
- **Minimum RAM**: 4GB
- **Minimum CPU**: Dual-core 1.5GHz

---

## 11. Dependencies & APIs

### External Dependencies
- Web Audio API (native)
- AudioWorklet API (native)
- File API (native)
- MediaStream API (optional, for recording)

### NPM Packages
- react: UI framework
- zustand: State management (if chosen)
- framer-motion: Animations
- tailwindcss: Styling

### Backend APIs
- All processing is client-side
- No external API dependencies
- Future: Cloud rendering API

---

## 12. Security & Privacy

### Requirements
- All processing happens client-side
- No audio data leaves the device
- No user tracking or analytics
- Clear privacy policy
- Secure context (HTTPS) required for AudioWorklet

---

## 13. Documentation Requirements

### User Documentation
- Quick start guide
- Video tutorials
- Tooltips for all controls
- FAQ section

### Developer Documentation
- API reference for all engines
- Integration examples
- Architecture diagrams
- Troubleshooting guide

---

## 14. Launch Criteria

### MVP Must-Haves
- [x] Backend infrastructure complete
- [ ] AudioPlayer connected to engine
- [ ] AudioUploader triggers analysis
- [ ] EQ controls functional
- [ ] Real metering displays
- [ ] Basic error handling
- [ ] Mobile responsive
- [ ] 90% test coverage

### Post-MVP
- [ ] Export functionality
- [ ] Preset system
- [ ] A/B comparison
- [ ] Advanced visualizations
- [ ] Collaboration features

---

## 15. Risks & Mitigations

### Technical Risks
1. **Risk**: AudioWorklet browser compatibility
   - **Mitigation**: Fallback to ScriptProcessor (with warning)

2. **Risk**: Performance on low-end devices
   - **Mitigation**: Adaptive quality settings

3. **Risk**: Memory leaks from audio buffers
   - **Mitigation**: Aggressive cleanup, monitoring

### User Experience Risks
1. **Risk**: Complex UI overwhelming for beginners
   - **Mitigation**: Progressive disclosure, guided mode

2. **Risk**: Latency making real-time adjustments frustrating
   - **Mitigation**: Optimize critical path, predictive UI

---

## 16. Success Metrics

### Week 1 Goals
- 100% of playback controls functional
- AI analysis runs successfully
- No crash bugs

### Week 2 Goals
- All processing parameters adjustable
- Metering accuracy within 0.1dB
- < 10ms control latency

### Week 3 Goals
- Mobile performance acceptable
- Zero critical bugs
- User testing feedback incorporated

### Launch Metrics
- Time to first audio playback: < 2 seconds
- Processing chain latency: < 10ms
- User task completion rate: > 90%
- App stability: > 99.9% crash-free

---

## 17. Questions for Stakeholder Review

1. **State Management**: Zustand vs React Context?
2. **AI Analysis Trigger**: Automatic on upload or manual button?
3. **Default Processing**: Start with processors bypassed or engaged?
4. **Mobile Priorities**: Which features to hide on small screens?
5. **Export Formats**: WAV only or include MP3/AAC?
6. **Preset System**: Built-in presets, user presets, or both?
7. **Collaboration**: Future requirement for sharing sessions?

---

## Appendix A: File Mappings

### Components to Update
```
src/components/mastering/
├── AudioPlayer.tsx       → Connect to BaseAudioEngine
├── AudioUploader.tsx     → Add AI analysis
├── EQSection.tsx         → Wire to engine.updateEQ()
├── MonitorSection.tsx    → Use real metering
├── MasterSection.tsx     → Connect master controls
└── [NEW] AnalysisPanel.tsx → Display AI results
```

### Engine Files (Ready)
```
src/lib/audio/
├── MasteringEngine.ts    ✓ Complete
├── BaseAudioEngine.ts    ✓ Complete
└── worklets/*            ✓ Complete

src/lib/ai/
└── aiAnalysis.ts         ✓ Complete
```

---

## Appendix B: Code Examples

### Example: Connecting AudioPlayer
```typescript
// src/components/mastering/AudioPlayer.tsx
import { BaseAudioEngine } from '@/lib/audio/BaseAudioEngine';

interface Props {
  engine: BaseAudioEngine;
  audioFile: File;
}

const AudioPlayer = ({ engine, audioFile }: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (audioFile) {
      engine.loadAudio(audioFile);
    }
  }, [audioFile]);

  const handlePlay = () => {
    engine.play();
    setIsPlaying(true);
  };

  const handlePause = () => {
    engine.pause();
    setIsPlaying(false);
  };

  // Rest of implementation...
};
```

### Example: Connecting EQ Controls
```typescript
// src/components/mastering/EQSection.tsx
const handleBassGainChange = (value: number) => {
  // Update local state for immediate UI response
  setBassGain(value);

  // Update engine with debouncing
  debouncedUpdate(() => {
    engine.updateEQ({ bassGain: value });
  }, 10);
};
```

---

## Sign-off

**Product Owner**: ___________________ Date: _______________

**Tech Lead**: ___________________ Date: _______________

**Design Lead**: ___________________ Date: _______________

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-31 | Product Team | Initial PRD based on HANDOFF.md |

---

**END OF DOCUMENT**