/**
 * AudioEngine Example Usage
 *
 * This file demonstrates how to integrate the AudioEngine
 * into a React component for the mastering application.
 */

import React, { useEffect, useRef, useState } from 'react';
import { MasteringEngine, MasteringEngineState, MasteringEngineMetering } from './MasteringEngine';
import type { BaxandallEQParams, SSLCompressorParams, LimiterParams } from '../types/worklet.types';

export default function MasteringEngineExample() {
  // MasteringEngine instance
  const engineRef = useRef<MasteringEngine | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // State
  const [engineState, setEngineState] = useState<MasteringEngineState>('idle');
  const [metering, setMetering] = useState<MasteringEngineMetering | null>(null);
  const [error, setError] = useState<string | null>(null);

  // EQ State
  const [eqParams, setEqParams] = useState<BaxandallEQParams>({
    bassGain: 0,
    trebleGain: 0,
    bassFreq: 100,
    trebleFreq: 10000,
    bypass: false
  });

  // Compressor State
  const [compressorParams, setCompressorParams] = useState<SSLCompressorParams>({
    threshold: -10,
    ratio: 4,
    attack: 10,
    release: 100,
    makeupGain: 0,
    bypass: false
  });

  // Limiter State
  const [limiterParams, setLimiterParams] = useState<LimiterParams>({
    threshold: -1.0,
    release: 100,
    ceiling: -0.3,
    bypass: false
  });

  // Initialize AudioEngine
  useEffect(() => {
    let mounted = true;

    const initEngine = async () => {
      try {
        console.log('[Example] Initializing AudioEngine...');

        // Create engine
        const engine = new MasteringEngine({
          sampleRate: 48000,
          latencyHint: 'interactive',
          meteringRate: 60
        });

        // Setup event handlers
        engine.setOnStateChange((state) => {
          if (mounted) {
            console.log('[Example] Engine state:', state);
            setEngineState(state);
          }
        });

        engine.setOnError((err) => {
          if (mounted) {
            console.error('[Example] Engine error:', err);
            setError(err.message);
          }
        });

        engine.setOnMetering((meteringData) => {
          if (mounted) {
            setMetering(meteringData);
          }
        });

        // Initialize
        await engine.initialize();

        // Store reference
        engineRef.current = engine;

        console.log('[Example] AudioEngine initialized successfully');

      } catch (err) {
        console.error('[Example] Failed to initialize:', err);
        if (mounted) {
          setError((err as Error).message);
        }
      }
    };

    initEngine();

    // Cleanup
    return () => {
      mounted = false;
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);

  // Handle audio file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !engineRef.current) return;

    try {
      console.log('[Example] Loading audio file:', file.name);

      // Read file
      const arrayBuffer = await file.arrayBuffer();

      // Decode
      const audioBuffer = await engineRef.current.decodeAudioData(arrayBuffer);

      // Create buffer source
      const source = engineRef.current.createBufferSource(audioBuffer);

      // Start playback
      source.start();

      // Resume AudioContext (required by browsers)
      await engineRef.current.resume();

      console.log('[Example] Audio playing');

    } catch (err) {
      console.error('[Example] Failed to load audio:', err);
      setError((err as Error).message);
    }
  };

  // Connect HTML audio element
  const handleConnectAudio = async () => {
    if (!audioElementRef.current || !engineRef.current) return;

    try {
      engineRef.current.connectMediaElement(audioElementRef.current);
      await engineRef.current.resume();
      console.log('[Example] Audio element connected');
    } catch (err) {
      console.error('[Example] Failed to connect:', err);
      setError((err as Error).message);
    }
  };

  // Update EQ parameters
  const updateEQ = (updates: Partial<BaxandallEQParams>) => {
    const newParams = { ...eqParams, ...updates };
    setEqParams(newParams);

    if (engineRef.current) {
      engineRef.current.updateEQ(newParams);
    }
  };

  // Update compressor parameters
  const updateCompressor = (updates: Partial<SSLCompressorParams>) => {
    const newParams = { ...compressorParams, ...updates };
    setCompressorParams(newParams);

    if (engineRef.current) {
      engineRef.current.updateCompressor(newParams);
    }
  };

  // Update limiter parameters
  const updateLimiter = (updates: Partial<LimiterParams>) => {
    const newParams = { ...limiterParams, ...updates };
    setLimiterParams(newParams);

    if (engineRef.current) {
      engineRef.current.updateLimiter(newParams);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">MasteringEngine Example</h1>

      {/* Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Engine State:</span>
          <span className={`px-3 py-1 rounded ${
            engineState === 'ready' ? 'bg-green-500 text-white' :
            engineState === 'error' ? 'bg-red-500 text-white' :
            'bg-yellow-500 text-white'
          }`}>
            {engineState}
          </span>
        </div>
        {error && (
          <div className="mt-2 text-red-600 text-sm">{error}</div>
        )}
      </div>

      {/* Audio Input */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Audio Input</h2>

        {/* File upload */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">Upload Audio File:</label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="block w-full"
          />
        </div>

        {/* HTML audio element */}
        <div>
          <label className="block mb-2 font-medium">Or use audio element:</label>
          <audio
            ref={audioElementRef}
            controls
            src="/demo-audio.mp3"
            className="w-full mb-2"
          />
          <button
            onClick={handleConnectAudio}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Connect Audio Element
          </button>
        </div>
      </div>

      {/* EQ Controls */}
      <div className="mb-6 p-4 border rounded">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Baxandall EQ</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={eqParams.bypass}
              onChange={(e) => updateEQ({ bypass: e.target.checked })}
            />
            Bypass
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm">Bass Gain: {eqParams.bassGain.toFixed(1)} dB</label>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.1"
              value={eqParams.bassGain}
              onChange={(e) => updateEQ({ bassGain: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Treble Gain: {eqParams.trebleGain.toFixed(1)} dB</label>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.1"
              value={eqParams.trebleGain}
              onChange={(e) => updateEQ({ trebleGain: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        {/* Metering */}
        {metering?.eq && (
          <div className="mt-4 p-2 bg-gray-50 rounded text-xs">
            <div>L: {metering.eq.leftPeakDB.toFixed(1)} dB</div>
            <div>R: {metering.eq.rightPeakDB.toFixed(1)} dB</div>
          </div>
        )}
      </div>

      {/* Compressor Controls */}
      <div className="mb-6 p-4 border rounded">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">SSL Compressor</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={compressorParams.bypass}
              onChange={(e) => updateCompressor({ bypass: e.target.checked })}
            />
            Bypass
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm">Threshold: {compressorParams.threshold.toFixed(1)} dB</label>
            <input
              type="range"
              min="-60"
              max="0"
              step="0.1"
              value={compressorParams.threshold}
              onChange={(e) => updateCompressor({ threshold: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Ratio: {compressorParams.ratio.toFixed(1)}:1</label>
            <input
              type="range"
              min="1"
              max="20"
              step="0.1"
              value={compressorParams.ratio}
              onChange={(e) => updateCompressor({ ratio: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Attack: {compressorParams.attack.toFixed(1)} ms</label>
            <input
              type="range"
              min="0.1"
              max="100"
              step="0.1"
              value={compressorParams.attack}
              onChange={(e) => updateCompressor({ attack: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Release: {compressorParams.release.toFixed(0)} ms</label>
            <input
              type="range"
              min="10"
              max="1000"
              step="1"
              value={compressorParams.release}
              onChange={(e) => updateCompressor({ release: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        {/* Metering */}
        {metering?.compressor && (
          <div className="mt-4 p-2 bg-gray-50 rounded text-xs">
            <div>L: {metering.compressor.leftPeakDB.toFixed(1)} dB</div>
            <div>R: {metering.compressor.rightPeakDB.toFixed(1)} dB</div>
            <div>GR: {(metering.compressor as any).gainReduction?.toFixed(1) ?? 0} dB</div>
          </div>
        )}
      </div>

      {/* Limiter Controls */}
      <div className="mb-6 p-4 border rounded">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Limiter</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={limiterParams.bypass}
              onChange={(e) => updateLimiter({ bypass: e.target.checked })}
            />
            Bypass
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm">Threshold: {limiterParams.threshold.toFixed(1)} dB</label>
            <input
              type="range"
              min="-20"
              max="0"
              step="0.1"
              value={limiterParams.threshold}
              onChange={(e) => updateLimiter({ threshold: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Release: {limiterParams.release.toFixed(0)} ms</label>
            <input
              type="range"
              min="10"
              max="1000"
              step="1"
              value={limiterParams.release}
              onChange={(e) => updateLimiter({ release: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        {/* Metering */}
        {metering?.limiter && (
          <div className="mt-4 p-2 bg-gray-50 rounded text-xs">
            <div>L: {metering.limiter.leftPeakDB.toFixed(1)} dB</div>
            <div>R: {metering.limiter.rightPeakDB.toFixed(1)} dB</div>
            <div>GR: {(metering.limiter as any).gainReduction?.toFixed(1) ?? 0} dB</div>
          </div>
        )}
      </div>

      {/* Overall Metering */}
      <div className="p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Metering</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-semibold mb-2">EQ</div>
            {metering?.eq ? (
              <>
                <div>L: {metering.eq.leftPeakDB.toFixed(1)} dB</div>
                <div>R: {metering.eq.rightPeakDB.toFixed(1)} dB</div>
              </>
            ) : (
              <div className="text-gray-400">No data</div>
            )}
          </div>
          <div>
            <div className="font-semibold mb-2">Compressor</div>
            {metering?.compressor ? (
              <>
                <div>L: {metering.compressor.leftPeakDB.toFixed(1)} dB</div>
                <div>R: {metering.compressor.rightPeakDB.toFixed(1)} dB</div>
              </>
            ) : (
              <div className="text-gray-400">No data</div>
            )}
          </div>
          <div>
            <div className="font-semibold mb-2">Limiter</div>
            {metering?.limiter ? (
              <>
                <div>L: {metering.limiter.leftPeakDB.toFixed(1)} dB</div>
                <div>R: {metering.limiter.rightPeakDB.toFixed(1)} dB</div>
              </>
            ) : (
              <div className="text-gray-400">No data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
