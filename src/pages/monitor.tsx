import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAudioStore } from '../store/audioStore';
import CompareSection from '../components/mastering/CompareSection';
import AudioPlayer from '../components/mastering/AudioPlayer';

export default function MonitorPage() {
  const router = useRouter();
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [activeTrack, setActiveTrack] = useState<'master' | 'reference'>('master');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reference audio context and nodes
  const referenceContextRef = useRef<AudioContext | null>(null);
  const referenceSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const referenceBufferRef = useRef<AudioBuffer | null>(null);

  const {
    audioFile,
    playbackState,
    error,
    isLoading,
    initializeEngines,
    cleanupEngines,
    clearError,
    play,
    pause,
    stop,
    masteringEngine,
  } = useAudioStore();

  useEffect(() => {
    const init = async () => {
      try {
        await initializeEngines();
      } catch (error) {
        console.error('Failed to initialize audio engines:', error);
      }
    };

    init();

    return () => {
      // Cleanup reference audio
      if (referenceSourceRef.current) {
        try {
          referenceSourceRef.current.stop();
          referenceSourceRef.current.disconnect();
        } catch (e) {
          // Ignore
        }
      }
      if (referenceContextRef.current) {
        referenceContextRef.current.close();
      }
    };
  }, []);

  const handleReferenceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setReferenceFile(file);

      // Load reference track into separate audio context
      const arrayBuffer = await file.arrayBuffer();

      if (!referenceContextRef.current) {
        referenceContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioBuffer = await referenceContextRef.current.decodeAudioData(arrayBuffer);
      referenceBufferRef.current = audioBuffer;

      console.log('Reference track loaded:', file.name);
    } catch (error) {
      console.error('Failed to load reference track:', error);
    }
  };

  const handleRemoveReference = () => {
    if (referenceSourceRef.current) {
      try {
        referenceSourceRef.current.stop();
        referenceSourceRef.current.disconnect();
      } catch (e) {
        // Ignore
      }
    }
    setReferenceFile(null);
    referenceBufferRef.current = null;
    if (activeTrack === 'reference') {
      setActiveTrack('master');
    }
  };

  const handleTrackSwitch = (track: 'master' | 'reference') => {
    if (activeTrack === track) return; // Already on this track

    // Stop reference track if switching away from it
    if (activeTrack === 'reference' && referenceSourceRef.current) {
      try {
        referenceSourceRef.current.stop();
        referenceSourceRef.current.disconnect();
      } catch (e) {
        // Ignore
      }
      referenceSourceRef.current = null;
    }

    // Stop master track if switching away from it
    if (activeTrack === 'master' && track === 'reference') {
      if (playbackState === 'playing') {
        stop();
      }
    }

    setActiveTrack(track);

    // Start playback of newly selected track
    if (track === 'reference' && referenceBufferRef.current && referenceContextRef.current) {
      // Play reference track
      const source = referenceContextRef.current.createBufferSource();
      source.buffer = referenceBufferRef.current;
      source.connect(referenceContextRef.current.destination);
      source.start(0);
      referenceSourceRef.current = source;
    }
  };

  const hasMasterTrack = !!audioFile;
  const hasReferenceTrack = !!referenceFile;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Main container */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-800 via-gray-850 to-gray-900">
        {/* Top bar */}
        <div className="bg-gradient-to-b from-gray-700 to-gray-800 px-4 py-3 border-b border-gray-900 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-200 text-sm font-bold tracking-wider transition-colors"
          >
            ← BACK
          </button>
          <h1 className="text-base md:text-lg font-bold text-gray-100 tracking-widest">
            📊 MONITOR
          </h1>
          <div className="w-12" />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-3 mt-3 bg-red-900/20 border border-red-600 rounded p-2 flex items-center gap-2 text-xs">
            <span className="text-red-400">⚠️ {error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300 ml-auto">✕</button>
          </div>
        )}

        {/* Audio Player */}
        {hasMasterTrack && (
          <div className="p-3 border-b border-gray-900">
            <div className="max-w-2xl mx-auto">
              <AudioPlayer />
            </div>
          </div>
        )}

        {/* Track Status & A/B Toggle */}
        <div className="p-3 border-b border-gray-900">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Track Indicators */}
            <div className="grid grid-cols-2 gap-2">
              {/* Master Track */}
              <div className={`
                p-3 rounded-lg border-2 transition-all
                ${hasMasterTrack
                  ? 'bg-gradient-to-b from-emerald-900/30 to-gray-800 border-emerald-600'
                  : 'bg-gray-800 border-gray-700'}
              `}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${hasMasterTrack ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                  <span className="text-xs font-bold text-gray-300 tracking-wider">
                    MASTER
                  </span>
                </div>
                {hasMasterTrack && (
                  <p className="text-[10px] text-gray-400 mt-1 truncate">
                    {audioFile.name}
                  </p>
                )}
              </div>

              {/* Reference Track */}
              <div className={`
                p-3 rounded-lg border-2 transition-all
                ${hasReferenceTrack
                  ? 'bg-gradient-to-b from-blue-900/30 to-gray-800 border-blue-600'
                  : 'bg-gray-800 border-gray-700'}
              `}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${hasReferenceTrack ? 'bg-blue-500' : 'bg-gray-600'}`} />
                  <span className="text-xs font-bold text-gray-300 tracking-wider">
                    REFERENCE
                  </span>
                </div>
                {hasReferenceTrack && (
                  <p className="text-[10px] text-gray-400 mt-1 truncate">
                    {referenceFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Reference Upload */}
            {!hasReferenceTrack && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-b from-gray-700 to-gray-800 border-2 border-dashed border-gray-600 hover:border-blue-500 transition-all"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">📁</span>
                  <span className="text-xs font-bold text-gray-300 tracking-wider">
                    UPLOAD REFERENCE TRACK
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Compare your master with a reference
                  </span>
                </div>
              </button>
            )}

            {/* A/B Toggle Buttons */}
            {hasMasterTrack && hasReferenceTrack && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTrackSwitch('master')}
                  className={`
                    px-4 py-3 rounded-lg border-2 transition-all font-bold tracking-wider
                    ${activeTrack === 'master'
                      ? 'bg-gradient-to-b from-emerald-700 to-emerald-800 border-emerald-500 shadow-lg text-gray-100'
                      : 'bg-gradient-to-b from-gray-700 to-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'}
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">A</span>
                    <span className="text-xs">MASTER</span>
                  </div>
                </button>

                <button
                  onClick={() => handleTrackSwitch('reference')}
                  className={`
                    px-4 py-3 rounded-lg border-2 transition-all font-bold tracking-wider
                    ${activeTrack === 'reference'
                      ? 'bg-gradient-to-b from-blue-700 to-blue-800 border-blue-500 shadow-lg text-gray-100'
                      : 'bg-gradient-to-b from-gray-700 to-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'}
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">B</span>
                    <span className="text-xs">REFERENCE</span>
                  </div>
                </button>
              </div>
            )}

            {/* Remove Reference Button */}
            {hasReferenceTrack && (
              <button
                onClick={handleRemoveReference}
                className="w-full px-3 py-2 rounded-lg bg-red-900/20 border border-red-600 hover:bg-red-900/30 transition-all"
              >
                <span className="text-xs font-bold text-red-400 tracking-wider">
                  ✕ REMOVE REFERENCE
                </span>
              </button>
            )}

            {/* Instructions */}
            {!hasMasterTrack && (
              <div className="bg-blue-900/20 border border-blue-600 rounded p-3 text-center">
                <p className="text-xs text-blue-300">
                  Upload your master track on the main page first
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Visualization Section */}
        <div className="flex-1 p-3 overflow-hidden">
          <div className="h-full max-w-2xl mx-auto">
            {hasMasterTrack ? (
              <CompareSection />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="text-sm">No audio loaded</p>
                  <p className="text-xs mt-2">Go back and upload a track to begin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input for reference track */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleReferenceFileSelect}
        className="hidden"
      />
    </div>
  );
}
