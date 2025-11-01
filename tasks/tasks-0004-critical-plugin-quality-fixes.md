## Relevant Files

- `src/components/mastering/RotaryKnob.tsx` - Core knob component with broken input handling and inverted value mapping
- `src/lib/types/plugin.types.ts` - Contains knobToParam/paramToKnob conversion functions that are inverting values incorrectly
- `src/components/mastering/plugins/*.tsx` - All plugin components using the broken knob controls
- `src/lib/audio/MasteringEngine.ts` - Audio processing engine with broken effects that cause distortion
- `src/lib/audio/BaseAudioEngine.ts` - Base audio engine that may have incorrect gain staging
- `src/store/audioStore.ts` - State management that connects UI to audio processing
- `tests/knob-value-conversion.test.ts` - Unit tests for value conversion (to be created)
- `tests/audio-processing-quality.test.ts` - Unit tests for audio quality (to be created)

### Notes

- Priority #1: Fix the knob value mapping so typing makes sense (0 should be 0, 100 should be 100)
- Priority #2: Fix audio processing so effects actually improve sound instead of distorting it
- The current implementation requires typing "50" to get 0, and "100" to get 50% - completely backwards
- Audio effects are causing distortion instead of enhancing the sound
- Use `npm run dev` to test changes in real-time
- Focus on making this a professional-grade mastering suite

## Tasks

- [ ] 1.0 Fix Rotary Knob Value System
  - [ ] 1.1 Fix the inverted drag behavior in RotaryKnob.tsx - currently dragging up decreases value, should increase
  - [ ] 1.2 Fix the sensitivity multiplier (currently 3x too sensitive) - reduce from 3 to 1 or make it configurable
  - [ ] 1.3 Fix the direct value input handling - when user types a value, it should map directly (0=0, 50=50, 100=100)
  - [ ] 1.4 Remove the confusing value mapping in handleEditSubmit that clamps to 0-100 instead of using actual min/max
  - [ ] 1.5 Implement proper min/max/step support for different parameter ranges (dB, Hz, %, ms)
  - [ ] 1.6 Add visual feedback showing the actual parameter value (not the 0-100 knob position)
  - [ ] 1.7 Implement shift-drag for fine control and alt-drag for ultra-fine control
  - [ ] 1.8 Add double-click to reset to default value (not just open edit mode)

- [ ] 2.0 Fix Parameter Conversion Logic
  - [ ] 2.1 Review and fix knobToParam function in plugin.types.ts - ensure linear mapping is correct
  - [ ] 2.2 Review and fix paramToKnob function - ensure it's the exact inverse of knobToParam
  - [ ] 2.3 Create specialized conversion functions for different units (dB, Hz, percentage, milliseconds)
  - [ ] 2.4 Implement logarithmic scaling for frequency parameters (20Hz-20kHz should feel linear to use)
  - [ ] 2.5 Implement proper dB scaling (-∞ to +12dB with appropriate curve)
  - [ ] 2.6 Add unit tests for all conversion functions with edge cases
  - [ ] 2.7 Update all plugin components to use the corrected conversion functions
  - [ ] 2.8 Add console logging temporarily to debug actual vs expected values

- [ ] 3.0 Fix Audio Processing Quality
  - [ ] 3.1 Audit MasteringEngine.ts updateEQ method - check filter coefficients and gain calculations
  - [ ] 3.2 Fix the limiter implementation - current implementation likely has incorrect threshold/ratio calculations
  - [ ] 3.3 Fix tape saturation algorithm - should add warmth, not distortion
  - [ ] 3.4 Fix stereo width processing - ensure proper M/S encoding/decoding
  - [ ] 3.5 Implement proper anti-aliasing for any non-linear processing (tape saturation)
  - [ ] 3.6 Add input/output gain compensation to maintain consistent levels
  - [ ] 3.7 Fix the order of operations in the processing chain (currently may be causing cumulative distortion)
  - [ ] 3.8 Implement bypass functionality that actually bypasses processing (not just mutes)

- [ ] 4.0 Implement Proper Gain Staging
  - [ ] 4.1 Audit BaseAudioEngine.ts for gain structure issues
  - [ ] 4.2 Implement proper headroom management (-18dBFS nominal, -6dBFS peak)
  - [ ] 4.3 Add automatic gain compensation for each effect to maintain unity gain
  - [ ] 4.4 Fix the output stage - currently distorting when gain > 0dB
  - [ ] 4.5 Implement true peak limiting to prevent inter-sample peaks
  - [ ] 4.6 Add metering at each stage of the signal chain for debugging
  - [ ] 4.7 Implement soft clipping instead of hard clipping at 0dBFS
  - [ ] 4.8 Add a master output limiter as a safety net (invisible to user, just prevents damage)

- [ ] 5.0 Testing and Validation
  - [ ] 5.1 Create unit tests for all knob value conversions
  - [ ] 5.2 Create integration tests for parameter updates from UI to audio engine
  - [ ] 5.3 Implement A/B testing with reference tracks to validate audio quality
  - [ ] 5.4 Test with various audio sources (sine waves, pink noise, music) to identify issues
  - [ ] 5.5 Add performance profiling to ensure no audio dropouts during parameter changes
  - [ ] 5.6 Test on different devices and browsers for consistency
  - [ ] 5.7 Create automated regression tests for audio quality metrics (THD, frequency response)
  - [ ] 5.8 Manual testing checklist for professional audio engineer validation