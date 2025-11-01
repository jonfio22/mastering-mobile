/**
 * @fileoverview Zustand store for centralized audio state management
 * @module store/audioStore
 * @description Manages audio engines, processing parameters, and UI state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { MasteringEngine, MasteringEngineMetering } from '@/lib/audio/MasteringEngine';
import { BaseAudioEngine } from '@/lib/audio/BaseAudioEngine';
import { AIAnalysis } from '@/lib/ai/aiAnalysis';
import type {
  BaxandallEQParams,
  SSLCompressorParams,
  LimiterParams,
  MeteringData,
} from '@/lib/types/worklet.types';
import type { AnalysisResult } from '@/lib/ai/types';

/**
 * Audio playback state
 */
export enum PlaybackState {
  STOPPED = 'stopped',
  PLAYING = 'playing',
  PAUSED = 'paused',
  LOADING = 'loading',
}

/**
 * Loudness target presets
 */
export enum LoudnessTarget {
  STREAMING = -14,  // -14 LUFS for streaming platforms
  CLUB = -9,        // -9 LUFS for club/DJ use
  BROADCAST = -23,  // -23 LUFS for broadcast
  CUSTOM = 0,       // User-defined target
}

/**
 * Processing parameters state
 */
export interface ProcessingParams {
  eq: BaxandallEQParams;
  compressor: SSLCompressorParams;
  limiter: LimiterParams;
  master: {
    inputGain: number;
    outputGain: number;
    bypass: boolean;
  };
}

/**
 * Audio file metadata
 */
export interface AudioMetadata {
  name: string;
  size: number;
  duration: number;
  sampleRate: number;
  channels: number;
}

/**
 * Main audio store interface
 */
export interface AudioStore {
  // Engine instances
  masteringEngine: MasteringEngine | null;
  playbackEngine: BaseAudioEngine | null;
  aiAnalyzer: AIAnalysis | null;

  // Audio state
  audioFile: File | null;
  audioBuffer: AudioBuffer | null;
  audioMetadata: AudioMetadata | null;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  loop: boolean;
  loopStart: number;
  loopEnd: number;

  // Analysis results
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // Processing parameters
  processingParams: ProcessingParams;
  loudnessTarget: LoudnessTarget;
  customLoudnessTarget: number;
  bypassAll: boolean;

  // Metering data
  meteringData: MasteringEngineMetering | null;
  meteringEnabled: boolean;
  meteringRate: number;

  // UI state
  isLoading: boolean;
  error: string | null;
  selectedProcessor: 'eq' | 'compressor' | 'limiter' | 'master' | null;
  showAnalysisPanel: boolean;
  showProcessingChain: boolean;
  showWaveform: boolean;

  // Actions - Engine Management
  initializeEngines: () => Promise<void>;
  cleanupEngines: () => void;

  // Actions - Audio File Management
  loadAudioFile: (file: File) => Promise<void>;
  unloadAudio: () => void;

  // Actions - Playback Control
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  toggleLoop: () => void;
  setLoopRegion: (start: number, end: number) => void;

  // Actions - Analysis
  analyzeAudio: () => Promise<void>;
  clearAnalysis: () => void;

  // Actions - Processing Parameters
  updateEQ: (params: Partial<BaxandallEQParams>) => void;
  updateCompressor: (params: Partial<SSLCompressorParams>) => void;
  updateLimiter: (params: Partial<LimiterParams>) => void;
  updateMaster: (params: Partial<ProcessingParams['master']>) => void;
  setLoudnessTarget: (target: LoudnessTarget, customValue?: number) => void;
  toggleBypassAll: () => void;
  resetProcessing: () => void;

  // Actions - Metering
  setMeteringEnabled: (enabled: boolean) => void;
  setMeteringRate: (rate: number) => void;
  updateMetering: (data: MasteringEngineMetering) => void;

  // Actions - UI State
  setSelectedProcessor: (processor: AudioStore['selectedProcessor']) => void;
  toggleAnalysisPanel: () => void;
  toggleProcessingChain: () => void;
  toggleWaveform: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Actions - Presets
  savePreset: (name: string) => void;
  loadPreset: (name: string) => void;
  deletePreset: (name: string) => void;
  getPresets: () => string[];
}

/**
 * Default processing parameters
 */
const DEFAULT_PROCESSING_PARAMS: ProcessingParams = {
  eq: {
    bypass: false,
    bassGain: 0,
    bassFreq: 100,
    trebleGain: 0,
    trebleFreq: 10000,
  },
  compressor: {
    bypass: true,
    threshold: -10,
    ratio: 4,
    attack: 10,
    release: 100,
    makeupGain: 0,
    knee: 2,
    mix: 1,
  },
  limiter: {
    bypass: false,
    threshold: -0.3,
    release: 50,
    lookahead: 5,
    stereoLink: 1,
  },
  master: {
    inputGain: 0,
    outputGain: 0,
    bypass: false,
  },
};

/**
 * Create the audio store with Zustand
 */
export const useAudioStore = create<AudioStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        masteringEngine: null,
        playbackEngine: null,
        aiAnalyzer: null,
        audioFile: null,
        audioBuffer: null,
        audioMetadata: null,
        playbackState: PlaybackState.STOPPED,
        currentTime: 0,
        duration: 0,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        analysisResult: null,
        isAnalyzing: false,
        analysisError: null,
        processingParams: DEFAULT_PROCESSING_PARAMS,
        loudnessTarget: LoudnessTarget.STREAMING,
        customLoudnessTarget: -14,
        bypassAll: false,
        meteringData: null,
        meteringEnabled: true,
        meteringRate: 60,
        isLoading: false,
        error: null,
        selectedProcessor: null,
        showAnalysisPanel: false,
        showProcessingChain: false,
        showWaveform: true,

        // Engine Management
        initializeEngines: async () => {
          try {
            set({ isLoading: true, error: null });

            // Initialize MasteringEngine
            const masteringEngine = new MasteringEngine({
              sampleRate: 48000,
              latencyHint: 'interactive',
              meteringRate: get().meteringRate,
            });

            // Initialize BaseAudioEngine for playback
            const playbackEngine = new BaseAudioEngine();

            // Initialize AI Analyzer
            const aiAnalyzer = new AIAnalysis();

            // Set up metering callback
            masteringEngine.setOnMetering((data) => {
              if (get().meteringEnabled) {
                get().updateMetering(data);
              }
            });

            // Set up error handling
            masteringEngine.setOnError((error) => {
              set({ error: error.message });
            });

            // Note: BaseAudioEngine doesn't have setOnError method
            // Error handling is done through try/catch

            // Initialize engines
            await masteringEngine.initialize();
            await playbackEngine.initialize();

            console.log('Engines initialized, storing in state:', {
              masteringEngine: !!masteringEngine,
              playbackEngine: !!playbackEngine,
              aiAnalyzer: !!aiAnalyzer
            });

            set({
              masteringEngine,
              playbackEngine,
              aiAnalyzer,
              isLoading: false,
            });

            // Verify they were stored
            const newState = get();
            console.log('Engines stored in state:', {
              masteringEngine: !!newState.masteringEngine,
              playbackEngine: !!newState.playbackEngine,
              aiAnalyzer: !!newState.aiAnalyzer
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to initialize engines',
              isLoading: false,
            });
          }
        },

        cleanupEngines: () => {
          const { masteringEngine, playbackEngine } = get();

          if (masteringEngine) {
            masteringEngine.dispose();
          }

          if (playbackEngine) {
            playbackEngine.cleanup();
          }

          set({
            masteringEngine: null,
            playbackEngine: null,
            aiAnalyzer: null,
          });
        },

        // Audio File Management
        loadAudioFile: async (file: File) => {
          console.log('loadAudioFile called with:', file);

          // Get fresh state
          const state = get();
          const { playbackEngine, masteringEngine } = state;

          console.log('Current engine state:', {
            playbackEngine: !!playbackEngine,
            masteringEngine: !!masteringEngine
          });

          if (!playbackEngine || !masteringEngine) {
            console.error('Engines not initialized, trying to initialize now...');

            // Try to initialize if not already done
            await get().initializeEngines();

            // Get fresh state again
            const newState = get();

            if (!newState.playbackEngine || !newState.masteringEngine) {
              console.error('Still no engines after initialization attempt');
              set({ error: 'Engines not initialized' });
              return;
            }
          }

          // Get engines again after potential initialization
          const finalState = get();
          const engineToUse = finalState.playbackEngine;
          const masteringEngineToUse = finalState.masteringEngine;

          if (!engineToUse || !masteringEngineToUse) {
            set({ error: 'Engines not available' });
            return;
          }

          try {
            console.log('Loading audio file...');
            set({
              isLoading: true,
              error: null,
              playbackState: PlaybackState.LOADING
            });

            // Load file into playback engine
            await engineToUse.loadAudio(file);

            // Get audio buffer for analysis
            const audioBuffer = await engineToUse.getAudioBuffer();

            // Extract metadata
            const metadata: AudioMetadata = {
              name: file.name,
              size: file.size,
              duration: audioBuffer?.duration || 0,
              sampleRate: audioBuffer?.sampleRate || 48000,
              channels: audioBuffer?.numberOfChannels || 2,
            };

            set({
              audioFile: file,
              audioBuffer,
              audioMetadata: metadata,
              duration: audioBuffer?.duration || 0,
              playbackState: PlaybackState.STOPPED,
              isLoading: false,
            });

            // Auto-analyze if enabled
            if (get().aiAnalyzer) {
              get().analyzeAudio();
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load audio file',
              isLoading: false,
              playbackState: PlaybackState.STOPPED,
            });
          }
        },

        unloadAudio: () => {
          const { playbackEngine } = get();

          if (playbackEngine) {
            playbackEngine.stop();
          }

          set({
            audioFile: null,
            audioBuffer: null,
            audioMetadata: null,
            currentTime: 0,
            duration: 0,
            playbackState: PlaybackState.STOPPED,
            analysisResult: null,
          });
        },

        // Playback Control
        play: async () => {
          const { playbackEngine, audioBuffer } = get();

          if (!playbackEngine || !audioBuffer) {
            set({ error: 'No audio loaded' });
            return;
          }

          try {
            await playbackEngine.play();
            set({ playbackState: PlaybackState.PLAYING });

            // Set up time update interval
            // Note: BaseAudioEngine doesn't expose getCurrentTime publicly
            // We'll track time manually
            let startTime = Date.now();
            const updateTime = setInterval(() => {
              const state = get();
              if (state.playbackState === PlaybackState.PLAYING) {
                const elapsed = (Date.now() - startTime) / 1000;
                const currentTime = Math.min(elapsed, state.duration);
                set({ currentTime });

                // Handle looping
                if (state.loop && currentTime >= state.loopEnd) {
                  playbackEngine.seek(state.loopStart);
                  startTime = Date.now() - (state.loopStart * 1000);
                }
              } else {
                clearInterval(updateTime);
              }
            }, 100);
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to play audio',
              playbackState: PlaybackState.STOPPED,
            });
          }
        },

        pause: () => {
          const { playbackEngine } = get();

          if (playbackEngine) {
            playbackEngine.pause();
            set({ playbackState: PlaybackState.PAUSED });
          }
        },

        stop: () => {
          const { playbackEngine } = get();

          if (playbackEngine) {
            playbackEngine.stop();
            set({
              playbackState: PlaybackState.STOPPED,
              currentTime: 0,
            });
          }
        },

        seek: (time: number) => {
          const { playbackEngine, duration } = get();

          if (playbackEngine && time >= 0 && time <= duration) {
            playbackEngine.seek(time);
            set({ currentTime: time });
          }
        },

        toggleLoop: () => {
          set((state) => ({ loop: !state.loop }));
        },

        setLoopRegion: (start: number, end: number) => {
          const { duration } = get();

          if (start >= 0 && end <= duration && start < end) {
            set({ loopStart: start, loopEnd: end });
          }
        },

        // Analysis
        analyzeAudio: async () => {
          const { aiAnalyzer, audioBuffer } = get();

          if (!aiAnalyzer || !audioBuffer) {
            set({ analysisError: 'Cannot analyze: no audio loaded' });
            return;
          }

          try {
            set({ isAnalyzing: true, analysisError: null });

            const result = await aiAnalyzer.analyzeAudio(audioBuffer);

            set({
              analysisResult: result,
              isAnalyzing: false,
              showAnalysisPanel: true,
            });
          } catch (error) {
            set({
              analysisError: error instanceof Error ? error.message : 'Analysis failed',
              isAnalyzing: false,
            });
          }
        },

        clearAnalysis: () => {
          set({
            analysisResult: null,
            analysisError: null,
          });
        },

        // Processing Parameters
        updateEQ: (params: Partial<BaxandallEQParams>) => {
          const { masteringEngine, processingParams } = get();

          const newEQParams = { ...processingParams.eq, ...params };

          if (masteringEngine) {
            masteringEngine.updateEQ(newEQParams);
          }

          set((state) => ({
            processingParams: {
              ...state.processingParams,
              eq: newEQParams,
            },
          }));
        },

        updateCompressor: (params: Partial<SSLCompressorParams>) => {
          const { masteringEngine, processingParams } = get();

          const newCompressorParams = { ...processingParams.compressor, ...params };

          if (masteringEngine) {
            masteringEngine.updateCompressor(newCompressorParams);
          }

          set((state) => ({
            processingParams: {
              ...state.processingParams,
              compressor: newCompressorParams,
            },
          }));
        },

        updateLimiter: (params: Partial<LimiterParams>) => {
          const { masteringEngine, processingParams } = get();

          const newLimiterParams = { ...processingParams.limiter, ...params };

          if (masteringEngine) {
            masteringEngine.updateLimiter(newLimiterParams);
          }

          set((state) => ({
            processingParams: {
              ...state.processingParams,
              limiter: newLimiterParams,
            },
          }));
        },

        updateMaster: (params: Partial<ProcessingParams['master']>) => {
          const { masteringEngine, processingParams } = get();

          const newMasterParams = { ...processingParams.master, ...params };

          if (masteringEngine) {
            masteringEngine.setInputGain(newMasterParams.inputGain);
            masteringEngine.setOutputGain(newMasterParams.outputGain);
          }

          set((state) => ({
            processingParams: {
              ...state.processingParams,
              master: newMasterParams,
            },
          }));
        },

        setLoudnessTarget: (target: LoudnessTarget, customValue?: number) => {
          set({
            loudnessTarget: target,
            customLoudnessTarget: customValue ?? get().customLoudnessTarget,
          });
        },

        toggleBypassAll: () => {
          const { masteringEngine } = get();
          const newBypassState = !get().bypassAll;

          if (masteringEngine) {
            masteringEngine.updateEQ({ bypass: newBypassState });
            masteringEngine.updateCompressor({ bypass: newBypassState });
            masteringEngine.updateLimiter({ bypass: newBypassState });
          }

          set({ bypassAll: newBypassState });
        },

        resetProcessing: () => {
          const { masteringEngine } = get();

          if (masteringEngine) {
            masteringEngine.updateEQ(DEFAULT_PROCESSING_PARAMS.eq);
            masteringEngine.updateCompressor(DEFAULT_PROCESSING_PARAMS.compressor);
            masteringEngine.updateLimiter(DEFAULT_PROCESSING_PARAMS.limiter);
            masteringEngine.setInputGain(DEFAULT_PROCESSING_PARAMS.master.inputGain);
            masteringEngine.setOutputGain(DEFAULT_PROCESSING_PARAMS.master.outputGain);
          }

          set({
            processingParams: DEFAULT_PROCESSING_PARAMS,
            bypassAll: false,
          });
        },

        // Metering
        setMeteringEnabled: (enabled: boolean) => {
          set({ meteringEnabled: enabled });
        },

        setMeteringRate: (rate: number) => {
          const { masteringEngine } = get();

          if (masteringEngine && rate >= 30 && rate <= 120) {
            // Note: MasteringEngine would need a method to update metering rate
            set({ meteringRate: rate });
          }
        },

        updateMetering: (data: MasteringEngineMetering) => {
          set({ meteringData: data });
        },

        // UI State
        setSelectedProcessor: (processor: AudioStore['selectedProcessor']) => {
          set({ selectedProcessor: processor });
        },

        toggleAnalysisPanel: () => {
          set((state) => ({ showAnalysisPanel: !state.showAnalysisPanel }));
        },

        toggleProcessingChain: () => {
          set((state) => ({ showProcessingChain: !state.showProcessingChain }));
        },

        toggleWaveform: () => {
          set((state) => ({ showWaveform: !state.showWaveform }));
        },

        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        // Presets (stored in localStorage)
        savePreset: (name: string) => {
          const { processingParams } = get();
          const presets = JSON.parse(localStorage.getItem('audioPresets') || '{}');
          presets[name] = processingParams;
          localStorage.setItem('audioPresets', JSON.stringify(presets));
        },

        loadPreset: (name: string) => {
          const presets = JSON.parse(localStorage.getItem('audioPresets') || '{}');
          const preset = presets[name];

          if (preset) {
            const { masteringEngine } = get();

            if (masteringEngine) {
              masteringEngine.updateEQ(preset.eq);
              masteringEngine.updateCompressor(preset.compressor);
              masteringEngine.updateLimiter(preset.limiter);
              masteringEngine.setInputGain(preset.master.inputGain);
              masteringEngine.setOutputGain(preset.master.outputGain);
            }

            set({ processingParams: preset });
          }
        },

        deletePreset: (name: string) => {
          const presets = JSON.parse(localStorage.getItem('audioPresets') || '{}');
          delete presets[name];
          localStorage.setItem('audioPresets', JSON.stringify(presets));
        },

        getPresets: () => {
          const presets = JSON.parse(localStorage.getItem('audioPresets') || '{}');
          return Object.keys(presets);
        },
      }),
      {
        name: 'audio-store',
        // Only persist UI preferences and presets, not engine instances
        partialize: (state) => ({
          loudnessTarget: state.loudnessTarget,
          customLoudnessTarget: state.customLoudnessTarget,
          meteringEnabled: state.meteringEnabled,
          meteringRate: state.meteringRate,
          showAnalysisPanel: state.showAnalysisPanel,
          showProcessingChain: state.showProcessingChain,
          showWaveform: state.showWaveform,
        }),
      }
    ),
    {
      name: 'AudioStore',
    }
  )
);

// Selector hooks for common use cases
export const usePlaybackState = () => useAudioStore((state) => state.playbackState);
export const useAnalysisResult = () => useAudioStore((state) => state.analysisResult);
export const useProcessingParams = () => useAudioStore((state) => state.processingParams);
export const useMeteringData = () => useAudioStore((state) => state.meteringData);
export const useAudioEngines = () => useAudioStore((state) => ({
  masteringEngine: state.masteringEngine,
  playbackEngine: state.playbackEngine,
  aiAnalyzer: state.aiAnalyzer,
}));