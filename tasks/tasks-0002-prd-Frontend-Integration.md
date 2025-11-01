## Relevant Files

- `src/pages/index.tsx` - Main application page that needs to initialize audio engines and manage global state
- `src/store/audioStore.ts` - New Zustand store for centralized audio state management (to be created)
- `src/components/mastering/AudioPlayer.tsx` - Needs complete refactor to use BaseAudioEngine instead of basic Web Audio
- `src/components/mastering/AudioUploader.tsx` - Needs to trigger AI analysis and connect to engine
- `src/components/mastering/EQSection.tsx` - Needs connection to BaxandallEQ worklet parameters
- `src/components/mastering/MonitorSection.tsx` - Needs to display real metering data from engine
- `src/components/mastering/MasterSection.tsx` - Needs connection to master bus and limiter controls
- `src/components/mastering/AnalysisPanel.tsx` - New component to display AI analysis results (to be created)
- `src/components/mastering/WaveformDisplay.tsx` - New component using Eleven Labs waveform visualization (to be created)
- `src/components/mastering/SpectrumAnalyzer.tsx` - New component for frequency spectrum display (to be created)
- `src/components/mastering/PhaseScope.tsx` - New component for phase correlation visualization (to be created)
- `src/components/mastering/ProcessingChain.tsx` - New visual signal flow component (to be created)
- `src/lib/audio/MasteringEngine.ts` - Existing engine ready to use
- `src/lib/audio/BaseAudioEngine.ts` - Existing playback engine ready to use
- `src/lib/ai/aiAnalysis.ts` - Existing AI analysis system ready to use
- `src/components/mastering/AudioPlayer.test.tsx` - Tests for AudioPlayer component
- `src/components/mastering/AudioUploader.test.tsx` - Tests for AudioUploader component
- `src/components/mastering/AnalysisPanel.test.tsx` - Tests for AnalysisPanel component
- `src/store/audioStore.test.ts` - Tests for Zustand store

### Notes

- The backend infrastructure (engines, AI, worklets) is complete and tested
- Focus is on connecting existing UI to existing backend, not creating new features
- Zustand is already installed and should be used for state management
- All processing happens client-side; no external API calls needed
- Use Eleven Labs UI components (https://ui.elevenlabs.io) for modern waveform and audio visualizations
- Maintain the existing hardware-inspired dark theme with wood frame aesthetic
- Use `npm run test` to run tests, `npm run typecheck` for TypeScript validation

## Tasks

- [x] 1.0 Initialize Audio Infrastructure and State Management
  - [x] 1.1 Create Zustand store (`src/store/audioStore.ts`) with interfaces for engine instances, audio state, processing parameters, and metering data
  - [x] 1.2 Initialize MasteringEngine and AIAnalysis singletons in the store with proper cleanup handlers
  - [x] 1.3 Set up audio context provider wrapper in `src/pages/index.tsx` that provides store to all child components
  - [x] 1.4 Configure metering subscriptions (60Hz update rate) and error handling callbacks in the store
  - [x] 1.5 Add TypeScript types for all store actions (loadAudio, updateEQ, updateCompressor, etc.)
  - [x] 1.6 Implement store persistence for user preferences and last-used settings using Zustand persist middleware

- [ ] 2.0 Integrate Core Audio Playback Components
  - [ ] 2.1 Refactor `AudioPlayer.tsx` to remove all Web Audio API code and replace with BaseAudioEngine instance from store
  - [ ] 2.2 Connect play/pause/stop buttons to `engine.play()`, `engine.pause()`, `engine.stop()` methods
  - [ ] 2.3 Implement seek bar functionality using `engine.seek(time)` with smooth scrubbing
  - [ ] 2.4 Add time display showing `engine.getCurrentTime()` and `engine.getDuration()` with MM:SS format
  - [ ] 2.5 Install and integrate Eleven Labs Waveform component for visual audio representation
  - [ ] 2.6 Create `WaveformDisplay.tsx` component that shows waveform with zoom/scroll capabilities
  - [ ] 2.7 Add playhead indicator to waveform that syncs with current playback position
  - [ ] 2.8 Implement loop region selection on waveform for A/B comparison testing

- [ ] 3.0 Connect Audio Processing Controls
  - [ ] 3.1 Update `EQSection.tsx` to accept engine from store and bind rotary knobs to actual parameters
  - [ ] 3.2 Connect Bass Gain control (-12 to +12 dB) to `engine.updateEQ({ bassGain })` with smooth ramping
  - [ ] 3.3 Connect Bass Frequency control (20-500 Hz) to `engine.updateEQ({ bassFreq })` with logarithmic scaling
  - [ ] 3.4 Connect Treble Gain control (-12 to +12 dB) to `engine.updateEQ({ trebleGain })` with smooth ramping
  - [ ] 3.5 Connect Treble Frequency control (1k-20k Hz) to `engine.updateEQ({ trebleFreq })` with logarithmic scaling
  - [ ] 3.6 Add bypass toggle buttons for EQ with visual indication (LED style) when active
  - [ ] 3.7 Update `MasterSection.tsx` to connect input/output gain faders to `engine.updateMaster()`
  - [ ] 3.8 Connect limiter threshold and release controls to `engine.updateLimiter()` parameters
  - [ ] 3.9 Add loudness target selector dropdown (-14 LUFS streaming, -9 LUFS club, -23 LUFS broadcast)
  - [ ] 3.10 Implement gain reduction meter for limiter showing real-time compression amount

- [ ] 4.0 Implement Real-time Metering and Visualization
  - [ ] 4.1 Refactor `MonitorSection.tsx` to subscribe to `engine.setOnMetering()` callback at 60Hz
  - [ ] 4.2 Update VU meters to display actual `data.master.leftPeakDB` and `rightPeakDB` values
  - [ ] 4.3 Implement LUFS display showing integrated, short-term, and momentary loudness values
  - [ ] 4.4 Add true peak meter showing `data.master.truePeak` in dBTP with over-indicator
  - [ ] 4.5 Create `PhaseScope.tsx` component showing phase correlation (-1 to +1) with Lissajous display
  - [ ] 4.6 Create `SpectrumAnalyzer.tsx` using Eleven Labs components or canvas for frequency display
  - [ ] 4.7 Implement color-coding for meters (green: safe, yellow: caution, red: clipping)
  - [ ] 4.8 Add peak hold indicators with configurable hold time (1-5 seconds)
  - [ ] 4.9 Create RMS level display with averaging over configurable window (300ms default)
  - [ ] 4.10 Add stereo width meter showing M/S balance and correlation

- [ ] 5.0 Add AI Analysis Display and Results Presentation
  - [ ] 5.1 Update `AudioUploader.tsx` to call `engine.loadAudio(file)` and trigger AI analysis on file selection
  - [ ] 5.2 Create `AnalysisPanel.tsx` component with collapsible sections for mobile responsiveness
  - [ ] 5.3 Implement overall mix score display (0-100) with color-coded circular progress indicator
  - [ ] 5.4 Create issues list showing frequency masking, phase problems, and tonal balance issues sorted by severity
  - [ ] 5.5 Add severity indicators using color chips (critical: red, warning: yellow, info: blue)
  - [ ] 5.6 Display actionable recommendations from AI with "Apply Fix" buttons where applicable
  - [ ] 5.7 Integrate spectral analysis visualization showing problematic frequency ranges highlighted
  - [ ] 5.8 Add tonal balance curve overlay comparing to reference curves (warm, neutral, bright)
  - [ ] 5.9 Create dynamic range meter showing crest factor and loudness range (LRA)
  - [ ] 5.10 Implement export functionality for analysis report as PDF or JSON
  - [ ] 5.11 Add "Re-analyze" button to run analysis after processing changes
  - [ ] 5.12 Create comparison view showing before/after analysis results side by side

- [ ] 6.0 Enhance UI with Modern Visualizations and Polish
  - [ ] 6.1 Create `ProcessingChain.tsx` component showing signal flow diagram with active/bypass states
  - [ ] 6.2 Add animated level indicators to processing chain showing signal flow in real-time
  - [ ] 6.3 Implement touch gestures for mobile (pinch to zoom waveform, swipe to scrub)
  - [ ] 6.4 Add keyboard shortcuts for common actions (space: play/pause, arrows: seek)
  - [ ] 6.5 Create loading states with skeleton screens while audio loads or analysis runs
  - [ ] 6.6 Add toast notifications for errors and successful operations using Framer Motion
  - [ ] 6.7 Implement smooth transitions between UI states using Framer Motion animations
  - [ ] 6.8 Add help tooltips to all controls explaining their function and showing current values
  - [ ] 6.9 Create responsive layout adjustments hiding advanced features on small screens
  - [ ] 6.10 Add visual feedback for parameter changes (value displays, LED indicators)
  - [ ] 6.11 Implement preset system UI with save/load/delete functionality
  - [ ] 6.12 Add A/B comparison toggle to quickly switch between processed and unprocessed audio