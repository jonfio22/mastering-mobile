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
import type {
  PluginType,
  MeteringMode,
  ABMode,
  StereoWidthParams,
  TapeSaturationParams,
  InputGainParams,
  OutputGainParams,
  AllPluginParams,
  ABComparisonState,
} from '@/lib/types/plugin.types';
import {
  DEFAULT_PLUGIN_PARAMS,
  DEFAULT_AB_STATE,
} from '@/lib/types/plugin.types';

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
  sourceNode: AudioBufferSourceNode | null;
  timeUpdateInterval: number | null;

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

  // Plugin UI state
  openPlugin: PluginType | null;

  // Plugin parameters (persist when switching)
  pluginParams: AllPluginParams;

  // A/B Comparison
  abState: ABComparisonState;

  // Metering mode
  meteringMode: MeteringMode;

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

  // Actions - Plugin Management
  openPluginModal: (plugin: PluginType) => void;
  closePluginModal: () => void;
  updatePluginParams: <T extends PluginType>(
    plugin: T,
    params: Partial<AllPluginParams[T]>
  ) => void;

  // Actions - A/B Comparison
  loadSongB: (file: File) => Promise<void>;
  setABMode: (mode: ABMode) => void;
  toggleActiveSong: () => void;
  setCrossfade: (value: number) => void;
  setSongATrim: (gain: number) => void;
  setSongBTrim: (gain: number) => void;

  // Actions - Metering Mode
  setMeteringMode: (mode: MeteringMode) => void;
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
  },
  limiter: {
    bypass: false,
    threshold: -0.3,
    release: 50,
    ceiling: -0.1,
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
        sourceNode: null,
        timeUpdateInterval: null,
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

        // Plugin state
        openPlugin: null,
        pluginParams: DEFAULT_PLUGIN_PARAMS,
        abState: DEFAULT_AB_STATE,
        meteringMode: 'output',

        // Engine Management
        initializeEngines: async () => {
          try {
            // Don't set isLoading during initialization, only clear error
            set({ error: null });

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
          console.log('File details:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: new Date(file.lastModified)
          });

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
              set({ error: 'Engines not initialized. Please refresh the page.' });
              return;
            }
          }

          // Get engines again after potential initialization
          const finalState = get();
          const engineToUse = finalState.playbackEngine;
          const masteringEngineToUse = finalState.masteringEngine;

          if (!engineToUse || !masteringEngineToUse) {
            set({ error: 'Audio engines not available' });
            return;
          }

          try {
            console.log('Loading audio file into engine...');
            set({
              isLoading: true,
              error: null,
              playbackState: PlaybackState.LOADING
            });

            // Load file into playback engine
            await engineToUse.loadAudio(file);
            console.log('File loaded into engine successfully');

            // Get audio buffer for analysis
            const audioBuffer = engineToUse.getAudioBuffer();
            console.log('Audio buffer retrieved:', {
              buffer: !!audioBuffer,
              duration: audioBuffer?.duration,
              sampleRate: audioBuffer?.sampleRate,
              numberOfChannels: audioBuffer?.numberOfChannels,
              length: audioBuffer?.length
            });

            if (!audioBuffer || audioBuffer.length === 0) {
              throw new Error('Failed to decode audio file - buffer is empty');
            }

            // Check if the buffer has actual audio data
            const hasAudioData = Array.from({ length: audioBuffer.numberOfChannels }, (_, i) => {
              const channelData = audioBuffer.getChannelData(i);
              return channelData.some(sample => sample !== 0);
            }).some(hasData => hasData);

            if (!hasAudioData) {
              console.warn('Audio buffer contains only silence');
            }

            // Extract metadata
            const metadata: AudioMetadata = {
              name: file.name,
              size: file.size,
              duration: audioBuffer.duration,
              sampleRate: audioBuffer.sampleRate,
              channels: audioBuffer.numberOfChannels,
            };

            console.log('Setting audio state with metadata:', metadata);

            set({
              audioFile: file,
              audioBuffer,
              audioMetadata: metadata,
              duration: audioBuffer.duration,
              loopEnd: audioBuffer.duration, // Set initial loop end to full duration
              playbackState: PlaybackState.STOPPED,
              isLoading: false,
              error: null
            });

            console.log('Audio file loaded successfully');

            // Auto-analyze if enabled
            if (get().aiAnalyzer) {
              console.log('Starting auto-analysis...');
              get().analyzeAudio();
            }
          } catch (error) {
            console.error('Failed to load audio file:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load audio file';
            set({
              error: errorMessage,
              isLoading: false,
              playbackState: PlaybackState.STOPPED,
              audioFile: null,
              audioBuffer: null,
              audioMetadata: null
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
          const { masteringEngine, audioBuffer } = get();

          if (!masteringEngine || !audioBuffer) {
            set({ error: 'No audio loaded or mastering engine not initialized' });
            return;
          }

          try {
            // Stop any existing playback
            const currentSource = get().sourceNode;
            if (currentSource) {
              try {
                currentSource.stop();
                currentSource.disconnect();
              } catch (e) {
                // Ignore if already stopped
              }
            }

            // Create a new buffer source through the mastering engine
            const sourceNode = masteringEngine.createBufferSource(audioBuffer);

            // Store the source node so we can stop it later
            set({ sourceNode: sourceNode as any });

            // Set up playback end handler
            sourceNode.onended = () => {
              const state = get();
              if (state.playbackState === PlaybackState.PLAYING && !state.loop) {
                set({
                  playbackState: PlaybackState.STOPPED,
                  currentTime: 0,
                  sourceNode: null
                });
              }
            };

            // Start playback
            sourceNode.start(0, get().currentTime);
            set({ playbackState: PlaybackState.PLAYING });

            // Start real-time metering
            const startRealTimeMetering = () => {
              const analyserNode = masteringEngine.getAnalyser();
              if (!analyserNode) return null;

              const bufferLength = analyserNode.frequencyBinCount;
              const dataArray = new Float32Array(bufferLength);

              const updateMeters = () => {
                if (get().playbackState !== PlaybackState.PLAYING) {
                  return;
                }

                analyserNode.getFloatTimeDomainData(dataArray);

                // Calculate RMS for volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                  sum += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sum / bufferLength);

                // Convert to dB
                const db = 20 * Math.log10(Math.max(rms, 0.00001));
                // Normalize to 0-100 range (-60dB to 0dB)
                const normalizedVolume = Math.max(0, Math.min(100, (db + 60) * (100 / 60)));

                // Update metering data
                (get().updateMetering as any)({
                  volume: normalizedVolume,
                  inputLevel: normalizedVolume * 0.8,
                  outputLevel: normalizedVolume * 0.9,
                  gainReduction: Math.max(0, normalizedVolume * 0.3),
                  correlation: 1.0,
                  phase: 0,
                  frequency: {
                    bass: normalizedVolume * 0.6,
                    mid: normalizedVolume * 0.8,
                    treble: normalizedVolume * 0.5
                  },
                  dynamics: {
                    peak: normalizedVolume * 1.1,
                    rms: normalizedVolume,
                    lufs: normalizedVolume - 14,
                    range: 12
                  }
                });

                requestAnimationFrame(updateMeters);
              };

              requestAnimationFrame(updateMeters);
            };

            // Start metering
            startRealTimeMetering();

            // Set up time update interval
            const startTime = masteringEngine.getContext()?.currentTime || 0;
            const startOffset = get().currentTime;

            const updateTime = setInterval(() => {
              const state = get();
              if (state.playbackState === PlaybackState.PLAYING && masteringEngine.getContext()) {
                const elapsed = masteringEngine.getContext()!.currentTime - startTime;
                const currentTime = Math.min(startOffset + elapsed, state.duration);
                set({ currentTime });

                // Handle looping
                if (state.loop && currentTime >= state.loopEnd) {
                  // Stop current playback and restart from loop start
                  state.sourceNode?.stop();
                  const newSource = masteringEngine.createBufferSource(audioBuffer);
                  newSource.start(0, state.loopStart);
                  set({
                    sourceNode: newSource as any,
                    currentTime: state.loopStart
                  });
                }

                // Stop if reached the end
                if (!state.loop && currentTime >= state.duration) {
                  clearInterval(updateTime);
                  set({
                    playbackState: PlaybackState.STOPPED,
                    currentTime: 0,
                    sourceNode: null
                  });
                }
              } else if (state.playbackState !== PlaybackState.PLAYING) {
                clearInterval(updateTime);
              }
            }, 50); // Update at 20Hz for smooth time display

            // Store the interval ID so we can clean it up
            set({ timeUpdateInterval: updateTime as any });
          } catch (error) {
            console.error('Playback error:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to play audio',
              playbackState: PlaybackState.STOPPED,
              sourceNode: null
            });
          }
        },

        pause: () => {
          const { sourceNode, timeUpdateInterval } = get();

          if (sourceNode) {
            try {
              sourceNode.stop();
              sourceNode.disconnect();
            } catch (e) {
              // Ignore if already stopped
            }
          }

          if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
          }

          set({
            playbackState: PlaybackState.PAUSED,
            sourceNode: null,
            timeUpdateInterval: null
          });
        },

        stop: () => {
          const { sourceNode, timeUpdateInterval } = get();

          if (sourceNode) {
            try {
              sourceNode.stop();
              sourceNode.disconnect();
            } catch (e) {
              // Ignore if already stopped
            }
          }

          if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
          }

          // Reset metering to 0
          (get().updateMetering as any)({
            volume: 0,
            inputLevel: 0,
            outputLevel: 0,
            gainReduction: 0,
            correlation: 1.0,
            phase: 0,
            frequency: { bass: 0, mid: 0, treble: 0 },
            dynamics: { peak: 0, rms: 0, lufs: -70, range: 0 }
          });

          set({
            playbackState: PlaybackState.STOPPED,
            currentTime: 0,
            sourceNode: null,
            timeUpdateInterval: null
          });
        },

        seek: (time: number) => {
          const { masteringEngine, audioBuffer, duration, playbackState, sourceNode, timeUpdateInterval } = get();

          if (masteringEngine && audioBuffer && time >= 0 && time <= duration) {
            // If playing, restart from the new position
            if (playbackState === PlaybackState.PLAYING) {
              // Stop current playback
              if (sourceNode) {
                try {
                  sourceNode.stop();
                  sourceNode.disconnect();
                } catch (e) {
                  // Ignore if already stopped
                }
              }

              if (timeUpdateInterval) {
                clearInterval(timeUpdateInterval);
              }

              // Start from new position
              const newSource = masteringEngine.createBufferSource(audioBuffer);
              newSource.start(0, time);
              set({
                sourceNode: newSource as any,
                currentTime: time
              });

              // Set up new time tracking
              const startTime = masteringEngine.getContext()?.currentTime || 0;
              const updateTime = setInterval(() => {
                const state = get();
                if (state.playbackState === PlaybackState.PLAYING && masteringEngine.getContext()) {
                  const elapsed = masteringEngine.getContext()!.currentTime - startTime;
                  const currentTime = Math.min(time + elapsed, state.duration);
                  set({ currentTime });

                  if (!state.loop && currentTime >= state.duration) {
                    clearInterval(updateTime);
                    set({
                      playbackState: PlaybackState.STOPPED,
                      currentTime: 0,
                      sourceNode: null
                    });
                  }
                } else {
                  clearInterval(updateTime);
                }
              }, 50);

              set({ timeUpdateInterval: updateTime as any });
            } else {
              // Just update the current time if not playing
              set({ currentTime: time });
            }
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

        // Plugin Management
        openPluginModal: (plugin: PluginType) => {
          set({ openPlugin: plugin });
        },

        closePluginModal: () => {
          set({ openPlugin: null });
        },

        updatePluginParams: (plugin, params) => {
          set((state) => ({
            pluginParams: {
              ...state.pluginParams,
              [plugin]: {
                ...state.pluginParams[plugin],
                ...params,
              },
            },
          }));

          // Also update the mastering engine if applicable
          const { masteringEngine, pluginParams } = get();
          if (!masteringEngine) return;

          const updatedParams = {
            ...pluginParams[plugin],
            ...params,
          } as any;

          switch (plugin) {
            case 'eq':
              masteringEngine.updateEQ(updatedParams);
              break;
            case 'limiter':
              masteringEngine.updateLimiter(updatedParams);
              break;
            case 'stereo':
              // TODO: Implement stereo width in mastering engine
              console.log('Stereo width update:', updatedParams);
              break;
            case 'tape':
              // TODO: Implement tape saturation in mastering engine
              console.log('Tape saturation update:', updatedParams);
              break;
            case 'input':
              if ('gain' in updatedParams) {
                masteringEngine.setInputGain(updatedParams.gain);
              }
              break;
            case 'output':
              if ('gain' in updatedParams) {
                masteringEngine.setOutputGain(updatedParams.gain);
              }
              break;
          }
        },

        // A/B Comparison
        loadSongB: async (file: File) => {
          try {
            set((state) => ({
              abState: {
                ...state.abState,
                songBFile: file,
              },
            }));
            // TODO: Load file into separate audio buffer for comparison
          } catch (error) {
            console.error('Failed to load Song B:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to load reference track' });
          }
        },

        setABMode: (mode: ABMode) => {
          set((state) => ({
            abState: {
              ...state.abState,
              abMode: mode,
            },
          }));
        },

        toggleActiveSong: () => {
          set((state) => ({
            abState: {
              ...state.abState,
              activeSong: state.abState.activeSong === 'A' ? 'B' : 'A',
            },
          }));
        },

        setCrossfade: (value: number) => {
          set((state) => ({
            abState: {
              ...state.abState,
              crossfade: Math.max(0, Math.min(100, value)),
            },
          }));
        },

        setSongATrim: (gain: number) => {
          set((state) => ({
            abState: {
              ...state.abState,
              songATrim: Math.max(-12, Math.min(12, gain)),
            },
          }));
        },

        setSongBTrim: (gain: number) => {
          set((state) => ({
            abState: {
              ...state.abState,
              songBTrim: Math.max(-12, Math.min(12, gain)),
            },
          }));
        },

        // Metering Mode
        setMeteringMode: (mode: MeteringMode) => {
          set({ meteringMode: mode });
        },

        // Gain Staging Management
        getGainStagingInfo: () => ({
          nominalLevel: -18, // -18dBFS nominal operating level
          peakHeadroom: -6, // -6dBFS peak level (12dB headroom from nominal)
          safetyMargin: -0.3, // -0.3dBFS limiter threshold (prevents distortion)
        }),
      }),
      {
        name: 'audio-store',
        // Only persist UI preferences, plugin params, and presets, not engine instances
        partialize: (state) => ({
          loudnessTarget: state.loudnessTarget,
          customLoudnessTarget: state.customLoudnessTarget,
          meteringEnabled: state.meteringEnabled,
          meteringRate: state.meteringRate,
          showAnalysisPanel: state.showAnalysisPanel,
          showProcessingChain: state.showProcessingChain,
          showWaveform: state.showWaveform,
          pluginParams: state.pluginParams,
          meteringMode: state.meteringMode,
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