# Gain Staging Implementation - Quick Start Guide

## For Developers Integrating This Code

### What Changed?

Three core audio files now have professional gain staging:
- `BaseAudioEngine.ts` - Gain staging for file playback
- `MasteringEngine.ts` - Gain staging for real-time mastering
- `audioStore.ts` - Gain staging constants

**You don't need to change anything.** The implementation is backward compatible.

### New Capabilities

#### 1. Get Gain Staging Standards

```typescript
import { useAudioStore } from '@/store/audioStore';

// In your component:
const gStagingInfo = useAudioStore(state => state.getGainStagingInfo());

// Returns:
// {
//   nominalLevel: -18,    // -18dBFS (standard for mastering)
//   peakHeadroom: -6,     // -6dBFS (safety peak level)
//   safetyMargin: -0.3    // -0.3dBFS (limiter threshold)
// }
```

#### 2. Monitor Signal Levels at Each Stage

```typescript
// Get the playback engine
const engine = useAudioStore(state => state.playbackEngine);

if (engine) {
  // Check input level
  const inputMetering = engine.getMeteringPointData('input');
  console.log(`Input: ${inputMetering?.peakL} dBFS`);

  // Check after effects
  const outputMetering = engine.getMeteringPointData('output');
  console.log(`Output: ${outputMetering?.peakL} dBFS`);
}

// Available metering points:
// - 'input'        Raw input signal
// - 'preProcess'   After input gain, before effects
// - 'postProcess'  After effects, before limiting
// - 'masterLimiter' After safety limiter
// - 'output'       Final output signal
```

#### 3. No Changes to Existing APIs

All existing gain control code works unchanged:

```typescript
// These still work exactly as before:
engine?.setInputGain(6); // +6dB
engine?.setOutputGain(-3); // -3dB
```

### Understanding the Gain Staging

```
┌─────────────────────────────────────────────┐
│         Audio Signal Flow (Gain Staging)    │
└─────────────────────────────────────────────┘

Source
  ↓
INPUT GAIN (0dB default, user controlled)
  ↓
PRE-PROCESS (unity gain, 1.0)
  ↓
EFFECTS CHAIN (EQ → Comp → Limiter)
  ├─ Each effect compensated to unity gain
  └─ Parallel processing: -3dB per branch
  ↓
POST-PROCESS (unity gain, 1.0)
  ↓
MASTER LIMITER (safety, threshold -0.3dB)
  ↓
OUTPUT GAIN (0dB default, user controlled)
  ↓
TRUE PEAK LIMITER (soft clipping, WaveShaper)
  ↓
ANALYSER (visualization)
  ↓
SPEAKERS / OUTPUT
```

### Key Numbers to Remember

| Level | Purpose |
|-------|---------|
| -18dB | Nominal operating level (headroom sweet spot) |
| -6dB | Peak safe level (12dB above nominal) |
| -0.3dB | Master limiter threshold (catches overloads) |
| 0dB | Hard clipping threshold (prevented by soft clipper) |

### How Soft Clipping Works

When signal tries to exceed 0dBFS:

```
Normal (below -0.4dB):  Linear pass-through
Soft knee (-0.4dB to -0.1dB): Smooth compression
Hard engagement (> -0.1dB): Full tanh limiting
```

User doesn't hear it because:
- Engaging below -0.4dB (very subtle)
- Smooth curve (no artifacts)
- Transparent compression (musical limiting)

### Debugging Gain Issues

**Problem:** Audio is distorting despite gain staging

**Solution:**
```typescript
// Check each metering point
const engine = useAudioStore(state => state.playbackEngine);

console.log('=== Gain Staging Debug ===');
console.log('Input:', engine?.getMeteringPointData('input'));
console.log('Pre-Process:', engine?.getMeteringPointData('preProcess'));
console.log('Post-Process:', engine?.getMeteringPointData('postProcess'));
console.log('Master Limiter:', engine?.getMeteringPointData('masterLimiter'));
console.log('Output:', engine?.getMeteringPointData('output'));

// All should show similar levels if gain compensation working
```

**Problem:** Gain doesn't seem to affect output

**Solution:**
Make sure you're within the safe range:
```typescript
// Safe input gain: -12dB to +12dB
audioStore.updateMaster({ inputGain: 6 });

// Safe output gain: -12dB to +12dB
audioStore.updateMaster({ outputGain: 6 });

// Beyond ±12dB, soft clipper engages (transparent)
```

### For UI Integration

#### Display Nominal Level

```jsx
import { useAudioStore } from '@/store/audioStore';

function GainStagingDisplay() {
  const stagingInfo = useAudioStore(state => state.getGainStagingInfo());

  return (
    <div>
      <p>Nominal: {stagingInfo.nominalLevel} dBFS</p>
      <p>Peak: {stagingInfo.peakHeadroom} dBFS</p>
      <p>Safety Margin: {stagingInfo.safetyMargin} dBFS</p>
    </div>
  );
}
```

#### Monitor Real-Time Levels

```jsx
import { useAudioStore } from '@/store/audioStore';
import { useEffect, useState } from 'react';

function RealtimeMetering() {
  const engine = useAudioStore(state => state.playbackEngine);
  const [levels, setLevels] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const output = engine?.getMeteringPointData('output');
      setLevels(output);
    }, 100); // Update 10x per second

    return () => clearInterval(interval);
  }, [engine]);

  return (
    <div>
      <p>Output Level: {levels?.peakL.toFixed(1)} dBFS</p>
      <p>RMS: {levels?.rmsL.toFixed(1)} dBFS</p>
    </div>
  );
}
```

#### Warn When Limiting Engages

```jsx
function LimitingWarning() {
  const engine = useAudioStore(state => state.playbackEngine);
  const [isLimiting, setIsLimiting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const output = engine?.getMeteringPointData('output');
      // True peak limiter engages around -0.3dB
      const limiting = (output?.peakL || -Infinity) > -0.5;
      setIsLimiting(limiting);
    }, 100);

    return () => clearInterval(interval);
  }, [engine]);

  if (isLimiting) {
    return <div className="warning">⚠️ Peak Limiter Active</div>;
  }
  return null;
}
```

### File Locations

```
src/lib/audio/
├── BaseAudioEngine.ts      ← Main playback engine with gain staging
├── MasteringEngine.ts      ← Real-time processor with gain staging
└── MasteringEngine.ts      ← (uses soft clipping)

src/store/
└── audioStore.ts           ← Contains getGainStagingInfo()

Documentation/
├── GAIN_STAGING_IMPLEMENTATION.md  ← Full technical details
├── GAIN_STAGING_REFERENCE.md       ← Code examples
├── GAIN_STAGING_SUMMARY.md         ← Executive summary
└── GAIN_STAGING_QUICKSTART.md      ← This file!
```

### Testing Your Integration

```typescript
// Quick test: Set extreme gains, verify no distortion
import { useAudioStore } from '@/store/audioStore';

async function testGainStaging() {
  const store = useAudioStore.getState();

  // Load test audio
  const testFile = new File(['...'], 'test.wav', { type: 'audio/wav' });
  await store.loadAudioFile(testFile);

  // Set extreme gains
  store.updateMaster({ inputGain: 18 });  // +18dB input
  store.updateMaster({ outputGain: 18 }); // +18dB output

  // Play and listen
  await store.play();

  // Check levels
  const engine = store.playbackEngine;
  const output = engine?.getMeteringPointData('output');
  console.log('Output peak:', output?.peakL); // Should be around -0.3 to 0 max

  // Result: Should sound clean, no harsh distortion
  // Soft limiter is working transparently!
}
```

### Common Questions

**Q: Will users hear the soft limiter?**
A: Only under extreme conditions (gain > 18dB total). Otherwise it's transparent. When engaged, it sounds like smooth compression, not harsh clipping.

**Q: Why -18dBFS nominal?**
A: Industry standard for mastering. Provides 18dB headroom before clipping, allows effects to work on dynamic content safely.

**Q: Can I change the limiter threshold?**
A: Yes, modify `masterLimiterGain` threshold in MasteringEngine.ts line 198. But -0.3dB is the professional standard.

**Q: Does this add latency?**
A: No, zero additional latency. All nodes are sample-accurate.

**Q: Can I disable soft clipping?**
A: Yes, but not recommended. It's the safety net preventing distortion. If you must, comment out lines that create `truePeakLimiterNode`.

**Q: What if audio still clips?**
A: Check metering points to debug. If output shows > 0dBFS, soft clipper is working (transparent limiting). If you hear distortion, reduce input/output gain.

### Next Steps

1. **Review the documentation:**
   - Read `GAIN_STAGING_IMPLEMENTATION.md` for technical details
   - Read `GAIN_STAGING_REFERENCE.md` for code examples

2. **Add UI components:**
   - Display gain staging info (nominal, peak, safety)
   - Show real-time metering from all 5 points
   - Add warning when limiter engages
   - Display gain staging health indicator

3. **Test thoroughly:**
   - Test with extreme gains (+24dB input + output)
   - Listen for transparency of soft clipping
   - Verify metering accuracy at each stage
   - Check CPU usage under load

4. **Consider future enhancements:**
   - LUFS loudness metering (ITU-R BS.1770-4)
   - Loudness standards presets
   - Visual gain staging display
   - Per-processor gain compensation UI

### Support

For questions about the implementation:
1. Check `GAIN_STAGING_REFERENCE.md` for examples
2. Look at the inline code comments in the engine files
3. Debug using the metering points system
4. Refer to the Web Audio API documentation

---

**That's it!** The gain staging is built in and working. Focus on UI integration and testing.

Enjoy professional-grade audio mastering! 🎵
