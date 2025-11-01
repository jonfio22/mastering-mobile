import React, { useEffect } from 'react';
import { useAudioStore } from '../store/audioStore';
import EQSection from '../components/mastering/EQSection';
import MonitorSection from '../components/mastering/MonitorSection';
import MasterSection from '../components/mastering/MasterSection';
import AudioUploader from '../components/mastering/AudioUploader';
import AudioPlayer from '../components/mastering/AudioPlayer';
import WaveformDisplay from '../components/mastering/WaveformDisplay';

export default function MasteringDAW() {
  // Get store state and actions
  const {
    audioFile,
    meteringData,
    initializeEngines,
    cleanupEngines,
    loadAudioFile,
    unloadAudio,
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-2 md:p-4">
      {/* Wood frame effect */}
      <div className="max-w-[1400px] mx-auto relative">
        {/* Outer wood frame */}
        <div 
          className="absolute -inset-4 md:-inset-6 rounded-2xl"
          style={{
            background: `
              linear-gradient(135deg, 
                #8B4513 0%, 
                #A0522D 25%, 
                #8B4513 50%, 
                #654321 75%, 
                #8B4513 100%
              )
            `,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.5),
              0 10px 40px rgba(0,0,0,0.8)
            `
          }}
        >
          {/* Wood grain texture */}
          <div 
            className="absolute inset-0 rounded-2xl opacity-30"
            style={{
              backgroundImage: `repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.1) 2px,
                rgba(0,0,0,0.1) 4px
              )`
            }}
          />
        </div>

        {/* Main unit container */}
        <div className="relative bg-gradient-to-b from-gray-800 via-gray-850 to-gray-900 rounded-xl shadow-2xl overflow-hidden border-4 border-gray-900">
          {/* Top bar with branding */}
          <div className="bg-gradient-to-b from-gray-700 to-gray-800 px-6 py-3 md:py-4 border-b-2 border-gray-900">
            <div className="flex items-center justify-center gap-3">
              <svg viewBox="0 0 50 30" className="w-10 h-6 md:w-12 md:h-8 fill-gray-300">
                <path d="M5 15 L12 8 L12 22 Z M18 8 L25 15 L18 22 Z M32 8 L39 15 L32 22 Z M45 15 L38 8 L38 22 Z" />
              </svg>
              <h1 className="text-lg md:text-2xl font-bold text-gray-100 tracking-widest">
                MAESTRO MASTERING SUITE
              </h1>
            </div>
          </div>

          {/* Audio Upload & Player Section */}
          <div className="p-3 md:p-6 border-b-2 border-gray-900">
            <div className="max-w-2xl mx-auto space-y-3">
              <AudioUploader
                audioFile={audioFile}
                onFileSelect={loadAudioFile}
                onRemove={unloadAudio}
              />
              {audioFile && (
                <>
                  <WaveformDisplay height={150} />
                  <AudioPlayer />
                </>
              )}
            </div>
          </div>

          {/* Main control panel */}
          <div className="p-3 md:p-6">
            {/* Desktop layout - 3 columns */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_1.5fr_1fr] gap-6">
              <EQSection />
              <MonitorSection />
              <MasterSection />
            </div>

            {/* Tablet layout - 2 columns */}
            <div className="hidden md:grid lg:hidden grid-cols-2 gap-4">
              <EQSection />
              <MonitorSection />
              <div className="col-span-2">
                <MasterSection />
              </div>
            </div>

            {/* Mobile layout - stacked */}
            <div className="md:hidden flex flex-col gap-4">
              <MonitorSection />
              <EQSection />
              <MasterSection />
            </div>
          </div>

          {/* Bottom edge detail */}
          <div className="h-2 bg-gradient-to-b from-gray-900 to-black" />
        </div>

        {/* Screws in corners */}
        {[
          'top-2 left-2',
          'top-2 right-2',
          'bottom-2 left-2',
          'bottom-2 right-2'
        ].map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-3 h-3 md:w-4 md:h-4 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 shadow-lg`}
          >
            <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-gray-700 to-gray-900">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-px bg-gray-600 rotate-45" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-1 bg-gray-600 rotate-45" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="text-center mt-8 text-gray-500 text-xs md:text-sm">
        <p className="font-mono">MAESTRO MASTERING SUITE</p>
        <p className="text-[10px] mt-1 opacity-70">Professional Grade Mobile Mastering</p>
      </div>
    </div>
  );
}