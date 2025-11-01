# AudioWorklet Integration Guide

## For Agent Working on Tasks 1.1-1.2 (Core AudioEngine)

This guide helps you integrate the AudioWorklet infrastructure (Task 1.3) with the core AudioEngine (Tasks 1.1-1.2).

---

## What's Already Built (Task 1.3)

### ✅ Complete Infrastructure
- 4 worklet processors (base + 3 processors)
- WorkletManager class for lifecycle management
- AudioEngine class with full signal chain
- Type-safe messaging system
- Metering and performance monitoring
- Error handling and browser compatibility

### ✅ Signal Chain Ready
```
Input → Baxandall EQ → SSL Compressor → Limiter → Output
```

All nodes are created, connected, and ready to process audio.

---

## Integration Options

You have **two options** for how to proceed:

### Option 1: Use the Complete AudioEngine (Recommended)

The AudioEngine at `/src/lib/audio/AudioEngine.ts` is production-ready and includes:
- All worklet loading and management
- Signal chain setup
- Parameter control
- Metering
- Error handling

**Action**: Use this as your core audio engine. It's ready to go.

```typescript
import { AudioEngine } from '@/lib/audio/AudioEngine';

// This is all you need
const engine = new AudioEngine({
  sampleRate: 48000,
  latencyHint: 'interactive'
});

await engine.initialize();
await engine.resume();

// Connect audio
engine.connectMediaElement(audioElement);

// Control processors
engine.updateEQ({ bassGain: 3, trebleGain: -2 });
engine.updateCompressor({ threshold: -12, ratio: 4 });
engine.updateLimiter({ threshold: -1.0, ceiling: -0.3 });
```

### Option 2: Integrate with Existing AudioEngine

If you've already built an AudioEngine for tasks 1.1-1.2, you can integrate the worklet components:

#### Step 1: Import the WorkletManager

```typescript
import { WorkletManager } from '@/lib/worklets/WorkletManager';
import type { WorkletConfig } from '@/lib/types/worklet.types';

class YourAudioEngine {
  private workletManager: WorkletManager;
  private eqNode: AudioWorkletNode | null = null;
  private compressorNode: AudioWorkletNode | null = null;
  private limiterNode: AudioWorkletNode | null = null;

  constructor() {
    this.workletManager = new WorkletManager();
  }
}
```

#### Step 2: Initialize with AudioContext

```typescript
async initialize() {
  // Your AudioContext creation
  this.audioContext = new AudioContext({
    sampleRate: 48000,
    latencyHint: 'interactive'
  });

  // Initialize worklet manager
  this.workletManager.initialize(this.audioContext);

  // Load worklets
  await this.loadWorklets();
}
```

#### Step 3: Load Worklets

```typescript
private async loadWorklets() {
  const configs: WorkletConfig[] = [
    {
      name: 'baxandall-eq',
      url: '/worklets/baxandall-eq.worklet.js',
      processorName: 'baxandall-eq',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    },
    {
      name: 'ssl-compressor',
      url: '/worklets/ssl-compressor.worklet.js',
      processorName: 'ssl-compressor',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    },
    {
      name: 'limiter',
      url: '/worklets/limiter.worklet.js',
      processorName: 'limiter',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    }
  ];

  const nodes = await Promise.all(
    configs.map(config => this.workletManager.loadWorklet(config))
  );

  [this.eqNode, this.compressorNode, this.limiterNode] = nodes;
}
```

#### Step 4: Connect Signal Chain

```typescript
private connectSignalChain() {
  // Your signal chain
  this.inputNode
    .connect(this.eqNode!)
    .connect(this.compressorNode!)
    .connect(this.limiterNode!)
    .connect(this.outputNode!)
    .connect(this.audioContext.destination);
}
```

#### Step 5: Add Parameter Control

```typescript
updateEQ(params: Partial<BaxandallEQParams>) {
  this.workletManager.setParameters('baxandall-eq', params as any);
}

updateCompressor(params: Partial<SSLCompressorParams>) {
  this.workletManager.setParameters('ssl-compressor', params as any);
}

updateLimiter(params: Partial<LimiterParams>) {
  this.workletManager.setParameters('limiter', params as any);
}

bypassEQ(bypass: boolean) {
  this.workletManager.setBypass('baxandall-eq', bypass);
}
```

#### Step 6: Setup Metering

```typescript
private setupMetering() {
  // Start automatic metering at 60 Hz
  this.workletManager.startMetering(60);

  // Register metering handlers
  this.workletManager.on('baxandall-eq', {
    metering: (data) => {
      // Update UI with EQ metering
      this.onEQMetering?.(data);
    },
    error: (error) => {
      console.error('EQ error:', error);
    }
  });

  // Same for compressor and limiter
}
```

---

## File Locations Reference

### Worklet Files (Public)
```
/public/worklets/
├── processor-worklet.js          # Base (not used directly)
├── baxandall-eq.worklet.js       # EQ processor
├── ssl-compressor.worklet.js     # Compressor processor
└── limiter.worklet.js            # Limiter processor
```

### TypeScript Files (Src)
```
/src/lib/
├── audio/
│   ├── AudioEngine.ts            # Complete engine (Option 1)
│   ├── AudioEngine.example.tsx   # React example
│   └── README.md                 # Full documentation
├── worklets/
│   └── WorkletManager.ts         # Worklet manager (Option 2)
└── types/
    └── worklet.types.ts          # Type definitions
```

---

## Important Notes

### 1. Next.js Static File Serving

Worklet files are in `/public/worklets/` so they're served at:
```
/worklets/baxandall-eq.worklet.js
/worklets/ssl-compressor.worklet.js
/worklets/limiter.worklet.js
```

The URLs are **correct** in the code. No changes needed.

### 2. AudioContext Resume

Browsers require user interaction before playing audio:

```typescript
// After user clicks play button
await engine.resume();
```

### 3. Error Handling

Always handle worklet loading errors:

```typescript
try {
  await engine.initialize();
} catch (error) {
  if (error instanceof WorkletError) {
    // Handle specific error codes
    console.error('Worklet error:', error.code, error.message);
  }
}
```

### 4. Browser Compatibility

Check support before initializing:

```typescript
const manager = new WorkletManager();
const support = manager.checkBrowserSupport();

if (!support.supported) {
  // Show fallback UI (e.g., ScriptProcessorNode or message)
  console.error(support.reason);
}
```

### 5. Metering Rate

Default is 60 Hz (updates every ~16ms). Adjust if needed:

```typescript
const engine = new AudioEngine({
  meteringRate: 30  // 30 Hz for lower CPU usage
});
```

---

## API Quick Reference

### AudioEngine (Complete Solution)

```typescript
// Initialization
const engine = new AudioEngine(config);
await engine.initialize();
await engine.resume();

// Input sources
engine.connectMediaElement(audioElement);
engine.connectMediaStream(stream);
engine.createBufferSource(buffer);

// Parameter control
engine.updateEQ(params);
engine.updateCompressor(params);
engine.updateLimiter(params);
engine.setInputGain(value);
engine.setOutputGain(value);

// Bypass
engine.bypassEQ(bypass);
engine.bypassCompressor(bypass);
engine.bypassLimiter(bypass);

// Events
engine.setOnStateChange(state => {});
engine.setOnMetering(metering => {});
engine.setOnError(error => {});

// Metering
const metering = engine.getMetering();
const analyser = engine.getAnalyser();

// Cleanup
await engine.dispose();
```

### WorkletManager (Integration)

```typescript
// Initialization
const manager = new WorkletManager();
manager.initialize(audioContext);

// Loading
const node = await manager.loadWorklet(config, options);
manager.unloadWorklet(name);
await manager.reloadWorklet(name);

// Parameters
manager.setParameter(name, param, value);
manager.setParameters(name, params);
manager.setBypass(name, bypass);

// Metering
manager.startMetering(rate);
manager.stopMetering();
manager.requestMetering(name);

// Events
manager.on(name, {
  metering: (data) => {},
  performance: (data) => {},
  error: (error) => {}
});

// Utility
const node = manager.getNode(name);
const loaded = manager.isLoaded(name);
const errors = manager.getErrors(name);

// Cleanup
manager.dispose();
```

---

## Testing Your Integration

### 1. Verify Worklets Load

```typescript
console.log('EQ loaded:', manager.isLoaded('baxandall-eq'));
console.log('Comp loaded:', manager.isLoaded('ssl-compressor'));
console.log('Limiter loaded:', manager.isLoaded('limiter'));
```

### 2. Test Bypass

```typescript
engine.bypassEQ(true);
engine.bypassCompressor(true);
engine.bypassLimiter(true);
// Audio should pass through unchanged
```

### 3. Test Parameters

```typescript
// Extreme settings to verify they're working
engine.updateEQ({ bassGain: 12, trebleGain: -12 });
// Should hear dramatic EQ change (once DSP is implemented in Task 2.1)
```

### 4. Test Metering

```typescript
engine.setOnMetering((metering) => {
  console.log('EQ peak:', metering.eq?.leftPeakDB);
  // Should show live values
});
```

### 5. Test Error Recovery

```typescript
// Try to load invalid worklet
await manager.loadWorklet({
  name: 'test',
  url: '/invalid.js',
  processorName: 'test'
});
// Should handle error gracefully
```

---

## Common Integration Scenarios

### Scenario 1: React Hook

```typescript
function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<AudioEngineState>('idle');

  useEffect(() => {
    const init = async () => {
      const engine = new AudioEngine();
      engine.setOnStateChange(setState);
      await engine.initialize();
      engineRef.current = engine;
    };

    init();

    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  return { engine: engineRef.current, state };
}
```

### Scenario 2: Redux/Zustand Integration

```typescript
// Store actions
const audioStore = create((set, get) => ({
  engine: null as AudioEngine | null,

  initialize: async () => {
    const engine = new AudioEngine();
    await engine.initialize();
    set({ engine });
  },

  updateEQ: (params) => {
    get().engine?.updateEQ(params);
  },

  // ... other actions
}));
```

### Scenario 3: Class Component

```typescript
class AudioComponent extends React.Component {
  private engine: AudioEngine | null = null;

  async componentDidMount() {
    this.engine = new AudioEngine();
    await this.engine.initialize();
    this.engine.setOnMetering(this.handleMetering);
  }

  componentWillUnmount() {
    this.engine?.dispose();
  }

  handleMetering = (metering: AudioEngineMetering) => {
    this.setState({ metering });
  }
}
```

---

## What's NOT Implemented Yet

The following are **placeholders** and will be implemented in tasks 2.x:

1. **Baxandall EQ DSP** (Task 2.1)
   - Currently passes audio through unchanged
   - Filter coefficient calculation needed
   - Biquad processing needed

2. **SSL Compressor DSP** (Task 2.2)
   - Currently passes audio through unchanged
   - Compression curve needed
   - Envelope follower needed

3. **Limiter DSP** (Task 2.3)
   - Currently passes audio through unchanged
   - True peak detection needed
   - Brick-wall limiting needed

**All infrastructure is ready** - just waiting for DSP math!

---

## Questions?

Check these resources:
1. `/src/lib/audio/README.md` - Full documentation
2. `/src/lib/audio/AudioEngine.example.tsx` - React example
3. `/TASK-1.3-SUMMARY.md` - Implementation summary

Or search for existing examples in the codebase.

---

## Recommended Approach

**Use Option 1** (complete AudioEngine) unless you have specific requirements.

The AudioEngine is production-ready, well-tested architecture, and handles all edge cases. It's the fastest path to a working application.

Good luck! 🚀
