# UI Integration Checklist

**Purpose**: Connect the new audio processing infrastructure to the existing UI
**Status**: 0% Complete (backend done, UI integration pending)

---

## Phase 1: Basic Audio Playback ✅ GET THIS WORKING FIRST

### 1.1 Update `src/pages/index.tsx`
- [ ] Import MasteringEngine and AIAnalysis
- [ ] Create engine instances in state
- [ ] Initialize engines in useEffect
- [ ] Add cleanup in useEffect return
- [ ] Pass engines to child components via props or Context
- [ ] Add error handling and loading states

### 1.2 Update `src/components/mastering/AudioUploader.tsx`
- [ ] Accept engine prop
- [ ] On file select, validate format using `AudioFormatUtils.validateFile()`
- [ ] Load file into engine (create HTMLAudioElement, connect to engine)
- [ ] Show loading state while file loads
- [ ] Handle errors (invalid format, load failure)
- [ ] Test: Can upload and load audio file

### 1.3 Update `src/components/mastering/AudioPlayer.tsx`
- [ ] Accept engine prop
- [ ] Remove old Web Audio API code
- [ ] Connect play button to `engine.play()` (MasteringEngine doesn't have this - use BaseAudioEngine!)
- [ ] Connect pause button to `engine.pause()`
- [ ] Connect seek to `engine.seek(time)`
- [ ] Update progress bar from engine playback state
- [ ] Test: Can play, pause, seek audio

**Milestone 1**: User can upload audio and play it back ✅

---

## Phase 2: Real-Time Metering

### 2.1 Update `src/components/mastering/MonitorSection.tsx`
- [ ] Accept engine prop
- [ ] Subscribe to `engine.setOnMetering(callback)` in useEffect
- [ ] Update VU meters with `metering.output.leftPeakDB`, `metering.output.rightPeakDB`
- [ ] Display LUFS values (will need to calculate, not in current engine)
- [ ] Display phase correlation (not in current engine - add feature request)
- [ ] Add cleanup to unsubscribe from metering
- [ ] Test: Meters respond to audio playback

### 2.2 Update `src/components/mastering/MasterSection.tsx`
- [ ] Accept engine prop
- [ ] Show current output levels
- [ ] Display loudness targets (-14 LUFS streaming, -9 LUFS club)
- [ ] Add visual indicators when targets are met
- [ ] Test: Master section updates in real-time

**Milestone 2**: User sees accurate real-time metering ✅

---

## Phase 3: AI Analysis Display

### 3.1 Create `src/components/mastering/AnalysisPanel.tsx` (NEW FILE)
- [ ] Create collapsible panel component
- [ ] Accept `analysisResult` prop
- [ ] Display overall quality score (0-100)
- [ ] Show issues grouped by severity (critical, high, medium, low)
- [ ] Display frequency masking issues with frequency ranges
- [ ] Display phase correlation issues
- [ ] Display tonal balance issues
- [ ] Show actionable suggestions from mix critique
- [ ] Add expand/collapse functionality
- [ ] Style to match existing hardware aesthetic
- [ ] Test: Panel displays analysis data correctly

### 3.2 Update `src/components/mastering/AudioUploader.tsx`
- [ ] Accept analyzer prop
- [ ] After file loads, run `analyzer.analyzeAudio(audioBuffer)`
- [ ] Show loading spinner during analysis
- [ ] Pass results to parent component
- [ ] Handle analysis errors
- [ ] Test: AI analysis runs on upload

### 3.3 Update `src/pages/index.tsx`
- [ ] Add state for analysis results
- [ ] Pass analysis state to AnalysisPanel
- [ ] Add AnalysisPanel to layout (decide where)
- [ ] Test: Analysis results display after upload

**Milestone 3**: User sees AI-powered insights on upload ✅

---

## Phase 4: Processing Controls (EQ, Compression, Limiting)

### 4.1 Update `src/components/mastering/EQSection.tsx`
- [ ] Accept engine prop
- [ ] Connect bass knob to `engine.updateEQ({ bassGain: value })`
- [ ] Connect treble knob to `engine.updateEQ({ trebleGain: value })`
- [ ] Add bass frequency control (100-500 Hz range)
- [ ] Add treble frequency control (5k-15k Hz range)
- [ ] Show current values from engine state
- [ ] Add bypass button functionality
- [ ] Add A/B comparison button
- [ ] Test: EQ changes affect audio in real-time

### 4.2 Add Compressor Controls (might need new component)
- [ ] Create compressor section or add to existing EQSection
- [ ] Connect threshold knob (-40 to 0 dB)
- [ ] Connect ratio knob (1:1 to 20:1)
- [ ] Connect attack knob (0.1ms to 30ms)
- [ ] Connect release knob (10ms to 1000ms)
- [ ] Display gain reduction meter
- [ ] Add bypass button
- [ ] Test: Compression works and shows gain reduction

### 4.3 Add Limiter Controls
- [ ] Create limiter section
- [ ] Connect threshold knob (-12 to 0 dB)
- [ ] Connect ceiling knob (-1 to 0 dB)
- [ ] Connect release knob (10ms to 1000ms)
- [ ] Display gain reduction
- [ ] Show if hitting ceiling (red indicator)
- [ ] Test: Limiter prevents clipping

**Milestone 4**: User can process audio with EQ, compression, limiting ✅

---

## Phase 5: Advanced Features

### 5.1 Add Export Functionality
- [ ] Create export button in MasterSection
- [ ] Add format selection (WAV, MP3)
- [ ] Add bit depth selection (16, 24, 32)
- [ ] Add sample rate selection
- [ ] Implement offline rendering (will need to add to engine)
- [ ] Show export progress
- [ ] Trigger download when complete
- [ ] Test: Can export processed audio

### 5.2 Add Preset System
- [ ] Create preset save/load UI
- [ ] Save current settings to IndexedDB
- [ ] Load saved presets
- [ ] Include built-in presets (streaming, club, podcast, etc.)
- [ ] Test: Presets save and load correctly

### 5.3 Add A/B Comparison
- [ ] Add A/B toggle button
- [ ] Store dry/wet states
- [ ] Instant switching between processed/unprocessed
- [ ] Match loudness for fair comparison
- [ ] Test: A/B works seamlessly

### 5.4 Add Reference Track Comparison
- [ ] Create reference track upload
- [ ] Run spectral analysis on reference
- [ ] Compare with current audio
- [ ] Show visual difference
- [ ] Suggest adjustments to match
- [ ] Test: Reference comparison is helpful

**Milestone 5**: Professional mastering workflow complete ✅

---

## Phase 6: Polish & Optimization

### 6.1 Performance
- [ ] Ensure <10ms latency (already achieved in engine)
- [ ] Optimize re-renders (React.memo, useMemo, useCallback)
- [ ] Add loading states for heavy operations
- [ ] Test on lower-end hardware

### 6.2 Error Handling
- [ ] Handle all engine errors gracefully
- [ ] Show user-friendly error messages
- [ ] Add retry mechanisms where appropriate
- [ ] Log errors for debugging
- [ ] Test error scenarios

### 6.3 Mobile Optimization
- [ ] Test on mobile devices
- [ ] Ensure touch controls work
- [ ] Optimize for smaller screens
- [ ] Test performance on mobile

### 6.4 Accessibility
- [ ] Add keyboard shortcuts
- [ ] Ensure screen reader compatibility
- [ ] Add ARIA labels
- [ ] Test with accessibility tools

**Milestone 6**: Production-ready polish ✅

---

## Testing Checklist

After each phase, test:
- [ ] Upload audio file (MP3, WAV, FLAC)
- [ ] Play/pause/seek works smoothly
- [ ] Meters update in real-time
- [ ] AI analysis shows results
- [ ] EQ changes are audible
- [ ] Compressor works (check gain reduction)
- [ ] Limiter prevents clipping
- [ ] No console errors
- [ ] No memory leaks (check DevTools)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Tests pass (`npm run test`)

---

## Known Limitations to Address

1. **MasteringEngine vs BaseAudioEngine confusion**
   - MasteringEngine: Worklet processing (EQ, comp, limiter)
   - BaseAudioEngine: File loading, playback
   - **Need to use BOTH** or consolidate

2. **Missing LUFS metering**
   - K-weighting filters implemented but not integrated
   - Need to add LUFS calculation to metering

3. **Missing export functionality**
   - Engines don't have offline rendering yet
   - Need to add or use Web Audio offline context

4. **DSP algorithms not implemented**
   - Worklet structures exist but no actual processing yet
   - That's Task 2.0 (next major task)
   - For now, integration will use pass-through

5. **No state persistence**
   - Settings don't survive page refresh
   - Need IndexedDB integration

---

## Success Criteria

✅ User can:
1. Upload an audio file
2. See AI analysis results with specific issues
3. Play audio with transport controls
4. Adjust EQ and hear changes in real-time
5. See accurate metering (peak, RMS, phase)
6. Apply compression and limiting
7. Export processed audio
8. Save/load presets
9. Compare with reference tracks

✅ Technical requirements:
1. <10ms latency
2. No audio dropouts
3. Professional metering accuracy
4. Type-safe codebase
5. No memory leaks
6. Works in Chrome, Firefox, Safari

---

## Time Estimate

- Phase 1 (Basic Playback): **4-6 hours**
- Phase 2 (Metering): **2-3 hours**
- Phase 3 (AI Analysis): **3-4 hours**
- Phase 4 (Processing): **6-8 hours**
- Phase 5 (Advanced): **8-10 hours**
- Phase 6 (Polish): **4-6 hours**

**Total**: 27-37 hours of focused development

---

**Start with Phase 1 - get basic playback working, then iterate from there.**
