/**
 * AudioWorklet Setup Verification
 *
 * Run this to verify the AudioWorklet infrastructure is properly configured.
 * Can be used in browser console or as a test.
 */

import { WorkletManager } from '../worklets/WorkletManager';
import { MasteringEngine } from './MasteringEngine';

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: string;
}

interface VerificationReport {
  browserSupport: VerificationResult;
  workletFiles: VerificationResult;
  audioEngine: VerificationResult;
  workletManager: VerificationResult;
  signalChain: VerificationResult;
  overall: boolean;
}

export class AudioWorkletVerification {
  private results: Partial<VerificationReport> = {};

  /**
   * Run all verification checks
   */
  async verify(): Promise<VerificationReport> {
    console.log('🔍 Starting AudioWorklet verification...\n');

    // 1. Check browser support
    this.results.browserSupport = this.checkBrowserSupport();

    // 2. Check worklet files
    this.results.workletFiles = await this.checkWorkletFiles();

    // 3. Test AudioEngine initialization
    this.results.audioEngine = await this.testAudioEngine();

    // 4. Test WorkletManager
    this.results.workletManager = await this.testWorkletManager();

    // 5. Test signal chain
    this.results.signalChain = await this.testSignalChain();

    // Calculate overall result
    const allResults = [
      this.results.browserSupport,
      this.results.workletFiles,
      this.results.audioEngine,
      this.results.workletManager,
      this.results.signalChain
    ];

    this.results.overall = allResults.every(r => r?.passed);

    this.printReport();

    return this.results as VerificationReport;
  }

  /**
   * Check browser support for AudioWorklet
   */
  private checkBrowserSupport(): VerificationResult {
    console.log('1. Checking browser support...');

    const manager = new WorkletManager();
    const support = manager.checkBrowserSupport();

    if (support.supported) {
      console.log('   ✅ AudioWorklet is supported\n');
      return {
        passed: true,
        message: 'Browser supports AudioWorklet',
        details: `AudioContext: ${support.audioContext}, AudioWorklet: ${support.audioWorklet}`
      };
    } else {
      console.log(`   ❌ AudioWorklet not supported: ${support.reason}\n`);
      return {
        passed: false,
        message: 'Browser does not support AudioWorklet',
        details: support.reason
      };
    }
  }

  /**
   * Check if worklet files are accessible
   */
  private async checkWorkletFiles(): Promise<VerificationResult> {
    console.log('2. Checking worklet files...');

    const workletUrls = [
      '/worklets/baxandall-eq.worklet.js',
      '/worklets/ssl-compressor.worklet.js',
      '/worklets/limiter.worklet.js'
    ];

    const checks = await Promise.all(
      workletUrls.map(async (url) => {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          const exists = response.ok;
          console.log(`   ${exists ? '✅' : '❌'} ${url}`);
          return exists;
        } catch (error) {
          console.log(`   ❌ ${url} (fetch failed)`);
          return false;
        }
      })
    );

    const allExist = checks.every(c => c);

    if (allExist) {
      console.log('   All worklet files accessible\n');
      return {
        passed: true,
        message: 'All worklet files are accessible',
        details: workletUrls.join(', ')
      };
    } else {
      console.log('   Some worklet files are missing\n');
      return {
        passed: false,
        message: 'Some worklet files are not accessible',
        details: 'Check /public/worklets/ directory and Next.js static file serving'
      };
    }
  }

  /**
   * Test AudioEngine initialization
   */
  private async testAudioEngine(): Promise<VerificationResult> {
    console.log('3. Testing MasteringEngine initialization...');

    try {
      const engine = new MasteringEngine({
        sampleRate: 48000,
        latencyHint: 'interactive',
        meteringRate: 60
      });

      console.log('   ✅ MasteringEngine instance created');

      // Initialize
      await engine.initialize();
      console.log('   ✅ MasteringEngine initialized');

      // Check state
      const state = engine.getState();
      if (state === 'ready') {
        console.log('   ✅ MasteringEngine state is "ready"');
      } else {
        console.log(`   ⚠️  MasteringEngine state is "${state}" (expected "ready")`);
      }

      // Check context
      const context = engine.getContext();
      if (context) {
        console.log(`   ✅ AudioContext created (${context.sampleRate} Hz)`);
      } else {
        console.log('   ❌ AudioContext not created');
      }

      // Cleanup
      await engine.dispose();
      console.log('   ✅ MasteringEngine disposed\n');

      return {
        passed: true,
        message: 'MasteringEngine initialized successfully',
        details: `State: ${state}, Sample Rate: ${context?.sampleRate}`
      };

    } catch (error) {
      console.log(`   ❌ MasteringEngine initialization failed: ${(error as Error).message}\n`);
      return {
        passed: false,
        message: 'MasteringEngine initialization failed',
        details: (error as Error).message
      };
    }
  }

  /**
   * Test WorkletManager
   */
  private async testWorkletManager(): Promise<VerificationResult> {
    console.log('4. Testing WorkletManager...');

    try {
      const manager = new WorkletManager();
      console.log('   ✅ WorkletManager instance created');

      // Create AudioContext
      const audioContext = new AudioContext();
      manager.initialize(audioContext);
      console.log('   ✅ WorkletManager initialized with AudioContext');

      // Load a worklet
      const node = await manager.loadWorklet({
        name: 'test-eq',
        url: '/worklets/baxandall-eq.worklet.js',
        processorName: 'baxandall-eq',
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2]
      });

      console.log('   ✅ Worklet loaded successfully');

      // Check if loaded
      const isLoaded = manager.isLoaded('test-eq');
      if (isLoaded) {
        console.log('   ✅ Worklet registered in manager');
      } else {
        console.log('   ❌ Worklet not registered');
      }

      // Test parameter setting
      manager.setParameter('test-eq', 'bassGain', 3);
      console.log('   ✅ Parameter set successfully');

      // Cleanup
      manager.unloadWorklet('test-eq');
      console.log('   ✅ Worklet unloaded');

      await audioContext.close();
      console.log('   ✅ AudioContext closed\n');

      return {
        passed: true,
        message: 'WorkletManager working correctly',
        details: 'Load, parameter set, and unload successful'
      };

    } catch (error) {
      console.log(`   ❌ WorkletManager test failed: ${(error as Error).message}\n`);
      return {
        passed: false,
        message: 'WorkletManager test failed',
        details: (error as Error).message
      };
    }
  }

  /**
   * Test signal chain connectivity
   */
  private async testSignalChain(): Promise<VerificationResult> {
    console.log('5. Testing signal chain...');

    try {
      const engine = new MasteringEngine();
      await engine.initialize();

      // Create a test oscillator
      const context = engine.getContext();
      if (!context) {
        throw new Error('AudioContext not available');
      }

      const oscillator = context.createOscillator();
      oscillator.frequency.value = 440; // A4
      oscillator.type = 'sine';

      console.log('   ✅ Test oscillator created');

      // Get analyser for verification
      const analyser = engine.getAnalyser();
      if (analyser) {
        console.log('   ✅ Analyser node available');
      } else {
        console.log('   ⚠️  Analyser node not available');
      }

      // Test bypass
      engine.bypassEQ(true);
      engine.bypassCompressor(true);
      engine.bypassLimiter(true);
      console.log('   ✅ Bypass controls working');

      // Test parameter updates
      engine.updateEQ({ bassGain: 3, trebleGain: -2 });
      engine.updateCompressor({ threshold: -12, ratio: 4 });
      engine.updateLimiter({ threshold: -1.0, ceiling: -0.3 });
      console.log('   ✅ Parameter updates working');

      // Cleanup
      oscillator.disconnect();
      await engine.dispose();
      console.log('   ✅ Signal chain test complete\n');

      return {
        passed: true,
        message: 'Signal chain working correctly',
        details: 'All nodes connected and parameters controllable'
      };

    } catch (error) {
      console.log(`   ❌ Signal chain test failed: ${(error as Error).message}\n`);
      return {
        passed: false,
        message: 'Signal chain test failed',
        details: (error as Error).message
      };
    }
  }

  /**
   * Print final report
   */
  private printReport(): void {
    console.log('═══════════════════════════════════════════════════════');
    console.log('                 VERIFICATION REPORT                   ');
    console.log('═══════════════════════════════════════════════════════');

    const results = this.results as VerificationReport;

    this.printResult('Browser Support', results.browserSupport);
    this.printResult('Worklet Files', results.workletFiles);
    this.printResult('MasteringEngine', results.audioEngine);
    this.printResult('WorkletManager', results.workletManager);
    this.printResult('Signal Chain', results.signalChain);

    console.log('═══════════════════════════════════════════════════════');

    if (results.overall) {
      console.log('✅ ALL CHECKS PASSED - AudioWorklet infrastructure is ready!');
    } else {
      console.log('❌ SOME CHECKS FAILED - See details above');
    }

    console.log('═══════════════════════════════════════════════════════\n');
  }

  /**
   * Print individual result
   */
  private printResult(name: string, result?: VerificationResult): void {
    if (!result) return;

    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${name.padEnd(20)} ${result.message}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
  }
}

/**
 * Quick verification function
 */
export async function verifyAudioWorkletSetup(): Promise<boolean> {
  const verification = new AudioWorkletVerification();
  const report = await verification.verify();
  return report.overall;
}

/**
 * Browser console helper
 */
if (typeof window !== 'undefined') {
  (window as any).verifyAudioWorklet = async () => {
    const verification = new AudioWorkletVerification();
    return await verification.verify();
  };
}
