# Audio Engine Architecture Decision

**Date:** October 31, 2025
**Status:** DECISION MADE - Keep Separate with Clear Naming
**Reviewer:** Senior Software Architect

## Executive Summary

After analyzing both AudioEngine implementations, I recommend **keeping them separate** but renaming them for clarity. They serve fundamentally different purposes and attempting to consolidate them would create unnecessary complexity and compromise the specialized nature of each.

## Analysis of Both Implementations

### 1. `/src/lib/audioEngine.ts` - Base Audio Engine (951 lines)

**Purpose:** Generic, foundational audio engine for general audio playback and processing.

**Key Features:**
- Basic Web Audio API wrapper
- File loading (WAV, MP3, FLAC, AAC, OGG)
- Audio buffer decoding
- Playback controls (play, pause, stop, seek)
- Generic signal chain management (serial/parallel)
- Basic metering (peak, RMS)
- Professional audio utilities (dBFS, sample rate validation)
- Singleton pattern with `getAudioEngine()`
- Comprehensive state management (12 states)
- Support for 44.1kHz to 192kHz sample rates
- Dynamic processor connection/disconnection

**NOT Included:**
- No AudioWorklet integration
- No specific mastering processors
- No predefined signal chain
- Not opinionated about processing

**Use Cases:**
- Foundation for any audio application
- File playback applications
- Custom signal chain building
- Educational/demo purposes
- Testing audio concepts

**Current Usage:**
- NOT actively imported by any production code
- Only referenced in test file (audioEngine.test.ts)
- Appears to be infrastructure code

---

### 2. `/src/lib/audio/AudioEngine.ts` - Mastering Engine (640 lines)

**Purpose:** Specialized, low-latency mastering chain with AudioWorklet processors.

**Key Features:**
- AudioWorklet-based processing (<10ms latency)
- Fixed mastering chain: Input → EQ → Compressor → Limiter → Output
- WorkletManager integration
- Baxandall EQ processor
- SSL-style compressor
- Brick-wall limiter
- Real-time metering at 60Hz
- Event-driven architecture (state, metering, errors)
- Performance monitoring
- Browser compatibility detection
- Automatic worklet loading with retry logic

**NOT Included:**
- No file loading utilities
- No playback controls
- No sample rate conversion
- Signal chain is fixed (not dynamic)

**Use Cases:**
- Professional mastering application (THIS PROJECT)
- Real-time audio processing
- Low-latency monitoring
- Streaming/live audio
- Production mastering chain

**Current Usage:**
- Referenced in documentation (README.md, AUDIOWORKLET-COMPLETE.md)
- Has example component (AudioEngine.example.tsx)
- Has verification suite (verify-setup.ts)
- **This is the INTENDED engine for the application**

---

## Comparison Matrix

| Feature | Base Engine (`audioEngine.ts`) | Mastering Engine (`AudioEngine.ts`) |
|---------|-------------------------------|-------------------------------------|
| **Primary Purpose** | General audio playback | Mastering processing |
| **Latency** | ~20-50ms (standard nodes) | <10ms (AudioWorklet) |
| **Signal Chain** | Dynamic (add/remove) | Fixed (EQ→Comp→Lim) |
| **File Loading** | ✅ Full support | ❌ No |
| **Playback Controls** | ✅ Play/pause/seek | ❌ No |
| **AudioWorklet** | ❌ No | ✅ Yes |
| **Metering** | Basic (peak/RMS) | Advanced (per-processor) |
| **State Management** | 12 states | 5 states |
| **Error Recovery** | Basic | Advanced with retries |
| **Sample Rate Support** | 44.1-192kHz | 48kHz focused |
| **Dependencies** | Self-contained | Requires WorkletManager |
| **Complexity** | Medium | High |
| **Production Ready** | Yes | Yes |
| **Current Usage** | None (tests only) | Documentation only |

---

## Architectural Decision

### Decision: **Keep Separate with Renamed Identities**

**Rationale:**

1. **Different Abstraction Levels**
   - Base engine: Low-level Web Audio API wrapper
   - Mastering engine: High-level mastering application
   - Mixing these would violate Single Responsibility Principle

2. **Different Performance Characteristics**
   - Base: Standard AudioNode processing (suitable for playback)
   - Mastering: AudioWorklet processing (required for pro audio)
   - Cannot unify without compromising one or the other

3. **Different Extension Patterns**
   - Base: Designed for dynamic processors
   - Mastering: Designed for fixed, optimized chain
   - Consolidation would require complex abstraction

4. **Clear Separation of Concerns**
   - Base handles: file I/O, playback, generic processing
   - Mastering handles: real-time DSP, metering, chain control
   - These are orthogonal concerns

5. **Future Flexibility**
   - May need base engine for file preview
   - May need base engine for export rendering
   - Mastering engine is for live monitoring only
   - Both can coexist in same app

---

## Implementation Plan

### Phase 1: Rename for Clarity

#### Base Engine
**Current:** `/src/lib/audioEngine.ts`
**New:** `/src/lib/audio/BaseAudioEngine.ts`

**Rename Class:**
```typescript
// OLD
export class AudioEngine { ... }

// NEW
export class BaseAudioEngine { ... }
```

**Update Exports:**
```typescript
export { BaseAudioEngine as AudioEngine }; // Backward compat
export default BaseAudioEngine;

// Update singleton functions
export function getBaseAudioEngine(...) { ... }
export function resetBaseAudioEngine() { ... }
```

---

#### Mastering Engine
**Current:** `/src/lib/audio/AudioEngine.ts`
**New:** `/src/lib/audio/MasteringEngine.ts`

**Rename Class:**
```typescript
// OLD
export class AudioEngine { ... }

// NEW
export class MasteringEngine { ... }
```

**Update Interfaces:**
```typescript
// OLD
export interface AudioEngineConfig { ... }
export interface AudioEngineMetering { ... }
export type AudioEngineState = ...

// NEW
export interface MasteringEngineConfig { ... }
export interface MasteringEngineMetering { ... }
export type MasteringEngineState = ...
```

---

### Phase 2: Update Imports

#### Files to Update:
1. `/src/lib/audio/README.md` - Update all code examples
2. `/src/lib/audio/verify-setup.ts` - Update import and usage
3. `/src/lib/audio/AudioEngine.example.tsx` - Rename to `MasteringEngine.example.tsx`
4. `/src/lib/audioEngine.test.ts` - Update import
5. `/AUDIOWORKLET-COMPLETE.md` - Update documentation
6. `/WORKLET-INTEGRATION-GUIDE.md` - Update examples

---

### Phase 3: Create Migration Guide

Create `/src/lib/audio/MIGRATION.md`:

```markdown
# Audio Engine Migration Guide

## For New Code

**Use MasteringEngine for:**
- Real-time mastering processing
- Low-latency monitoring
- Production signal chain
- EQ/Compressor/Limiter processing

**Use BaseAudioEngine for:**
- File playback
- Audio file loading
- Custom signal chains
- Offline rendering
- File preview

## Import Changes

### Mastering Engine
```typescript
// OLD
import { AudioEngine } from '@/lib/audio/AudioEngine';

// NEW
import { MasteringEngine } from '@/lib/audio/MasteringEngine';
```

### Base Engine
```typescript
// OLD
import AudioEngine from '@/lib/audioEngine';

// NEW
import { BaseAudioEngine } from '@/lib/audio/BaseAudioEngine';
```
```

---

### Phase 4: Add Cross-Reference Documentation

Add to both files:

**BaseAudioEngine.ts:**
```typescript
/**
 * @fileoverview Base-level audio engine for file playback and generic processing
 *
 * NOTE: For mastering-specific processing, see MasteringEngine.ts
 *
 * Use BaseAudioEngine for:
 * - Audio file loading and playback
 * - Custom signal chain building
 * - Offline audio rendering
 * - File preview functionality
 *
 * Use MasteringEngine for:
 * - Real-time mastering processing
 * - Low-latency AudioWorklet chain
 * - Production EQ/Compression/Limiting
 */
```

**MasteringEngine.ts:**
```typescript
/**
 * @fileoverview Professional mastering engine with AudioWorklet processors
 *
 * NOTE: For file playback and generic processing, see BaseAudioEngine.ts
 *
 * Use MasteringEngine for:
 * - Real-time mastering processing
 * - Low-latency AudioWorklet chain
 * - Production EQ/Compression/Limiting
 *
 * Use BaseAudioEngine for:
 * - Audio file loading and playback
 * - Custom signal chain building
 * - Offline audio rendering
 */
```

---

## File Structure (After Refactor)

```
src/lib/
├── audio/
│   ├── BaseAudioEngine.ts          # Generic playback engine (renamed)
│   ├── MasteringEngine.ts          # Mastering processing engine (renamed)
│   ├── MasteringEngine.example.tsx # Example usage (renamed)
│   ├── verify-setup.ts             # Verification suite (updated imports)
│   ├── README.md                   # Updated docs
│   └── MIGRATION.md                # Migration guide (new)
├── worklets/
│   └── WorkletManager.ts           # Used by MasteringEngine
├── types/
│   ├── audio.ts                    # Types for BaseAudioEngine
│   └── worklet.types.ts            # Types for MasteringEngine
└── test-utils/
    └── audioTestHelpers.ts         # Shared test utilities
```

---

## Benefits of This Approach

1. **Clear Naming** - Immediately obvious which to use
2. **No Breaking Changes** - Can provide backward-compat exports
3. **Independent Evolution** - Each can evolve separately
4. **Better Documentation** - Purpose is self-evident
5. **Easier Testing** - Can test each independently
6. **Composition Over Consolidation** - Can use both together if needed

---

## Potential Future: Composition Pattern

If we later need both, we can compose:

```typescript
class MasteringApplication {
  private baseEngine: BaseAudioEngine;      // For file I/O
  private masteringEngine: MasteringEngine; // For processing

  async loadAndProcess(file: File) {
    // Load with base engine
    await this.baseEngine.loadAudio(file);
    const buffer = this.baseEngine.getAudioBuffer();

    // Process with mastering engine
    const source = this.masteringEngine.createBufferSource(buffer);
    source.start();
  }
}
```

---

## Rejected Alternative: Consolidation

**Why Not Consolidate?**

1. **Complexity Explosion** - Would need abstraction for worklet vs non-worklet
2. **Performance Compromise** - Either lose worklet benefits or complicate API
3. **API Confusion** - Too many methods, unclear which to use when
4. **Maintenance Burden** - Single class doing too much
5. **Breaking Changes** - Would break all existing documentation
6. **Testing Difficulty** - Harder to test unified behavior

**Example of Problematic Consolidation:**
```typescript
// BAD: Unified engine with confusing API
class AudioEngine {
  // Which mode are we in?
  private useWorklets: boolean;

  // Different methods for different modes
  async initialize(options?: { useWorklets?: boolean }) { ... }

  // Confusing: only works in one mode
  updateEQ(...) { /* Only if useWorklets */ }
  connectProcessor(...) { /* Only if NOT useWorklets */ }

  // Internal complexity
  private getProcessingChain() {
    if (this.useWorklets) {
      return this.workletChain;
    } else {
      return this.nodeChain;
    }
  }
}
```

This creates a "god object" anti-pattern.

---

## Success Metrics

- ✅ TypeScript compiles with no errors
- ✅ All tests pass
- ✅ No imports break
- ✅ Documentation is clear
- ✅ Naming is self-evident
- ✅ Each engine has single, clear purpose

---

## Timeline

1. **Phase 1:** Rename files and classes (30 min)
2. **Phase 2:** Update imports (20 min)
3. **Phase 3:** Create migration guide (15 min)
4. **Phase 4:** Add cross-reference docs (15 min)
5. **Phase 5:** Run typecheck and tests (10 min)

**Total:** ~90 minutes

---

## Conclusion

The two AudioEngine implementations serve different, complementary purposes:

- **BaseAudioEngine**: Foundation for audio I/O and playback
- **MasteringEngine**: Specialized real-time processing chain

Keeping them separate with clear naming preserves the specialized nature of each, maintains flexibility, and avoids the complexity of a unified "god object."

This is the professional choice for a mastering application.
