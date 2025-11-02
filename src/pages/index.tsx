import React, { useEffect } from 'react';
import { useAudioStore } from '../store/audioStore';
import MonitorSection from '../components/mastering/MonitorSection';
import AudioUploader from '../components/mastering/AudioUploader';
import AudioPlayer from '../components/mastering/AudioPlayer';
import PluginModal from '../components/mastering/PluginModal';
import EQPlugin from '../components/mastering/plugins/EQPlugin';
import LimiterPlugin from '../components/mastering/plugins/LimiterPlugin';
import StereoPlugin from '../components/mastering/plugins/StereoPlugin';
import TapePlugin from '../components/mastering/plugins/TapePlugin';
import InputPlugin from '../components/mastering/plugins/InputPlugin';
import OutputPlugin from '../components/mastering/plugins/OutputPlugin';

export default function MasteringDAW() {
  // Get store state and actions
  const {
    audioFile,
    meteringData,
    error,
    isLoading,
    initializeEngines,
    cleanupEngines,
    loadAudioFile,
    unloadAudio,
    clearError,
    openPlugin,
    closePluginModal,
  } = useAudioStore();

  // Initialize audio engines on mount
  useEffect(() => {
    console.log('Starting engine initialization...');
    const init = async () => {
      try {
        await initializeEngines();
        console.log('initializeEngines promise resolved');

        // Check if engines are actually in the store
        const state = useAudioStore.getState();
        console.log('Current store state after init:', {
          masteringEngine: !!state.masteringEngine,
          playbackEngine: !!state.playbackEngine,
          error: state.error
        });
      } catch (error) {
        console.error('Failed to initialize audio engines:', error);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      cleanupEngines();
    };
  }, []); // Remove dependencies to prevent re-initialization

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Main unit container - fills entire viewport */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-800 via-gray-850 to-gray-900">
          {/* Top bar with branding - more compact */}
          <div className="bg-gradient-to-b from-gray-700 to-gray-800 px-4 py-2 border-b border-gray-900">
            <div className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 50 30" className="w-8 h-5 fill-gray-300">
                <path d="M5 15 L12 8 L12 22 Z M18 8 L25 15 L18 22 Z M32 8 L39 15 L32 22 Z M45 15 L38 8 L38 22 Z" />
              </svg>
              <h1 className="text-base md:text-lg font-bold text-gray-100 tracking-widest">
                FIO MASTERING SUITE
              </h1>
            </div>
          </div>

          {/* Audio Upload & Player Section - more compact */}
          <div className="p-2 md:p-3 border-b border-gray-900">
            <div className="max-w-2xl mx-auto space-y-3">
              {/* Error Display - compact */}
              {error && (
                <div className="bg-red-900/20 border border-red-600 rounded p-2 flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    <span className="text-red-400 font-mono text-[10px]">ERROR</span>
                  </div>
                  <span className="text-red-400 flex-1">{error}</span>
                  <button onClick={clearError} className="text-red-400 hover:text-red-300 ml-auto font-mono">×</button>
                </div>
              )}

              {/* Loading State - compact */}
              {isLoading && (
                <div className="bg-blue-900/20 border border-blue-600 rounded p-2 flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-400 font-mono">LOADING</span>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-auto" />
                </div>
              )}

              <AudioUploader
                audioFile={audioFile}
                onFileSelect={loadAudioFile}
                onRemove={unloadAudio}
              />
              {audioFile && <AudioPlayer />}
            </div>
          </div>

          {/* Main control panel - fills remaining space */}
          <div className="flex-1 p-2 md:p-3 overflow-hidden">
            <div className="h-full max-w-2xl mx-auto">
              <MonitorSection audioData={meteringData} />
            </div>
          </div>
      </div>

      {/* Plugin Modal */}
      <PluginModal isOpen={!!openPlugin} onClose={closePluginModal}>
        {openPlugin === 'eq' && <EQPlugin />}
        {openPlugin === 'limiter' && <LimiterPlugin />}
        {openPlugin === 'stereo' && <StereoPlugin />}
        {openPlugin === 'tape' && <TapePlugin />}
        {openPlugin === 'input' && <InputPlugin />}
        {openPlugin === 'output' && <OutputPlugin />}
      </PluginModal>
    </div>
  );
}