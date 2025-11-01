# Tasks: Mastering Plugins UI/UX

This task list implements the requirements from `0003-prd-mastering-plugins-ui-ux.md`.

## Relevant Files

### New Files to Create

- `src/components/mastering/PluginModal.tsx` - Base modal overlay component for full-screen plugin display with backdrop
- `src/components/mastering/plugins/PluginBase.tsx` - Shared plugin layout component with header, waveform, controls area, and footer
- `src/components/mastering/plugins/PluginFooter.tsx` - Reusable footer with bypass, reset, and A/B comparison buttons
- `src/components/mastering/plugins/MiniTransport.tsx` - Compact transport controls (play/pause/stop) for plugin panels
- `src/components/mastering/plugins/EQPlugin.tsx` - Baxandall 2-band EQ plugin interface
- `src/components/mastering/plugins/LimiterPlugin.tsx` - Oxford-style limiter plugin interface
- `src/components/mastering/plugins/StereoPlugin.tsx` - Stereo width plugin interface
- `src/components/mastering/plugins/TapePlugin.tsx` - Tape saturation plugin interface
- `src/components/mastering/plugins/InputPlugin.tsx` - Input gain plugin interface
- `src/components/mastering/plugins/OutputPlugin.tsx` - Output level plugin interface
- `src/components/mastering/ABComparison.tsx` - A/B comparison component with Song A/B trim controls
- `src/components/mastering/MeteringModeToggle.tsx` - Toggle button for switching between INPUT/OUTPUT/REDUCTION metering modes
- `src/lib/types/plugin.types.ts` - TypeScript interfaces for plugin parameters and state
- `src/hooks/usePluginState.ts` - Custom hook for managing plugin parameter state and persistence

### Files to Modify

- `src/store/audioStore.ts` - Extend store with plugin UI state, A/B comparison state, metering mode, and new actions
- `src/components/mastering/MonitorSection.tsx` - Remove EQ GAIN/RED GAIN/stereo width section, integrate A/B comparison, add metering mode toggle
- `src/components/mastering/VUMeter.tsx` - Connect to real audio engine metering data instead of fake/static values
- `src/pages/index.tsx` - Add plugin modal rendering based on open plugin state

### Test Files

- `src/components/mastering/PluginModal.test.tsx` - Unit tests for modal open/close, backdrop click, ESC key
- `src/components/mastering/plugins/PluginBase.test.tsx` - Unit tests for shared plugin layout
- `src/components/mastering/plugins/EQPlugin.test.tsx` - Unit tests for EQ plugin controls and parameter updates
- `src/components/mastering/plugins/LimiterPlugin.test.tsx` - Unit tests for limiter plugin
- `src/components/mastering/ABComparison.test.tsx` - Unit tests for A/B mode switching and crossfade
- `src/hooks/usePluginState.test.ts` - Unit tests for plugin state persistence hook

### Notes

- Unit tests should be placed alongside the component files (e.g., `EQPlugin.tsx` and `EQPlugin.test.tsx` in same directory)
- Use `npm run test` to run all tests
- Use `npm run test -- EQPlugin.test.tsx` to run specific test files
- Follow existing patterns in codebase for component structure and styling
- Maintain hardware aesthetic with existing color palette and gradients

---

## Tasks

- [x] **1.0 Foundation: Plugin Modal System & State Management**
  - [x] 1.1 Create `src/lib/types/plugin.types.ts` with TypeScript interfaces for all plugin parameter types (EQParams, LimiterParams, StereoParams, TapeParams, InputParams, OutputParams) and plugin UI state types (PluginType enum, PluginModalState, ABComparisonState, MeteringMode enum)
  - [x] 1.2 Extend `src/store/audioStore.ts` interface to include plugin state: `openPlugin`, `eqParams`, `limiterParams`, `stereoParams`, `tapeParams`, `inputParams`, `outputParams`, `songBFile`, `abMode`, `songATrim`, `songBTrim`, `crossfade`, `activeSong`, `meteringMode`
  - [x] 1.3 Add actions to `audioStore.ts`: `openPlugin(plugin)`, `closePlugin()`, `updatePluginParams(plugin, params)`, `loadSongB(file)`, `setABMode(mode)`, `toggleActiveSong()`, `setCrossfade(value)`, `setMeteringMode(mode)`, `setSongATrim(gain)`, `setSongBTrim(gain)`
  - [x] 1.4 Implement state persistence logic in audio store using Zustand persist middleware for plugin parameters (save to localStorage on update, restore on initialization)
  - [x] 1.5 Create `src/components/mastering/PluginModal.tsx` base modal component with full-screen overlay, dark backdrop (bg-black/80), centered content area, click-outside-to-close functionality, ESC key handler, and smooth fade-in/slide-up animation
  - [x] 1.6 Update `MonitorSection.tsx` to connect macro button double-tap to `openPlugin()` action from audio store (replace console.log with store action call)
  - [x] 1.7 Add plugin modal rendering in `src/pages/index.tsx` that conditionally renders PluginModal when `openPlugin` state is not null
  - [ ] 1.8 Write unit tests for `PluginModal.tsx`: test open/close behavior, ESC key handling, backdrop click, animation timing
  - [ ] 1.9 Write unit tests for audio store plugin actions: test state updates, persistence, parameter validation

- [ ] **2.0 A/B Comparison System & MonitorSection Refactoring**
  - [ ] 2.1 Create `src/components/mastering/ABComparison.tsx` component with mode toggle (Reference/Dry-Wet), Song A and Song B file displays, Song A Trim and Song B Trim rotary knobs (range: -12 to +12 dB), crossfade slider (0-100%), active song indicator (A or B highlighted), quick switch button, and LUFS display for both songs
  - [ ] 2.2 Implement reference track loading in A/B component: add file input for Song B, validate audio format, load into audio context, store in `songBFile` state, handle loading errors with user feedback
  - [ ] 2.3 Implement dry/wet comparison mode: when mode is "dry-wet", Song B should be the unprocessed version of Song A (bypass all plugins), update audio routing to support dry/wet switching
  - [ ] 2.4 Connect A/B trim controls to audio store actions (`setSongATrim`, `setSongBTrim`) with debounced updates (10ms debounce to prevent excessive state updates)
  - [ ] 2.5 Implement crossfade functionality: connect slider to `setCrossfade` action, implement audio mixing logic in playback engine (0% = Song A only, 100% = Song B only, 50% = equal mix), smooth parameter ramping to prevent clicks
  - [ ] 2.6 Implement quick switch toggle: button to instantly switch between Song A and Song B (set crossfade to 0% or 100%), add keyboard shortcut (Space bar when not playing)
  - [ ] 2.7 Remove EQ GAIN and RED GAIN knob sections from `MonitorSection.tsx` (delete the rotary knobs at lines ~122-160)
  - [ ] 2.8 Remove stereo width section from `MonitorSection.tsx` (delete the entire "STEREO WIDTH" section with limiter threshold control, as this is now in the STEREO plugin)
  - [ ] 2.9 Integrate ABComparison component into MonitorSection layout: replace removed knobs section with A/B comparison component, ensure responsive grid layout works on mobile/tablet/desktop
  - [ ] 2.10 Add LUFS metering for both Song A and Song B: subscribe to engine metering data, calculate integrated LUFS for each song, display in A/B comparison component with color coding (green for streaming-ready -14 LUFS, yellow for warning, red for too loud/quiet)
  - [ ] 2.11 Write unit tests for `ABComparison.tsx`: test mode switching, file loading, trim controls, crossfade, quick switch
  - [ ] 2.12 Write E2E test for A/B comparison workflow: load primary track, load reference track, adjust trim, crossfade between tracks, verify audio output

- [x] **3.0 Plugin Base Components & Shared Infrastructure**
  - [x] 3.1 Create `src/components/mastering/plugins/PluginBase.tsx` layout component with consistent structure: header section (plugin title, close button), waveform section (embedded WaveformDisplay component with reduced height of 80px), transport section (mini transport controls below waveform), main controls section (children prop for plugin-specific controls, flex-1 with overflow-auto), footer section (PluginFooter component)
  - [x] 3.2 Style PluginBase to match hardware aesthetic: use bg-gradient-to-b from-gray-800 to-gray-900, add border-2 border-gray-700, include screw details in corners, add subtle shadows, ensure full-screen height (h-full)
  - [x] 3.3 Create `src/components/mastering/plugins/MiniTransport.tsx` compact transport controls: play/pause/stop buttons (smaller HardwareButton components), current time and duration display (mm:ss format), sync with audio store playback state, handle play/pause/stop actions from audio store
  - [x] 3.4 Create `src/components/mastering/plugins/PluginFooter.tsx` with three action buttons: BYPASS button (toggle active/bypassed state with LED indicator, connect to plugin bypass parameter), RESET button (reset all plugin parameters to defaults with confirmation prompt), A/B COMPARE button (quick toggle between processed and dry signal for current plugin only)
  - [ ] 3.5 Create `src/hooks/usePluginState.ts` custom hook for managing plugin parameters: accept plugin type and default params, subscribe to audio store plugin state, return current params and update function, handle debouncing for smooth parameter changes (10ms debounce), implement auto-save to localStorage
  - [ ] 3.6 Implement plugin parameter reset logic: define default parameter values for each plugin type, create reset function that updates store with defaults, add confirmation dialog for reset action (prevent accidental resets)
  - [ ] 3.7 Implement per-plugin A/B comparison: when user clicks A/B button in footer, temporarily bypass only the current plugin, store previous bypass state, toggle back on second click, provide visual feedback (button active state)
  - [x] 3.8 Integrate WaveformDisplay into PluginBase: pass height prop (80px for compact view), ensure click-to-seek works, sync playback cursor with audio store currentTime, handle responsive sizing for mobile
  - [ ] 3.9 Add ESC key handler to PluginBase: detect ESC keypress, call `closePlugin()` action, prevent event bubbling
  - [ ] 3.10 Write unit tests for `PluginBase.tsx`: test layout rendering, waveform integration, transport controls, footer actions
  - [ ] 3.11 Write unit tests for `usePluginState.ts` hook: test parameter updates, debouncing, persistence, reset functionality

- [x] **4.0 Individual Plugin Implementations (6 Plugins)**

  **4.1 EQ Plugin (Baxandall 2-Band)**
  - [x] 4.1.1 Create `src/components/mastering/plugins/EQPlugin.tsx` using PluginBase wrapper
  - [x] 4.1.2 Add four RotaryKnob controls: Bass Gain (-12 to +12 dB, step 0.1, default 0), Bass Frequency (20-500 Hz, step 1, default 100), Treble Gain (-12 to +12 dB, step 0.1, default 0), Treble Frequency (1k-20k Hz, step 10, default 10k)
  - [x] 4.1.3 Implement knob value to parameter conversion: map 0-100 knob range to parameter ranges, add value display below each knob (show actual dB/Hz values), implement option-click reset for individual knobs
  - [x] 4.1.4 Connect EQ controls to `updatePluginParams('eq', params)` action with debouncing (10ms)
  - [x] 4.1.5 Add VU meter in EQ plugin showing post-EQ output level
  - [x] 4.1.6 Style EQ plugin to match hardware aesthetic: 2x2 grid layout for knobs on desktop, single column on mobile, use existing RotaryKnob component with burgundy color for gain, default color for frequency
  - [ ] 4.1.7 Write unit tests for EQPlugin: test knob parameter updates, value conversions, store integration, reset functionality

  **4.2 Limiter Plugin (Oxford-Style)**
  - [ ] 4.2.1 Create `src/components/mastering/plugins/LimiterPlugin.tsx` using PluginBase wrapper
  - [ ] 4.2.2 Add Threshold rotary knob (-20 to 0 dB, step 0.1, default -0.3 dB)
  - [ ] 4.2.3 Add Release rotary knob (10-1000 ms, step 1, default 100 ms)
  - [ ] 4.2.4 Add Output Ceiling display (fixed at -0.1 dBTP, display-only value in monospace font)
  - [ ] 4.2.5 Add Gain Reduction meter (VU-style, range 0 to -20 dB, green/yellow/red zones, real-time update from metering data)
  - [ ] 4.2.6 Add Input/Output level meters (dual VU meters showing pre and post limiting levels)
  - [ ] 4.2.7 Add True Peak indicator (red LED-style warning if exceeding -0.1 dBTP)
  - [ ] 4.2.8 Connect limiter controls to `updatePluginParams('limiter', params)` action
  - [ ] 4.2.9 Subscribe to metering data for gain reduction display (update at 60 FPS)
  - [ ] 4.2.10 Style limiter plugin: vertical layout with knobs at top, meters in center, peak warning at bottom
  - [ ] 4.2.11 Write unit tests for LimiterPlugin: test parameter updates, metering integration, peak detection

  **4.3 Stereo Plugin (Width Control)**
  - [ ] 4.3.1 Create `src/components/mastering/plugins/StereoPlugin.tsx` using PluginBase wrapper
  - [ ] 4.3.2 Add Width rotary knob (0-200%, step 1, default 100%, where 0% = mono, 100% = unchanged, 200% = extra wide)
  - [ ] 4.3.3 Add stereo width visualization: circular or bar display showing stereo field width, animated based on current width parameter
  - [ ] 4.3.4 Add phase correlation meter (range -1 to +1, display as horizontal bar, color-coded: green for good correlation, yellow for warning, red for phase issues)
  - [ ] 4.3.5 Add L/R channel level meters (dual VU meters)
  - [ ] 4.3.6 Connect width control to `updatePluginParams('stereo', params)` action
  - [ ] 4.3.7 Subscribe to metering data for phase correlation display
  - [ ] 4.3.8 Style stereo plugin: centered width knob, visual meters below
  - [ ] 4.3.9 Write unit tests for StereoPlugin: test width parameter updates, phase correlation display

  **4.4 Tape Plugin (Saturation)**
  - [ ] 4.4.1 Create `src/components/mastering/plugins/TapePlugin.tsx` using PluginBase wrapper
  - [ ] 4.4.2 Add Drive rotary knob (0-100%, step 1, default 0%)
  - [ ] 4.4.3 Add harmonic distortion visualization: spectrum analyzer showing added harmonics, or simple bar graph showing harmonic content
  - [ ] 4.4.4 Add Input/Output level meters (show gain staging effect of saturation)
  - [ ] 4.4.5 Add "warmth indicator" visual effect: glow or color intensity that increases with drive amount (subtle orange/amber glow)
  - [ ] 4.4.6 Connect drive control to `updatePluginParams('tape', params)` action
  - [ ] 4.4.7 Style tape plugin: large centered drive knob, meters and visualization below
  - [ ] 4.4.8 Write unit tests for TapePlugin: test drive parameter updates, visual feedback

  **4.5 Input Plugin**
  - [ ] 4.5.1 Create `src/components/mastering/plugins/InputPlugin.tsx` using PluginBase wrapper
  - [ ] 4.5.2 Add Gain rotary knob (-12 to +12 dB, step 0.1, default 0 dB)
  - [ ] 4.5.3 Add Input level meter (pre-gain, showing incoming audio level)
  - [ ] 4.5.4 Add Output level meter (post-gain, showing adjusted level)
  - [ ] 4.5.5 Add clipping indicator (red LED-style warning if signal exceeds 0 dBFS at any point)
  - [ ] 4.5.6 Connect gain control to `updatePluginParams('input', params)` action
  - [ ] 4.5.7 Subscribe to metering data for input/output levels and clip detection
  - [ ] 4.5.8 Style input plugin: simple vertical layout with gain knob and meters
  - [ ] 4.5.9 Write unit tests for InputPlugin: test gain parameter updates, clip detection

  **4.6 Output Plugin**
  - [ ] 4.6.1 Create `src/components/mastering/plugins/OutputPlugin.tsx` using PluginBase wrapper
  - [ ] 4.6.2 Add Master Level rotary knob (-12 to +12 dB, step 0.1, default 0 dB)
  - [ ] 4.6.3 Add final output level meters (L/R stereo meters)
  - [ ] 4.6.4 Add LUFS meter (integrated loudness display with color coding for streaming targets: green for -14 LUFS, yellow for warning, red for out of range)
  - [ ] 4.6.5 Add True Peak meter (display dBTP with red warning if exceeding -0.1 dBTP)
  - [ ] 4.6.6 Add "Export Ready" indicator (green checkmark when audio meets streaming standards: -14 LUFS ±1, true peak < -0.1 dBTP)
  - [ ] 4.6.7 Connect master level control to `updatePluginParams('output', params)` action
  - [ ] 4.6.8 Subscribe to metering data for all output metrics (LUFS, true peak, levels)
  - [ ] 4.6.9 Style output plugin: master level knob at top, comprehensive metering below, export indicator at bottom
  - [ ] 4.6.10 Write unit tests for OutputPlugin: test level parameter updates, LUFS calculation, export readiness logic

- [ ] **5.0 Real-Time Metering Integration & Polish**
  - [ ] 5.1 Create `src/components/mastering/MeteringModeToggle.tsx` component: hardware-style button to cycle through INPUT/OUTPUT/REDUCTION modes, display current mode with LED-style indicator, update audio store meteringMode state on click
  - [ ] 5.2 Update `VUMeter.tsx` to accept metering mode and data props: remove fake/static data generation, accept real metering data from props, implement mode-based value selection (input peak for INPUT mode, output peak for OUTPUT mode, gain reduction for REDUCTION mode)
  - [ ] 5.3 Connect VU meters in MonitorSection to real audio store metering data: subscribe to `meteringData` from audio store, pass appropriate values to VUMeter components based on current `meteringMode`, implement 60 FPS update rate using requestAnimationFrame
  - [ ] 5.4 Implement metering callback in audio engines: update `MasteringEngine.ts` to fire metering callback with comprehensive data (input/output levels, gain reduction, LUFS, phase correlation), ensure callback fires at configured rate (60 Hz default)
  - [ ] 5.5 Add metering data aggregation in audio store: create action to receive metering data from engine, aggregate data for display, calculate derived metrics (LUFS integrated/short-term/momentary)
  - [ ] 5.6 Integrate MeteringModeToggle into MonitorSection: add toggle button near VU meters, connect to audio store meteringMode state, ensure visual feedback for active mode
  - [ ] 5.7 Test metering accuracy: verify VU meter values match expected audio levels within 0.1 dB tolerance, test all three metering modes (INPUT/OUTPUT/REDUCTION), ensure meters respond smoothly without jitter
  - [ ] 5.8 Optimize mobile full-screen plugin behavior: ensure plugins take true full-screen on mobile (<768px), hide parent UI elements when plugin is open, increase touch target sizes to minimum 44x44px, test on iOS Safari and Chrome Android
  - [ ] 5.9 Add swipe-to-close gesture for mobile plugins: implement touch event handlers for swipe-down gesture, add visual feedback during swipe (plugin follows finger), call closePlugin() when swipe threshold reached (>100px), add smooth spring animation
  - [ ] 5.10 Implement parameter smoothing for all plugins: add smoothing/ramping to prevent audio clicks on parameter changes, use exponential smoothing or linear ramp (10-50ms ramp time), test with rapid knob adjustments
  - [ ] 5.11 Add keyboard shortcuts: ESC to close plugin (already implemented), Space to quick A/B toggle (when not playing), numbers 1-6 to open plugins directly, test keyboard navigation flow
  - [ ] 5.12 Performance optimization: profile component re-renders using React DevTools, memoize plugin components with React.memo, debounce metering updates to 60 FPS cap, lazy load plugin components with dynamic imports, test on low-end devices (iPhone 12, mid-range Android)
  - [ ] 5.13 Visual polish and animations: fine-tune modal open/close animations (300ms ease-out), add subtle knob rotation animations, ensure meter needle animations are smooth (60 FPS), add micro-interactions (button press effects, LED glows), verify hardware aesthetic consistency across all plugins
  - [ ] 5.14 Write E2E tests with Playwright: complete mastering workflow (upload audio → open EQ plugin → adjust parameters → open limiter → check metering → A/B comparison → export), mobile plugin interaction test, performance test (ensure no audio dropouts during plugin switching)
  - [ ] 5.15 Cross-browser testing: test on Chrome 90+, Safari 14+, Firefox 88+, Edge 90+, verify AudioWorklet support, test on iOS Safari (WebKit audio context quirks), test on Android Chrome
  - [ ] 5.16 Documentation: add inline code comments for complex plugin logic, create developer documentation for adding new plugins, update user-facing tooltips and help text, create video demo of plugin workflow

---

## Implementation Notes

### Plugin Parameter Mapping

When creating plugin controls, map rotary knob values (0-100) to actual parameter ranges:

```typescript
// Example for EQ Bass Gain (-12 to +12 dB)
const knobValue = 50; // 0-100 range
const bassGain = (knobValue - 50) * 0.24; // Maps to -12 to +12 dB

// Example for Limiter Threshold (-20 to 0 dB)
const threshold = (knobValue * 0.2) - 20; // Maps to -20 to 0 dB
```

### Audio Store Integration Pattern

All plugins follow this pattern for state updates:

```typescript
// In plugin component
const { updatePluginParams } = useAudioStore();
const params = usePluginState('eq'); // Custom hook

const handleBassGainChange = (knobValue: number) => {
  const bassGain = convertKnobToParam(knobValue);
  updatePluginParams('eq', { bassGain });
};
```

### Metering Data Flow

```
AudioWorklet (process 128 samples)
  → Calculate levels/GR/LUFS
  → Post message to main thread
  → MasteringEngine receives message
  → Fire metering callback
  → Audio store updateMetering action
  → VUMeter components re-render
  → Display updated values
```

### File Organization

```
src/components/mastering/
├── plugins/
│   ├── PluginBase.tsx          (shared layout)
│   ├── PluginFooter.tsx        (shared footer)
│   ├── MiniTransport.tsx       (shared transport)
│   ├── EQPlugin.tsx            (individual plugins)
│   ├── LimiterPlugin.tsx
│   ├── StereoPlugin.tsx
│   ├── TapePlugin.tsx
│   ├── InputPlugin.tsx
│   └── OutputPlugin.tsx
├── PluginModal.tsx             (modal wrapper)
├── ABComparison.tsx            (A/B system)
├── MeteringModeToggle.tsx      (metering mode)
└── MonitorSection.tsx          (updated main section)
```

### Testing Strategy

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test plugin → store → engine flow
3. **E2E Tests**: Test complete user workflows with Playwright
4. **Performance Tests**: Monitor for audio dropouts, memory leaks
5. **Visual Regression**: Screenshot comparison for UI consistency

### Performance Targets

- Plugin open time: < 200ms
- Parameter update latency: < 10ms
- Metering refresh rate: 60 FPS
- Memory usage: < 50MB additional
- No audio glitches during plugin switching

### Accessibility Considerations

- All controls keyboard accessible (Tab navigation)
- ARIA labels for screen readers
- Focus indicators visible
- Minimum 44x44px touch targets on mobile
- High contrast mode support

---

## Final Checklist Before PR

- [ ] All 6 plugins render correctly
- [ ] Double-tap opens plugin modal
- [ ] Transport controls work in plugin
- [ ] Parameters update audio in real-time
- [ ] VU meters show accurate levels
- [ ] A/B comparison functional
- [ ] Metering mode toggle works
- [ ] Stereo width section removed
- [ ] EQ/RED gain knobs removed
- [ ] Mobile full-screen working
- [ ] Swipe-to-close on mobile
- [ ] State persists on page reload
- [ ] ESC key closes plugin
- [ ] No audio glitches
- [ ] All tests passing
- [ ] Cross-browser tested
- [ ] Performance acceptable
- [ ] Hardware aesthetic consistent
- [ ] Code documented
- [ ] Ready for user testing

---

**END OF TASK LIST**
