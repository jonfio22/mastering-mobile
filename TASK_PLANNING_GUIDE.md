# Task Planning Guide: Mastering Suite Issues

## Overview

This guide maps discovered issues to specific, actionable tasks. Use this to create your task list.

---

## Issue Categories & Tasks

### Category 1: CRITICAL - AudioWorklet Implementation

**Issue**: AudioWorklet processors referenced but don't exist
**Impact**: Audio processing completely non-functional
**Files Affected**: 
- `/src/lib/audio/MasteringEngine.ts` (lines 196-234)
- `/public/worklets/` (missing directory)

**Tasks to Create**:

```
TASK: Create baxandall-eq.worklet.js processor
- Implement AudioWorkletProcessor for Baxandall EQ
- Implement bass shelf (20-500 Hz, -12 to +12 dB)
- Implement treble shelf (1k-20k Hz, -12 to +12 dB)
- Handle parameter updates from postMessage
- Send metering data (L/R peaks) back to main thread
- Test with test audio file

TASK: Create ssl-compressor.worklet.js processor
- Implement AudioWorkletProcessor for SSL compressor
- Parameters: threshold, ratio, attack, release, makeupGain
- Implement gain reduction metering
- Send metering data back (gain reduction values)
- Test compression curve

TASK: Create limiter.worklet.js processor
- Implement AudioWorkletProcessor for peak limiter
- Implement brick-wall limiting at ceiling (-0.1 dBTP)
- Track gain reduction for metering
- Implement release time
- Send true peak values
```

### Category 2: CRITICAL - TypeScript Compilation

**Issue**: 40+ TypeScript compilation errors
**Impact**: Can't build/deploy, refactoring is risky
**Files Affected**: 10+ component files

**Tasks to Create**:

```
TASK: Fix MonitorSection.tsx TypeScript errors (10+ errors)
- Add type annotations to audioData parameter
- Fix defaultValues object typing
- Add parameter types to handler functions (handleKnobClick)
- Fix setActivePreset type constraint
- Add component interface definition
ESTIMATED TIME: 30 mins

TASK: Fix HardwareButton.tsx TypeScript errors
- Add interface for props
- Fix size/variant lookup index signatures
- Add proper prop types
ESTIMATED TIME: 20 mins

TASK: Fix RotaryKnob.tsx TypeScript issues
- Add proper component props interface
- Fix implicit 'any' types
- Add return type annotations
ESTIMATED TIME: 25 mins

TASK: Fix remaining component errors (EQSection, VerticalFader, WaveformDisplay)
- Run typecheck and fix each remaining error
- Add stricter tsconfig if needed
ESTIMATED TIME: 45 mins
```

### Category 3: HIGH - Knob Interaction Issues

**Issue**: Knob direction is inverted; sensitivity is inconsistent
**Impact**: Poor UX, confusing for users
**Files Affected**: `/src/components/mastering/RotaryKnob.tsx`

**Tasks to Create**:

```
TASK: Fix knob drag direction (inverted)
- Change line 61 from: (startYRef.current - clientY) * 3
- To: (clientY - startYRef.current) * sensitivity
- Test with Tape plugin (should drag UP to increase drive)
- Verify with all parameter types
ESTIMATED TIME: 15 mins

TASK: Implement adaptive knob sensitivity
- Calculate sensitivity based on min/max range
- Small ranges (e.g., 0-100%) need coarser control
- Large ranges (e.g., 20-500 Hz) need finer control
- Test with both small and large parameter ranges
ESTIMATED TIME: 45 mins

TASK: Support min/max/step props in RotaryKnob
- Currently defined in interface but not used
- Pass actual min/max values instead of always 0-100
- Implement proper double-click edit with correct range
- Add decimals parameter to control precision
ESTIMATED TIME: 30 mins
```

### Category 4: HIGH - Audio Processing Wiring

**Issue**: Stereo/Tape plugins have UI but aren't connected to audio engine
**Impact**: User can adjust parameters but nothing happens
**Files Affected**: `/src/store/audioStore.ts`, `/src/lib/audio/MasteringEngine.ts`

**Tasks to Create**:

```
TASK: Wire Tape saturation to MasteringEngine
- Add updateTapeSaturation method to MasteringEngine
- Create tape saturation AudioWorklet processor
- Connect audioStore updatePluginParams to engine
- Test audible effect on audio file
- Remove console.log placeholder (line 980)
ESTIMATED TIME: 1.5 hours

TASK: Wire Stereo width to MasteringEngine
- Add updateStereoWidth method to MasteringEngine
- Create stereo width AudioWorklet processor
- Implement M/S (mid/side) processing for width control
- Connect audioStore updatePluginParams to engine
- Test width adjustment on stereo file
ESTIMATED TIME: 2 hours

TASK: Fix parameter field name consistency
- Change all 'bypassed' fields to 'bypass'
- Update BaxandallEQParams interface
- Update OxfordLimiterParams interface
- Update audioStore updatePluginParams calls
- Verify all bypass toggles work
ESTIMATED TIME: 30 mins
```

### Category 5: HIGH - Metering System

**Issue**: VU meters show placeholder/hardcoded data
**Impact**: No real-time feedback to user, can't see audio levels
**Files Affected**: All plugin files, `/src/store/audioStore.ts`, `/src/lib/audio/MasteringEngine.ts`

**Tasks to Create**:

```
TASK: Fix metering data sources in plugins
- EQPlugin: Use metering.eq data, not output
- LimiterPlugin: Show actual gain reduction (not 0)
- TapePlugin: Use input/output metering correctly
- StereoPlugin: Add phase correlation meter data
- InputPlugin: Show pre-processing levels
- OutputPlugin: Show post-processing LUFS/TP

Files to fix:
  - EQPlugin.tsx lines 72-74
  - LimiterPlugin.tsx lines 46, 47-52
  - TapePlugin.tsx lines 35-40
  - StereoPlugin.tsx (similar pattern)
  - InputPlugin.tsx (similar pattern)
  - OutputPlugin.tsx (similar pattern)

ESTIMATED TIME: 45 mins

TASK: Implement real metering data calculation
- Extract peak values from AudioContext analyser
- Calculate gain reduction from limiter/compressor
- Calculate LUFS from frequency spectrum
- Calculate true peak (dBTP)
- Calculate phase correlation for stereo
- Send updates at 60 FPS to UI
ESTIMATED TIME: 2 hours

TASK: Add gain reduction metering to limiter worklet
- Track gain reduction value per block
- Average over metering window
- Send back to main thread
- Update UI in real-time
ESTIMATED TIME: 45 mins
```

### Category 6: MEDIUM - MonitorSection Legacy Code

**Issue**: Monitor section still has old non-functional UI elements
**Impact**: Confuses users about which controls work
**Files Affected**: `/src/components/mastering/MonitorSection.tsx`

**Tasks to Create**:

```
TASK: Remove legacy EQ GAIN control
- Delete lines 125-135 (EQ GAIN knob)
- Verify plugin EQ still works
- Remove from defaultValues object
ESTIMATED TIME: 10 mins

TASK: Remove legacy RED GAIN control
- Delete lines 150-164 (RED GAIN section)
- Remove from state
ESTIMATED TIME: 10 mins

TASK: Remove legacy MONITOR knob
- Delete monitor state (line 9)
- Delete monitor knob section (lines 137-148)
- Keep functional transport controls
ESTIMATED TIME: 15 mins

TASK: Add metering mode toggle UI
- Create new component MeteringModeToggle
- Add buttons: INPUT | OUTPUT | REDUCTION
- Connect to audioStore setMeteringMode
- Display in MonitorSection
ESTIMATED TIME: 45 mins

TASK: Refactor MonitorSection layout
- After removing legacy controls
- Make plugin macro buttons more prominent
- Improve visual hierarchy
- Test on mobile viewport
ESTIMATED TIME: 60 mins
```

### Category 7: MEDIUM - Input Validation & UX

**Issue**: Double-click edit doesn't validate parameter ranges
**Impact**: User can enter invalid values
**Files Affected**: `/src/components/mastering/RotaryKnob.tsx`

**Tasks to Create**:

```
TASK: Add parameter range validation to RotaryKnob
- Store min/max as props instead of 0-100
- Validate user input against actual range
- Show error if out of range
- Prevent invalid values from being set
ESTIMATED TIME: 30 mins

TASK: Improve double-click edit UX
- Accept edits in actual parameter units (not 0-100)
  - User types "3.5" for EQ gain (not "68")
  - User types "250" for bass freq (not "67")
- Add decimal precision based on parameter type
- Show current value with units as placeholder
- Add validation error message
ESTIMATED TIME: 45 mins

TASK: Improve plugin button feedback
- Single tap should give visual feedback
- Add tooltip or visual indicator
- Make double-tap requirement clearer
- Add haptic feedback on mobile
ESTIMATED TIME: 60 mins
```

### Category 8: LOW - Testing & Documentation

**Issue**: No tests, incomplete documentation
**Impact**: Hard to maintain, no regression testing
**Files Affected**: Test files (to be created), docs

**Tasks to Create**:

```
TASK: Write unit tests for RotaryKnob
- Test knob value changes
- Test direction (up/down)
- Test parameter conversion
- Test edge cases (min/max bounds)
ESTIMATED TIME: 1 hour

TASK: Write unit tests for plugin state management
- Test parameter updates
- Test bypass toggle
- Test reset functionality
- Test localStorage persistence
ESTIMATED TIME: 1.5 hours

TASK: Write E2E tests with Playwright
- Test opening/closing plugins
- Test knob dragging
- Test double-tap detection
- Test double-click edit
- Test parameter persistence
ESTIMATED TIME: 2 hours

TASK: Create developer documentation
- Document plugin system architecture
- Create example of adding new plugin
- Document AudioWorklet implementation
- Add troubleshooting guide
ESTIMATED TIME: 1.5 hours
```

---

## Task Priority Matrix

### Phase 1: BLOCKING (Do First)
1. Fix TypeScript compilation (allows building)
2. Create AudioWorklet processors (enables audio)
3. Wire Stereo/Tape plugins (completes functionality)

**Estimated Total Time**: 8-10 hours

### Phase 2: CRITICAL UX FIXES
1. Fix knob direction (fixes interaction)
2. Fix metering data (provides feedback)
3. Add parameter validation (prevents errors)

**Estimated Total Time**: 6-8 hours

### Phase 3: POLISH
1. Remove legacy MonitorSection UI
2. Improve plugin button feedback
3. Add metering mode toggle

**Estimated Total Time**: 3-4 hours

### Phase 4: TESTING
1. Unit tests
2. E2E tests
3. Documentation

**Estimated Total Time**: 5 hours

---

## Dependency Map

```
TypeScript Fixes
  └─→ Can refactor other code safely
      └─→ Knob Improvements
          └─→ Parameter Validation
              └─→ Double-click Edit Improvements

AudioWorklet Creation
  └─→ Audio processing works
      └─→ Metering Data Flow
          └─→ Real-time Meter Updates
              └─→ Gain Reduction Display

Wire Stereo/Tape
  └─→ All 6 plugins functional
      └─→ A/B Comparison testing
          └─→ Full feature parity

MonitorSection Refactoring
  └─→ Cleaner UI
      └─→ Metering Mode Toggle
          └─→ Better UX
```

---

## Risk Assessment by Task

| Task | Risk | Mitigation |
|------|------|-----------|
| AudioWorklet implementation | HIGH | Use reference worklet code, test incrementally |
| Knob direction change | MEDIUM | Test thoroughly, may break existing user prefs |
| Parameter wiring | MEDIUM | Test each plugin separately |
| Metering system | MEDIUM | Start with one meter, expand |
| MonitorSection refactoring | LOW | Make changes incrementally with commits |

---

## Success Criteria

### Phase 1 Complete When:
- [ ] `npm run typecheck` shows 0 errors
- [ ] AudioWorklets load without errors
- [ ] EQ/Limiter/Compressor process audio
- [ ] Stereo/Tape plugins connected
- [ ] Plugin parameters affect output audio

### Phase 2 Complete When:
- [ ] Knob drag direction is intuitive (down = increase)
- [ ] VU meters show real-time levels
- [ ] Gain reduction meter works
- [ ] Double-click edit validates ranges
- [ ] All parameter changes audible

### Phase 3 Complete When:
- [ ] Legacy controls removed from MonitorSection
- [ ] Plugin buttons have clear feedback
- [ ] Metering mode toggle working
- [ ] Mobile layout optimized

### Phase 4 Complete When:
- [ ] Unit tests pass (>80% coverage)
- [ ] E2E tests pass on all platforms
- [ ] Documentation complete
- [ ] Ready for user testing

---

## Next Steps

1. **Print this document** and use it to create tasks in your project tracking tool
2. **Start with Phase 1** - these are blocking for everything else
3. **Create commits** for each major task completion
4. **Test incrementally** - don't batch multiple changes
5. **Document changes** as you go

---

## Related Documents

- `CODEBASE_ASSESSMENT.md` - Detailed analysis of all issues
- `PLUGIN_SYSTEM_IMPLEMENTATION.md` - What was already completed
- `README.md` - Project overview

