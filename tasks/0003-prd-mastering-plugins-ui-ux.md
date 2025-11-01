# Product Requirements Document: Mastering Plugins UI/UX

**Version**: 1.0
**Date**: November 1, 2025
**Author**: Product Team
**Status**: Ready for Implementation

---

## 1. Introduction/Overview

### Problem Statement
The Maestro Mastering Suite currently has a macro button system for selecting plugins (EQ, LIMITER, STEREO, TAPE, INPUT, OUTPUT), which visually highlights the selected plugin with a green border on double-tap. However, the actual plugin interfaces do not exist - there are no detailed controls for adjusting EQ curves, limiter thresholds, saturation drive, or other processing parameters. This renders the plugin selection system non-functional for actual audio processing.

Additionally, several UI elements are misplaced or redundant:
- The "EQ GAIN" and "RED GAIN" knobs are incorrectly positioned and should be replaced with A/B comparison controls
- The stereo width section is redundant with the STEREO plugin
- VU meters display fake/static data and don't reflect actual audio processing
- Users cannot interact with the waveform while adjusting plugin parameters

### Solution
Design and implement professional, hardware-inspired plugin interfaces that open as full-screen modal overlays when a user double-taps a macro button. Each plugin will feature:
- Professional-grade controls matching the hardware aesthetic
- Integrated transport controls and waveform scrubbing
- Real-time metering that accurately reflects audio processing
- A/B comparison system replacing the current misplaced controls
- Non-destructive processing chain with state persistence

### Goal
Create a cohesive, professional mastering environment where users can double-tap a plugin button and immediately access a full-featured, hardware-styled interface for precise audio processing - all while maintaining the ability to audition changes in real-time via the integrated transport and waveform display.

---

## 2. Goals & Objectives

### Primary Goals
1. **Professional Plugin Interfaces**: Each of the 6 plugins (EQ, LIMITER, STEREO, TAPE, INPUT, OUTPUT) must have a dedicated, full-featured interface
2. **Seamless Integration**: Plugin panels must blend perfectly with the existing hardware-inspired aesthetic
3. **Real-Time Workflow**: Users must be able to scrub and play audio while adjusting plugin parameters
4. **Accurate Metering**: VU meters and visual feedback must reflect actual audio processing in real-time
5. **A/B Comparison**: Replace redundant controls with a proper A/B reference comparison system

### Success Metrics
- Users can open any plugin and make meaningful adjustments within 3 seconds
- All plugin controls update audio processing in < 10ms
- VU meters accurately track audio levels within 0.1 dB
- A/B comparison allows quick reference checking
- Plugin state persists when switching between plugins
- Mobile full-screen mode provides distraction-free workflow

---

## 3. User Stories

### Must Have (P0)

1. **As a mastering engineer**, I want to double-tap the EQ button and see a full Baxandall EQ interface with bass/treble controls, so I can shape the tonal balance of my master.

2. **As a producer**, I want to scrub through my track while the EQ plugin is open, so I can hear how my adjustments affect different sections of the song.

3. **As a mixing engineer**, I want the VU meters to show real output levels as I adjust the limiter, so I know exactly how much gain reduction is happening.

4. **As a mobile user**, I want plugins to open in full-screen mode, so I have maximum space for precision adjustments without UI clutter.

5. **As an audio professional**, I want to load a reference track and use A/B comparison with trim controls, so I can match the tonal balance and loudness of commercial releases.

### Should Have (P1)

6. **As a user**, I want my plugin settings to persist when I switch between plugins, so I don't lose my work when exploring different processors.

7. **As a mastering engineer**, I want to see which plugins are active in my processing chain, so I understand the signal flow.

8. **As a producer**, I want simple, focused plugin controls that match the hardware aesthetic, so the interface doesn't overwhelm me.

### Nice to Have (P2)

9. **As a user**, I want keyboard shortcuts to open/close plugins quickly.

10. **As a user**, I want to save and recall plugin presets for common mastering scenarios.

---

## 4. Functional Requirements

### 4.1 Plugin Panel System

#### 4.1.1 Modal Overlay Architecture
- **Requirement FR-1**: Plugin panels must open as full-screen modal overlays that cover the entire interface
- **Implementation**:
  - When a macro button is double-tapped, render a full-screen overlay component
  - Only one plugin can be open at a time
  - Opening a new plugin automatically closes the currently open plugin
  - Overlay includes dark backdrop (80% opacity black) with plugin panel centered
  - ESC key or close button dismisses the plugin panel

#### 4.1.2 Integrated Transport Controls
- **Requirement FR-2**: Each plugin panel must include transport controls and waveform scrubbing
- **Implementation**:
  - Embed mini transport controls (play/pause/stop) in plugin header
  - Include waveform display with click-to-seek functionality
  - Display current time and duration
  - Show playback cursor position on waveform
  - Allow scrubbing during parameter adjustment
  - Transport state syncs with main player

#### 4.1.3 Plugin Panel Layout
- **Requirement FR-3**: All plugin panels must follow consistent layout structure
- **Structure**:
  ```
  ┌─────────────────────────────────────┐
  │ [Plugin Name]          [X] Close    │ ← Header
  ├─────────────────────────────────────┤
  │ Waveform Display + Transport        │ ← Waveform Section
  ├─────────────────────────────────────┤
  │                                     │
  │    Plugin-Specific Controls         │ ← Control Section
  │    (Rotary Knobs, Meters, etc.)     │
  │                                     │
  ├─────────────────────────────────────┤
  │ [Bypass] [Reset] [A/B Compare]      │ ← Footer Actions
  └─────────────────────────────────────┘
  ```

### 4.2 Individual Plugin Specifications

#### 4.2.1 EQ Plugin (Baxandall 2-Band)
**File**: `src/components/mastering/plugins/EQPlugin.tsx`

**Controls**:
- **Bass Gain**: Rotary knob, -12 dB to +12 dB, default 0 dB
- **Bass Frequency**: Rotary knob, 20 Hz to 500 Hz, default 100 Hz
- **Treble Gain**: Rotary knob, -12 dB to +12 dB, default 0 dB
- **Treble Frequency**: Rotary knob, 1 kHz to 20 kHz, default 10 kHz
- **Bypass Toggle**: Hardware-style button

**Visual Feedback**:
- Frequency response curve visualization (optional, if space allows)
- Gain value displays below each knob
- VU meter showing output level

**Integration**:
- Connects to `MasteringEngine.updateEQ(params)`
- Real-time parameter updates with smoothing

#### 4.2.2 LIMITER Plugin (Oxford-Style)
**File**: `src/components/mastering/plugins/LimiterPlugin.tsx`

**Controls**:
- **Threshold**: Rotary knob, -20 dB to 0 dB, default -0.3 dB
- **Release**: Rotary knob, 10ms to 1000ms, default 100ms
- **Output Ceiling**: Display only, shows true peak limit (-0.1 dBTP)

**Visual Feedback**:
- Gain reduction meter (VU-style, showing 0 to -20 dB GR)
- Input/Output level meters
- True peak indicator (red warning if exceeding -0.1 dBTP)

**Integration**:
- Connects to `MasteringEngine.updateLimiter(params)`
- Look-ahead processing for transparent limiting
- Real-time gain reduction metering

#### 4.2.3 STEREO Plugin (Width Control)
**File**: `src/components/mastering/plugins/StereoPlugin.tsx`

**Controls**:
- **Width**: Rotary knob, 0% (mono) to 200% (extra wide), default 100%
- **Bypass Toggle**: Hardware-style button

**Visual Feedback**:
- Stereo width meter (visual representation of stereo field)
- Phase correlation meter (-1 to +1)
- L/R channel level meters

**Integration**:
- Connects to `MasteringEngine.updateStereoWidth(params)`
- Real-time stereo field processing

#### 4.2.4 TAPE Plugin (Saturation)
**File**: `src/components/mastering/plugins/TapePlugin.tsx`

**Controls**:
- **Drive**: Rotary knob, 0% to 100%, default 0%
- **Bypass Toggle**: Hardware-style button

**Visual Feedback**:
- Harmonic distortion meter (shows added harmonics)
- Input/Output level meters
- Warmth indicator (visual glow effect based on drive amount)

**Integration**:
- Connects to `MasteringEngine.updateTapeSaturation(params)`
- Analog-style saturation algorithm

#### 4.2.5 INPUT Plugin
**File**: `src/components/mastering/plugins/InputPlugin.tsx`

**Controls**:
- **Gain**: Rotary knob, -12 dB to +12 dB, default 0 dB
- **Bypass Toggle**: Hardware-style button

**Visual Feedback**:
- Input level meter (pre-gain)
- Output level meter (post-gain)
- Clipping indicator (red warning if exceeding 0 dBFS)

**Integration**:
- Connects to `MasteringEngine.updateInputGain(params)`
- Adjusts input level before processing chain

#### 4.2.6 OUTPUT Plugin
**File**: `src/components/mastering/plugins/OutputPlugin.tsx`

**Controls**:
- **Master Level**: Rotary knob, -12 dB to +12 dB, default 0 dB
- **Bypass Toggle**: Hardware-style button

**Visual Feedback**:
- Final output level meters (L/R)
- LUFS meter (integrated loudness)
- True peak meter
- Export-ready indicator (green when meeting streaming standards)

**Integration**:
- Connects to `MasteringEngine.updateOutputGain(params)`
- Final stage before output

### 4.3 A/B Comparison System

#### 4.3.1 Replace EQ GAIN/RED GAIN Controls
- **Requirement FR-4**: Remove the current "EQ GAIN" and "RED GAIN" rotary knobs from MonitorSection
- **Requirement FR-5**: Replace with "SONG A TRIM" and "SONG B TRIM" controls in a new A/B comparison section

#### 4.3.2 A/B Comparison Features
**File**: `src/components/mastering/ABComparison.tsx`

**Functionality**:
- **Song A**: Primary track being mastered (current loaded audio)
- **Song B**: Optional reference track or dry/wet comparison
- **Mode Selection**:
  - **Reference Mode**: Load external reference track
  - **Dry/Wet Mode**: Compare processed vs unprocessed version of Song A
- **Trim Controls**:
  - Song A Trim: Rotary knob, -12 dB to +12 dB, level match for fair comparison
  - Song B Trim: Rotary knob, -12 dB to +12 dB, level match for fair comparison
- **Crossfade**: Slider for smooth A/B transition (0% = Song A, 100% = Song B)
- **Quick Switch**: Button to instantly toggle between A and B

**Visual Feedback**:
- Active song indicator (A or B highlighted)
- Level meters for both songs
- LUFS comparison display

**Integration**:
- Connects to audio store for file management
- Syncs playback position when switching between A and B

### 4.4 Real-Time Metering System

#### 4.4.1 VU Meter Integration
- **Requirement FR-6**: VU meters must display real-time audio levels accurately
- **Implementation**:
  - Subscribe to `MasteringEngine.setOnMetering()` callback
  - Update at 60 FPS minimum
  - Display both input and output levels based on metering mode
  - Include mode toggle: "INPUT" vs "OUTPUT" vs "REDUCTION"

#### 4.4.2 Metering Modes
- **INPUT Mode**: Pre-processing levels (what's coming in)
- **OUTPUT Mode**: Post-processing levels (what's going out)
- **REDUCTION Mode**: Gain reduction from dynamics processors (limiter, compressor)
- **Mode Toggle**: Hardware button to cycle through modes

#### 4.4.3 Meter Types
- **VU Meters**: Analog-style ballistics, green/yellow/red zones
- **Peak Meters**: Fast attack, slow release, true peak detection
- **LUFS Meter**: Integrated, short-term, and momentary loudness
- **Phase Correlation**: -1 to +1 display with phase coherence warning

### 4.5 Stereo Width Section Removal

#### 4.5.1 Remove Redundant Section
- **Requirement FR-7**: Completely remove the existing stereo width section from MonitorSection
- **Location**: Current section in `MonitorSection.tsx` showing "STEREO WIDTH" with limiter threshold control
- **Rationale**: This functionality is now consolidated into the dedicated STEREO plugin

### 4.6 Plugin State Management

#### 4.6.1 State Persistence
- **Requirement FR-8**: Plugin settings must persist when switching between plugins
- **Implementation**:
  - Store plugin parameters in audio store state
  - Each plugin maintains its own parameter object
  - Switching plugins saves current state and loads previous state
  - State persists across session (localStorage backup)

#### 4.6.2 Processing Chain Behavior
- **Requirement FR-9**: All plugins remain active in the processing chain regardless of UI state
- **Implementation**:
  - Plugins process audio continuously (non-destructive chain)
  - Bypass state is independent of UI visibility
  - Signal flow: INPUT → EQ → TAPE → STEREO → LIMITER → OUTPUT
  - Each plugin can be individually bypassed via bypass toggle

### 4.7 Mobile-Specific Requirements

#### 4.7.1 Full-Screen Mode
- **Requirement FR-10**: On mobile devices, plugin panels take full screen
- **Implementation**:
  - Hide all other UI elements (main controls, meters)
  - Maximize plugin control area for touch interaction
  - Larger touch targets (minimum 44x44px)
  - Prevent body scrolling when plugin is open
  - Swipe-down gesture to close plugin (in addition to close button)

#### 4.7.2 Touch Optimization
- **Requirement FR-11**: All plugin controls optimized for touch input
- **Implementation**:
  - Rotary knobs respond to vertical drag gestures
  - Larger tap targets for buttons
  - Haptic feedback on parameter changes (if supported)
  - Prevent accidental touches during transport control

---

## 5. Technical Architecture

### 5.1 Component Structure

```typescript
// Plugin System Architecture

src/components/mastering/
├── MonitorSection.tsx              // Updated: Remove stereo width, add A/B
├── ABComparison.tsx                // NEW: A/B comparison controls
├── PluginModal.tsx                 // NEW: Base modal overlay component
└── plugins/
    ├── PluginBase.tsx              // NEW: Shared plugin layout/logic
    ├── EQPlugin.tsx                // NEW: Baxandall 2-band EQ
    ├── LimiterPlugin.tsx           // NEW: Oxford-style limiter
    ├── StereoPlugin.tsx            // NEW: Stereo width control
    ├── TapePlugin.tsx              // NEW: Tape saturation
    ├── InputPlugin.tsx             // NEW: Input gain
    └── OutputPlugin.tsx            // NEW: Output level
```

### 5.2 State Management

#### Audio Store Extensions
```typescript
// src/store/audioStore.ts

interface AudioStore {
  // Existing state...

  // Plugin UI state
  openPlugin: PluginType | null;  // Currently open plugin

  // Plugin parameters (persist when switching)
  eqParams: BaxandallEQParams;
  limiterParams: OxfordLimiterParams;
  stereoParams: StereoWidthParams;
  tapeParams: TapeSaturationParams;
  inputParams: InputGainParams;
  outputParams: OutputGainParams;

  // A/B Comparison
  songBFile: File | null;           // Reference track
  abMode: 'reference' | 'dry-wet';  // Comparison mode
  songATrim: number;                // -12 to +12 dB
  songBTrim: number;                // -12 to +12 dB
  crossfade: number;                // 0 to 100%
  activeSong: 'A' | 'B';            // Currently playing

  // Metering mode
  meteringMode: 'input' | 'output' | 'reduction';

  // Actions
  openPlugin: (plugin: PluginType) => void;
  closePlugin: () => void;
  updatePluginParams: (plugin: PluginType, params: any) => void;
  loadSongB: (file: File) => Promise<void>;
  setABMode: (mode: 'reference' | 'dry-wet') => void;
  toggleActiveSong: () => void;
  setMeteringMode: (mode: MeteringMode) => void;
}
```

### 5.3 Plugin Base Component

```typescript
// src/components/mastering/plugins/PluginBase.tsx

interface PluginBaseProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Base component providing consistent layout for all plugins
 * - Full-screen modal overlay
 * - Integrated transport and waveform
 * - Consistent header/footer
 * - Hardware aesthetic styling
 */
const PluginBase: React.FC<PluginBaseProps> = ({
  title,
  onClose,
  children
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="h-full bg-gradient-to-b from-gray-800 to-gray-900">
        {/* Header */}
        <div className="border-b-2 border-gray-700 p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-widest">{title}</h2>
            <button onClick={onClose}>CLOSE</button>
          </div>
        </div>

        {/* Waveform + Transport */}
        <div className="border-b-2 border-gray-700 p-4">
          <WaveformDisplay height={80} />
          <TransportControls compact />
        </div>

        {/* Plugin-specific controls */}
        <div className="p-6 flex-1 overflow-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-700 p-4">
          <PluginFooter />
        </div>
      </div>
    </div>
  );
};
```

### 5.4 Signal Flow

```
User Audio Input
      ↓
[INPUT PLUGIN] → Input Gain, Trim
      ↓
[EQ PLUGIN] → Baxandall Bass/Treble
      ↓
[TAPE PLUGIN] → Analog Saturation
      ↓
[STEREO PLUGIN] → Width Processing
      ↓
[LIMITER PLUGIN] → Oxford Limiter
      ↓
[OUTPUT PLUGIN] → Master Level
      ↓
┌─────────────┐
│ A/B System  │ → Compare with Reference or Dry
└─────────────┘
      ↓
Final Output → Speakers/Export
```

### 5.5 Metering Pipeline

```
AudioWorklet Process (128 samples)
      ↓
Calculate Levels (RMS, Peak, LUFS, Phase)
      ↓
Post Message to Main Thread
      ↓
MasteringEngine Aggregates Data
      ↓
Fire Metering Callback (60 Hz)
      ↓
Audio Store Updates Metering State
      ↓
VUMeter Components Subscribe & Re-render
      ↓
Display: Input/Output/Reduction based on mode
```

---

## 6. Design Considerations

### 6.1 Visual Design Philosophy

**Hardware-Inspired Aesthetic**:
- Match existing rotary knob design exactly
- Use VU meter green (#10b981) for active elements
- Dark gradients: from-gray-800 to-gray-900
- Metallic accents for knobs and buttons
- Subtle shadows for depth
- Screw details in corners

**Typography**:
- Headers: Bold, tracking-widest, uppercase
- Labels: Small, gray-400, uppercase
- Values: Monospace font for precise readings

**Color Palette**:
- Background: Gray-800 to Gray-900 gradients
- Accents: VU meter green (#10b981)
- Active elements: Green glow/highlight
- Warnings: Red for clipping/over-limiting
- Neutral: Gray-600 for borders

### 6.2 Animation & Interaction

**Transitions**:
- Plugin open/close: 300ms ease-out slide-up
- Parameter changes: 150ms smooth value updates
- Meter movements: 60 FPS with analog ballistics
- Button presses: Inset shadow active state

**Micro-interactions**:
- Knob rotation visual feedback
- Meter needle swing with momentum
- Button click depression effect
- Bypass toggle LED indicator

### 6.3 Responsive Behavior

**Desktop (>1024px)**:
- Plugin modal centered, max-width 900px
- Side padding for backdrop visibility
- Larger control spacing

**Tablet (768px - 1024px)**:
- Plugin modal nearly full-screen
- Slightly smaller controls
- Maintain all functionality

**Mobile (<768px)**:
- True full-screen takeover
- Larger touch targets
- Single-column control layout
- Swipe gestures enabled

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)
**Priority: P0 - CRITICAL**

**Days 1-2: Plugin Modal System**
- Create `PluginModal.tsx` base component
- Create `PluginBase.tsx` shared layout
- Implement open/close logic in audio store
- Connect double-tap detection to modal trigger
- Test modal overlay and backdrop

**Days 3-4: Integrated Transport**
- Embed `WaveformDisplay` in plugin header
- Add mini transport controls
- Ensure playback sync with main player
- Test scrubbing while plugin open

**Days 5-7: A/B Comparison System**
- Create `ABComparison.tsx` component
- Remove EQ GAIN/RED GAIN from MonitorSection
- Implement Song A/B trim controls
- Add reference track loading
- Add dry/wet comparison mode
- Test crossfade functionality

**Deliverable**: Plugin modal opens, transport works, A/B system functional

### Phase 2: Core Plugins (Week 2)
**Priority: P0 - CRITICAL**

**Days 1-2: EQ Plugin**
- Create `EQPlugin.tsx`
- Implement Baxandall controls (4 rotary knobs)
- Connect to `MasteringEngine.updateEQ()`
- Add frequency response visualization (optional)
- Test real-time EQ adjustments

**Days 3-4: Limiter Plugin**
- Create `LimiterPlugin.tsx`
- Implement Oxford limiter controls
- Add gain reduction metering
- Connect to `MasteringEngine.updateLimiter()`
- Test transparent limiting

**Days 5-7: STEREO Plugin**
- Create `StereoPlugin.tsx`
- Implement width control
- Add phase correlation meter
- Remove redundant stereo section from MonitorSection
- Test stereo field processing

**Deliverable**: EQ, Limiter, and Stereo plugins fully functional

### Phase 3: Additional Plugins (Week 3)
**Priority: P0 - CRITICAL**

**Days 1-2: TAPE Plugin**
- Create `TapePlugin.tsx`
- Implement drive control
- Add harmonic distortion visualization
- Connect to `MasteringEngine.updateTapeSaturation()`
- Test analog warmth effect

**Days 3-4: INPUT & OUTPUT Plugins**
- Create `InputPlugin.tsx` and `OutputPlugin.tsx`
- Implement gain controls
- Add input/output metering
- Connect to engine gain stages
- Test gain staging workflow

**Days 5-7: Real-Time Metering**
- Implement metering mode toggle (input/output/reduction)
- Connect VU meters to real engine data
- Add LUFS metering
- Add phase correlation display
- Optimize metering refresh rate

**Deliverable**: All 6 plugins complete, metering accurate

### Phase 4: Polish & Optimization (Week 4)
**Priority: P1 - IMPORTANT**

**Days 1-2: State Persistence**
- Implement plugin parameter persistence
- Add localStorage backup
- Test state recovery across sessions
- Optimize state updates

**Days 3-4: Mobile Optimization**
- Test all plugins on mobile devices
- Adjust touch target sizes
- Implement swipe-to-close gesture
- Optimize full-screen layout
- Test performance on low-end devices

**Days 5-7: Visual Polish**
- Fine-tune animations
- Perfect hardware aesthetic matching
- Add micro-interactions
- Test in various lighting conditions
- User acceptance testing

**Deliverable**: Production-ready plugin system

---

## 8. Non-Goals (Out of Scope)

- **Multi-band EQ**: Keeping EQ simple with 2-band Baxandall
- **Compressor Plugin**: Not included in initial 6 plugins
- **Reverb/Delay**: Not mastering-focused, out of scope
- **Spectrum Analyzer in Plugins**: Avoiding feature bloat
- **Plugin Presets**: State persistence only, no preset system (v2 feature)
- **Plugin Reordering**: Fixed signal chain order
- **Parallel Processing**: Single serial chain only
- **Mid-Side Processing**: Simple stereo width only
- **Advanced Limiter Modes**: Single transparent algorithm
- **Dithering Options**: Automated, not user-controlled
- **Plugin Resizing**: Fixed full-screen layout
- **Plugin Window Management**: One plugin at a time only

---

## 9. Testing Requirements

### 9.1 Unit Tests
- [ ] Plugin modal open/close logic
- [ ] Parameter state persistence
- [ ] A/B comparison mode switching
- [ ] Metering calculations
- [ ] Bypass toggle functionality

### 9.2 Integration Tests
- [ ] Plugin → Engine parameter updates
- [ ] Transport sync between main and plugin views
- [ ] A/B crossfade audio mixing
- [ ] Real-time metering pipeline
- [ ] Mobile full-screen behavior

### 9.3 E2E Tests (Playwright)
- [ ] Double-tap opens plugin
- [ ] Adjust EQ while playing audio
- [ ] Switch between plugins preserves state
- [ ] A/B comparison with reference track
- [ ] Mobile swipe-to-close gesture

### 9.4 Visual Regression Tests
- [ ] Plugin layouts match hardware aesthetic
- [ ] Rotary knobs render correctly
- [ ] Meters animate smoothly
- [ ] Mobile responsive layouts

### 9.5 Manual Testing Checklist
- [ ] All 6 plugins open correctly
- [ ] Parameters affect audio processing
- [ ] Meters reflect real audio levels
- [ ] A/B comparison sounds correct
- [ ] No audio glitches when switching plugins
- [ ] Touch interactions feel responsive
- [ ] Performance acceptable on mobile

---

## 10. Performance Requirements

### Metrics
- **Plugin Open Time**: < 200ms from double-tap to fully rendered
- **Parameter Update Latency**: < 10ms from knob adjustment to audio change
- **Metering Refresh Rate**: 60 FPS minimum
- **Memory Usage**: < 50MB additional for plugin system
- **Audio Glitch-Free**: No dropouts when opening/closing plugins

### Optimization Strategies
- Lazy load plugin components (code splitting)
- Memoize plugin controls with React.memo
- Throttle metering updates to 60Hz
- Use CSS transforms for animations (GPU acceleration)
- Debounce rapid parameter changes
- Pre-load plugin components on first macro button hover

---

## 11. Accessibility Requirements

- **Keyboard Navigation**: Tab through all plugin controls
- **Screen Readers**: ARIA labels for all controls
- **Focus Management**: Auto-focus first control when plugin opens
- **ESC Key**: Close plugin modal
- **High Contrast**: Ensure readability in various conditions
- **Touch Targets**: Minimum 44x44px on mobile
- **Focus Indicators**: Clear visual focus states

---

## 12. Browser & Device Support

### Required Support
- **Chrome**: 90+ (primary target)
- **Safari**: 14+ (iOS requirement)
- **Firefox**: 88+
- **Edge**: 90+

### Device Requirements
- **Desktop**: Full functionality, 1024px+ optimal
- **Tablet**: Full functionality, 768px+ optimized layout
- **Mobile**: Full-screen mode, 375px+ minimum width
- **Touch**: Optimized for touch input
- **Performance**: Smooth on iPhone 12+, modern Android flagships

---

## 13. Security & Privacy

### Requirements
- All processing client-side (no server uploads)
- Reference tracks stay on device
- No analytics tracking of plugin usage
- Secure context (HTTPS) for AudioWorklet
- localStorage encryption for sensitive preset data (future)

---

## 14. Success Metrics

### Week 1 Goals
- Plugin modal system functional
- Transport controls integrated
- A/B comparison working

### Week 2 Goals
- 3 core plugins complete (EQ, Limiter, Stereo)
- Real-time parameter updates working
- Stereo width section removed

### Week 3 Goals
- All 6 plugins complete
- Real-time metering accurate
- Mobile full-screen optimized

### Week 4 Goals
- State persistence working
- Visual polish complete
- Zero critical bugs
- User testing feedback positive

### Launch Criteria
- All 6 plugins functional
- Metering accuracy within 0.1 dB
- Parameter latency < 10ms
- Mobile performance smooth
- Hardware aesthetic perfect
- 95% test coverage

---

## 15. Open Questions

1. **Waveform Height in Plugins**: Should it be taller for better scrubbing precision, or compact to maximize control space?

2. **Visual Feedback Intensity**: How much should meters and visualizations animate? Subtle or more pronounced?

3. **Plugin Close Behavior**: Should clicking the backdrop close the plugin, or require explicit close button click?

4. **Parameter Value Display**: Show values on knobs permanently, on hover, or below knobs?

5. **A/B Crossfade Default**: Should crossfade start at 0% (A) or 50% (mix)?

6. **Metering Mode Default**: Should default be INPUT, OUTPUT, or REDUCTION mode?

7. **Bypass Visual Feedback**: How should bypassed plugins indicate state (grayed out, red LED, etc.)?

8. **Mobile Landscape Mode**: Special layout for landscape orientation, or force portrait?

---

## 16. Risk Assessment & Mitigation

### Technical Risks

**Risk 1**: Performance degradation with all plugins active
- **Impact**: High
- **Mitigation**: Optimize AudioWorklet processing, implement adaptive quality settings, test on low-end devices early

**Risk 2**: State management complexity with 6 plugins + A/B system
- **Impact**: Medium
- **Mitigation**: Use Zustand for predictable state, thorough testing, clear state update patterns

**Risk 3**: Touch input conflicts with waveform scrubbing
- **Impact**: Medium
- **Mitigation**: Larger touch targets, prevent event bubbling, haptic feedback for confirmation

### UX Risks

**Risk 1**: Full-screen modal feels disruptive on desktop
- **Impact**: Low
- **Mitigation**: Fast open/close animations, ESC key shortcut, backdrop click to close option

**Risk 2**: Users confused by A/B reference vs dry/wet modes
- **Impact**: Medium
- **Mitigation**: Clear mode labels, tooltips, visual indicators for active mode

**Risk 3**: Plugin controls too small on mobile
- **Impact**: High
- **Mitigation**: Responsive sizing, minimum 44px touch targets, test on small screens

---

## 17. Dependencies

### External Dependencies
- Web Audio API (native)
- AudioWorklet API (native)
- WaveSurfer.js (waveform display)
- React (UI framework)
- Zustand (state management)
- Tailwind CSS (styling)

### Internal Dependencies
- `MasteringEngine.ts` - Audio processing backend
- `BaseAudioEngine.ts` - Core audio functionality
- `audioStore.ts` - State management
- `RotaryKnob.tsx` - Control component
- `VUMeter.tsx` - Metering component
- `WaveformDisplay.tsx` - Waveform component

### Blocking Dependencies
- MUST complete PRD #0002 (Frontend Integration) first
- Audio engines must be functional
- Real-time metering must be working
- File upload/playback must be stable

---

## 18. User Documentation

### In-App Help
- Tooltip on first plugin open: "Double-tap macro buttons to open plugins"
- Tooltip on A/B section: "Load a reference track or compare dry/wet"
- Tooltip on metering mode: "Toggle between input, output, and reduction meters"
- Help icon in plugin header linking to documentation

### Video Tutorials
1. "Opening and Using Mastering Plugins" (2 min)
2. "A/B Comparison: Reference Tracks vs Dry/Wet" (3 min)
3. "Understanding Real-Time Metering Modes" (2 min)
4. "Mobile Plugin Workflow" (2 min)

### Written Documentation
- Plugin reference guide (parameter ranges, use cases)
- Signal flow diagram
- Best practices for mastering workflow
- Troubleshooting common issues

---

## 19. Future Enhancements (Post-MVP)

### Version 2.0 Features
- Plugin preset system (save/recall per plugin)
- Drag-and-drop plugin reordering
- Parallel processing chains
- Mid-side EQ mode
- Spectrum analyzer overlay in plugins
- Plugin automation recording
- Keyboard shortcuts for all plugins
- Plugin comparison mode (compare two plugin settings)

### Advanced Features
- Custom plugin development SDK
- Cloud preset sharing
- Collaborative mastering sessions
- AI-suggested plugin parameters
- Batch processing with plugin chains
- Stem mastering (multi-track plugin instances)

---

## Appendix A: Plugin Parameter Specifications

### EQ Plugin (Baxandall)
```typescript
interface BaxandallEQParams {
  bassGain: number;      // -12.0 to +12.0 dB, step 0.1, default 0.0
  bassFreq: number;      // 20 to 500 Hz, step 1, default 100
  trebleGain: number;    // -12.0 to +12.0 dB, step 0.1, default 0.0
  trebleFreq: number;    // 1000 to 20000 Hz, step 10, default 10000
  bypassed: boolean;     // default false
}
```

### Limiter Plugin (Oxford-Style)
```typescript
interface OxfordLimiterParams {
  threshold: number;     // -20.0 to 0.0 dB, step 0.1, default -0.3
  release: number;       // 10 to 1000 ms, step 1, default 100
  ceiling: number;       // Fixed at -0.1 dBTP (display only)
  bypassed: boolean;     // default false
}
```

### Stereo Plugin
```typescript
interface StereoWidthParams {
  width: number;         // 0 to 200%, step 1, default 100
  bypassed: boolean;     // default false
}
```

### Tape Plugin
```typescript
interface TapeSaturationParams {
  drive: number;         // 0 to 100%, step 1, default 0
  bypassed: boolean;     // default false
}
```

### Input Plugin
```typescript
interface InputGainParams {
  gain: number;          // -12.0 to +12.0 dB, step 0.1, default 0.0
  bypassed: boolean;     // default false
}
```

### Output Plugin
```typescript
interface OutputGainParams {
  gain: number;          // -12.0 to +12.0 dB, step 0.1, default 0.0
  bypassed: boolean;     // default false
}
```

---

## Appendix B: A/B Comparison Specifications

```typescript
interface ABComparisonState {
  // Files
  songAFile: File;              // Primary track (from main upload)
  songBFile: File | null;       // Reference track or null for dry/wet mode

  // Mode
  abMode: 'reference' | 'dry-wet';

  // Trim controls
  songATrim: number;            // -12.0 to +12.0 dB, default 0.0
  songBTrim: number;            // -12.0 to +12.0 dB, default 0.0

  // Crossfade
  crossfade: number;            // 0 to 100%, default 0 (Song A)

  // Active song
  activeSong: 'A' | 'B';        // default 'A'

  // Actions
  loadReferenceTrack: (file: File) => Promise<void>;
  setABMode: (mode: 'reference' | 'dry-wet') => void;
  setSongATrim: (gain: number) => void;
  setSongBTrim: (gain: number) => void;
  setCrossfade: (value: number) => void;
  toggleActiveSong: () => void;
  quickSwitch: () => void;       // Instant A/B toggle
}
```

---

## Appendix C: Metering Mode Specifications

```typescript
type MeteringMode = 'input' | 'output' | 'reduction';

interface MeteringData {
  // Common
  timestamp: number;

  // Level data
  inputPeakL: number;           // dBFS
  inputPeakR: number;           // dBFS
  inputRmsL: number;            // dBFS
  inputRmsR: number;            // dBFS

  outputPeakL: number;          // dBFS
  outputPeakR: number;          // dBFS
  outputRmsL: number;           // dBFS
  outputRmsR: number;           // dBFS

  // Loudness
  lufsIntegrated: number;       // LUFS
  lufsShortTerm: number;        // LUFS
  lufsMomentary: number;        // LUFS

  // True peak
  truePeakL: number;            // dBTP
  truePeakR: number;            // dBTP

  // Gain reduction
  gainReduction: number;        // dB (0 to -20)

  // Phase
  phaseCorrelation: number;     // -1 to +1

  // Spectrum (optional)
  spectrumData?: Float32Array;
}

// Display logic
function getMeterValue(data: MeteringData, mode: MeteringMode): number {
  switch (mode) {
    case 'input':
      return Math.max(data.inputPeakL, data.inputPeakR);
    case 'output':
      return Math.max(data.outputPeakL, data.outputPeakR);
    case 'reduction':
      return data.gainReduction;
  }
}
```

---

## Appendix D: Wireframes

### Plugin Modal Layout (Desktop)

```
┌──────────────────────────────────────────────────────────────┐
│ ████████████████████ Backdrop (80% black) ████████████████████│
│ ██                                                        ██  │
│ ██  ┌────────────────────────────────────────────────┐  ██  │
│ ██  │ EQ PLUGIN                              [X]     │  ██  │
│ ██  ├────────────────────────────────────────────────┤  ██  │
│ ██  │ ╭──────────────────────────────────────────╮   │  ██  │
│ ██  │ │   Waveform Display (Click to Seek)      │   │  ██  │
│ ██  │ ╰──────────────────────────────────────────╯   │  ██  │
│ ██  │ [▶] [❚❚] [■]  0:45 / 3:24                    │  ██  │
│ ██  ├────────────────────────────────────────────────┤  ██  │
│ ██  │                                                │  ██  │
│ ██  │    ╭───╮        ╭───╮        ╭───╮     ╭───╮  │  ██  │
│ ██  │    │ ⚙ │        │ ⚙ │        │ ⚙ │     │ ⚙ │  │  ██  │
│ ██  │    ╰───╯        ╰───╯        ╰───╯     ╰───╯  │  ██  │
│ ██  │   BASS GAIN   BASS FREQ   TREBLE     TREBLE   │  ██  │
│ ██  │                             GAIN       FREQ    │  ██  │
│ ██  │    +2.5 dB      100 Hz     -1.0 dB   10 kHz   │  ██  │
│ ██  │                                                │  ██  │
│ ██  ├────────────────────────────────────────────────┤  ██  │
│ ██  │ [BYPASS] [RESET] [A/B]              VU METER  │  ██  │
│ ██  └────────────────────────────────────────────────┘  ██  │
│ ██                                                        ██  │
│ ████████████████████████████████████████████████████████████│
└──────────────────────────────────────────────────────────────┘
```

### Plugin Modal Layout (Mobile)

```
┌────────────────────┐
│ LIMITER     [X]    │
├────────────────────┤
│ ╭────────────────╮ │
│ │ Waveform       │ │
│ ╰────────────────╯ │
│ [▶] [❚❚] 1:23     │
├────────────────────┤
│                    │
│      ╭────╮        │
│      │ ⚙  │        │
│      ╰────╯        │
│    THRESHOLD       │
│     -2.5 dB        │
│                    │
│      ╭────╮        │
│      │ ⚙  │        │
│      ╰────╯        │
│     RELEASE        │
│      150 ms        │
│                    │
│  ┌─────────────┐   │
│  │ GAIN RED    │   │
│  │  ▐█▌        │   │
│  │ -3.2 dB     │   │
│  └─────────────┘   │
│                    │
├────────────────────┤
│ [BYPASS] [RESET]   │
└────────────────────┘
```

### A/B Comparison Section

```
┌──────────────────────────────────────┐
│  A/B COMPARISON                      │
├──────────────────────────────────────┤
│                                      │
│  Mode: [Reference] [Dry/Wet]         │
│                                      │
│  ╭───╮              ╭───╮            │
│  │ ⚙ │              │ ⚙ │            │
│  ╰───╯              ╰───╯            │
│ SONG A TRIM      SONG B TRIM         │
│   0.0 dB           -1.5 dB           │
│                                      │
│  Crossfade: [━━━━━▓▓▓▓▓▓▓]          │
│             A ←─────────→ B          │
│                                      │
│  Active: [●A] [○B]  [⇄ QUICK SWAP]  │
│                                      │
│  🔊 SONG A  -14.2 LUFS               │
│  🔊 SONG B  -14.0 LUFS               │
│                                      │
└──────────────────────────────────────┘
```

---

## Sign-Off

**Product Owner**: ___________________ Date: _______________

**Tech Lead**: ___________________ Date: _______________

**Design Lead**: ___________________ Date: _______________

**UX Lead**: ___________________ Date: _______________

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-01 | Product Team | Initial PRD based on user requirements |

---

**END OF DOCUMENT**
