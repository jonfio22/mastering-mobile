/**
 * @fileoverview Professional waveform display component using WaveSurfer.js
 * @module components/mastering/WaveformDisplay
 * @description Integrates with audio store to display and interact with audio waveforms
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import { ZoomIn, ZoomOut, Maximize2, AlertCircle, X } from 'lucide-react';
import { useAudioStore, PlaybackState } from '@/store/audioStore';

interface WaveformDisplayProps {
  height?: number;
  className?: string;
}

/**
 * Loop region selection state
 */
interface LoopSelectionState {
  isSelecting: boolean;
  isDraggingStart: boolean;
  isDraggingEnd: boolean;
  startX: number;
  currentX: number;
}

/**
 * Edge detection threshold in pixels
 */
const EDGE_THRESHOLD = 8;

/**
 * WaveformDisplay Component
 *
 * Features:
 * - Professional waveform visualization
 * - Click-to-seek functionality
 * - Zoom controls for detailed inspection
 * - Syncs with audio store playback state
 * - Hardware-inspired dark theme with VU meter green accents
 * - Mobile responsive
 */
export default function WaveformDisplay({
  height = 128,
  className = ''
}: WaveformDisplayProps) {
  // Container ref for WaveSurfer
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom level state
  const [zoom, setZoom] = useState<number>(1);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [containerMounted, setContainerMounted] = useState<boolean>(false);

  // Loop selection state
  const [loopSelection, setLoopSelection] = useState<LoopSelectionState>({
    isSelecting: false,
    isDraggingStart: false,
    isDraggingEnd: false,
    startX: 0,
    currentX: 0,
  });

  // Overlay ref for loop region interaction
  const loopOverlayRef = useRef<HTMLDivElement>(null);

  // Audio store state
  const audioBuffer = useAudioStore((state) => state.audioBuffer);
  const currentTime = useAudioStore((state) => state.currentTime);
  const duration = useAudioStore((state) => state.duration);
  const playbackState = useAudioStore((state) => state.playbackState);
  const loopStart = useAudioStore((state) => state.loopStart);
  const loopEnd = useAudioStore((state) => state.loopEnd);
  const loop = useAudioStore((state) => state.loop);
  const seek = useAudioStore((state) => state.seek);
  const setLoopRegion = useAudioStore((state) => state.setLoopRegion);
  const toggleLoop = useAudioStore((state) => state.toggleLoop);

  // Derived state
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const isLoading = playbackState === PlaybackState.LOADING;

  // Check when container is mounted
  useEffect(() => {
    if (containerRef.current) {
      setContainerMounted(true);
    }
  }, []);

  // Initialize WaveSurfer only when container is mounted and ready
  const { wavesurfer, isPlaying: wsPlaying } = useWavesurfer({
    container: containerMounted && containerRef.current ? containerRef : undefined,
    height,
    waveColor: '#10b981', // VU meter green
    progressColor: '#059669', // Darker green for progress
    cursorColor: '#34d399', // Lighter green for cursor
    cursorWidth: 2,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    normalize: true,
    interact: true,
    hideScrollbar: false,
    autoScroll: true,
    autoCenter: true,
    minPxPerSec: 50,
    fillParent: true,
    backend: 'WebAudio',
    plugins: [],
  });

  /**
   * Load audio buffer into WaveSurfer when available
   */
  useEffect(() => {
    if (wavesurfer && audioBuffer && audioBuffer.length > 0) {
      console.log('Loading audioBuffer into WaveSurfer:', {
        wavesurfer: !!wavesurfer,
        audioBuffer: !!audioBuffer,
        length: audioBuffer.length,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      });

      try {
        setIsReady(false); // Reset ready state

        // Make sure the audioBuffer has valid data
        const hasValidData = audioBuffer.getChannelData(0).some(sample => sample !== 0);

        if (!hasValidData) {
          console.warn('AudioBuffer contains only silence');
        }

        console.log('Converting AudioBuffer to WAV blob...');

        // Convert to WAV blob directly
        const wav = audioBufferToWav(audioBuffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        console.log('Created blob URL:', url);

        // Load the URL into WaveSurfer
        wavesurfer.load(url).then(() => {
          console.log('WaveSurfer successfully loaded audio');
          setIsReady(true);

          // Clean up blob URL after loading
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }).catch((error) => {
          console.error('WaveSurfer failed to load audio:', error);
          setIsReady(false);
        });
      } catch (error) {
        console.error('Failed to process audio for WaveSurfer:', error);
        setIsReady(false);
      }
    }
  }, [wavesurfer, audioBuffer]);

  /**
   * Sync WaveSurfer playback position with store
   */
  useEffect(() => {
    if (wavesurfer && isReady && currentTime !== undefined) {
      const wsTime = wavesurfer.getCurrentTime();
      // Only seek if there's a significant difference (avoid feedback loop)
      if (Math.abs(wsTime - currentTime) > 0.1) {
        wavesurfer.seekTo(currentTime / duration);
      }
    }
  }, [wavesurfer, currentTime, duration, isReady]);

  /**
   * Handle zoom changes
   */
  useEffect(() => {
    if (wavesurfer && isReady) {
      wavesurfer.zoom(zoom);
    }
  }, [wavesurfer, zoom, isReady]);

  /**
   * Set up WaveSurfer event listeners
   */
  useEffect(() => {
    if (!wavesurfer) return;

    // Handle seeking
    const handleSeek = (seekTime: number) => {
      seek(seekTime);
    };

    // Handle ready state
    const handleReady = () => {
      setIsReady(true);
    };

    // Handle errors
    const handleError = (error: Error) => {
      console.error('WaveSurfer error:', error);
      setIsReady(false);
    };

    wavesurfer.on('seeking', handleSeek);
    wavesurfer.on('ready', handleReady);
    wavesurfer.on('error', handleError);

    return () => {
      wavesurfer.un('seeking', handleSeek);
      wavesurfer.un('ready', handleReady);
      wavesurfer.un('error', handleError);
    };
  }, [wavesurfer, seek]);

  /**
   * Convert pixel X position to time in seconds
   */
  const pixelToTime = useCallback((x: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, x / rect.width));
    return percent * duration;
  }, [duration]);

  /**
   * Convert time in seconds to pixel X position
   */
  const timeToPixel = useCallback((time: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return (time / duration) * rect.width;
  }, [duration]);

  /**
   * Check if a point is near an edge of the loop region
   */
  const checkEdgeProximity = useCallback((x: number): 'start' | 'end' | null => {
    if (!loop) return null;

    const startPixel = timeToPixel(loopStart);
    const endPixel = timeToPixel(loopEnd);

    if (Math.abs(x - startPixel) <= EDGE_THRESHOLD) return 'start';
    if (Math.abs(x - endPixel) <= EDGE_THRESHOLD) return 'end';

    return null;
  }, [loop, loopStart, loopEnd, timeToPixel]);

  /**
   * Handle mouse/touch down - start selection or edge dragging
   */
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current || !isReady) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;

    // Check if clicking near an existing loop edge
    const edge = checkEdgeProximity(x);

    if (edge === 'start') {
      setLoopSelection({
        isSelecting: false,
        isDraggingStart: true,
        isDraggingEnd: false,
        startX: x,
        currentX: x,
      });
    } else if (edge === 'end') {
      setLoopSelection({
        isSelecting: false,
        isDraggingStart: false,
        isDraggingEnd: true,
        startX: x,
        currentX: x,
      });
    } else {
      // Start new selection
      setLoopSelection({
        isSelecting: true,
        isDraggingStart: false,
        isDraggingEnd: false,
        startX: x,
        currentX: x,
      });
    }

    // Prevent text selection during drag
    e.preventDefault();
  }, [isReady, checkEdgeProximity]);

  /**
   * Handle mouse/touch move - update selection
   */
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    if (!loopSelection.isSelecting && !loopSelection.isDraggingStart && !loopSelection.isDraggingEnd) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));

    setLoopSelection(prev => ({ ...prev, currentX: x }));

    // Update cursor style based on proximity to edges
    if (!loopSelection.isSelecting && !loopSelection.isDraggingStart && !loopSelection.isDraggingEnd) {
      const edge = checkEdgeProximity(x);
      if (containerRef.current) {
        containerRef.current.style.cursor = edge ? 'ew-resize' : 'crosshair';
      }
    }
  }, [loopSelection, checkEdgeProximity]);

  /**
   * Handle mouse/touch up - finalize selection
   */
  const handlePointerUp = useCallback(() => {
    if (!loopSelection.isSelecting && !loopSelection.isDraggingStart && !loopSelection.isDraggingEnd) return;

    const startX = Math.min(loopSelection.startX, loopSelection.currentX);
    const endX = Math.max(loopSelection.startX, loopSelection.currentX);

    // Only create loop if selection is wide enough (at least 10 pixels)
    if (Math.abs(endX - startX) < 10) {
      setLoopSelection({
        isSelecting: false,
        isDraggingStart: false,
        isDraggingEnd: false,
        startX: 0,
        currentX: 0,
      });
      return;
    }

    if (loopSelection.isSelecting) {
      // Create new loop region
      const startTime = pixelToTime(startX);
      const endTime = pixelToTime(endX);
      setLoopRegion(startTime, endTime);

      // Enable loop if not already enabled
      if (!loop) {
        toggleLoop();
      }
    } else if (loopSelection.isDraggingStart) {
      // Update loop start
      const newStart = pixelToTime(loopSelection.currentX);
      setLoopRegion(newStart, loopEnd);
    } else if (loopSelection.isDraggingEnd) {
      // Update loop end
      const newEnd = pixelToTime(loopSelection.currentX);
      setLoopRegion(loopStart, newEnd);
    }

    setLoopSelection({
      isSelecting: false,
      isDraggingStart: false,
      isDraggingEnd: false,
      startX: 0,
      currentX: 0,
    });

    // Reset cursor
    if (containerRef.current) {
      containerRef.current.style.cursor = 'pointer';
    }
  }, [loopSelection, pixelToTime, setLoopRegion, loop, toggleLoop, loopStart, loopEnd]);

  /**
   * Handle clearing the loop region
   */
  const handleClearLoop = useCallback(() => {
    if (loop) {
      toggleLoop();
    }
    setLoopRegion(0, duration);
  }, [loop, toggleLoop, setLoopRegion, duration]);

  /**
   * Keyboard shortcut for clearing loop (L key)
   */
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') {
        if (e.shiftKey) {
          // Shift+L: Clear loop
          handleClearLoop();
        } else if (loop) {
          // L: Toggle loop on/off
          toggleLoop();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [loop, toggleLoop, handleClearLoop]);

  /**
   * Update cursor on mouse move when not dragging
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !isReady) return;
      if (loopSelection.isSelecting || loopSelection.isDraggingStart || loopSelection.isDraggingEnd) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const edge = checkEdgeProximity(x);

      containerRef.current.style.cursor = edge ? 'ew-resize' : 'crosshair';
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isReady, loopSelection, checkEdgeProximity]);

  /**
   * Draw loop region overlay and selection preview
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Remove existing overlays
    const existingLoopOverlay = container.querySelector('.loop-region-overlay');
    const existingSelectionOverlay = container.querySelector('.loop-selection-overlay');
    if (existingLoopOverlay) existingLoopOverlay.remove();
    if (existingSelectionOverlay) existingSelectionOverlay.remove();

    // Draw loop region if active
    if (wavesurfer && isReady && loop) {
      const startPercent = (loopStart / duration) * 100;
      const endPercent = (loopEnd / duration) * 100;

      const loopOverlay = document.createElement('div');
      loopOverlay.className = 'loop-region-overlay absolute top-0 h-full pointer-events-none z-10';
      loopOverlay.style.left = `${startPercent}%`;
      loopOverlay.style.width = `${endPercent - startPercent}%`;
      loopOverlay.style.backgroundColor = 'rgba(52, 211, 153, 0.15)';
      loopOverlay.style.borderLeft = '3px solid #34d399';
      loopOverlay.style.borderRight = '3px solid #34d399';
      loopOverlay.style.transition = 'all 0.1s ease-out';

      container.style.position = 'relative';
      container.appendChild(loopOverlay);

      // Add edge handles
      const createHandle = (position: 'left' | 'right') => {
        const handle = document.createElement('div');
        handle.className = `loop-handle absolute top-0 h-full w-2 z-20 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-ew-resize opacity-0 hover:opacity-100`;
        handle.style[position] = '-4px';
        return handle;
      };

      const startHandle = createHandle('left');
      const endHandle = createHandle('right');
      loopOverlay.appendChild(startHandle);
      loopOverlay.appendChild(endHandle);
    }

    // Draw selection preview
    if (loopSelection.isSelecting || loopSelection.isDraggingStart || loopSelection.isDraggingEnd) {
      const startX = Math.min(loopSelection.startX, loopSelection.currentX);
      const endX = Math.max(loopSelection.startX, loopSelection.currentX);
      const width = endX - startX;

      if (width > 0) {
        const selectionOverlay = document.createElement('div');
        selectionOverlay.className = 'loop-selection-overlay absolute top-0 h-full pointer-events-none z-15';
        selectionOverlay.style.left = `${startX}px`;
        selectionOverlay.style.width = `${width}px`;
        selectionOverlay.style.backgroundColor = 'rgba(16, 185, 129, 0.25)';
        selectionOverlay.style.borderLeft = '2px dashed #10b981';
        selectionOverlay.style.borderRight = '2px dashed #10b981';

        container.appendChild(selectionOverlay);
      }
    }
  }, [wavesurfer, isReady, loop, loopStart, loopEnd, duration, loopSelection]);

  /**
   * Zoom controls
   */
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 10, 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 10, 1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  /**
   * Format time display
   */
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Show empty state when no audio is loaded
  if (!audioBuffer) {
    return (
      <div
        className={`w-full bg-gradient-to-b from-gray-900 to-black rounded-lg border-2 border-gray-800 p-8 ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <AlertCircle className="w-12 h-12 text-gray-600" />
          <p className="text-gray-500 text-sm font-medium">No audio loaded</p>
          <p className="text-gray-600 text-xs">Upload an audio file to see the waveform</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Waveform Container */}
      <div className="relative w-full bg-gradient-to-b from-gray-900 to-black rounded-lg border-2 border-gray-700 overflow-hidden">
        {/* No loading overlay */}

        {/* Time display */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10 px-2">
          <div className="bg-black/70 backdrop-blur-sm px-3 py-1 rounded border border-emerald-500/30">
            <span className="text-emerald-400 text-xs font-mono font-bold tracking-wider">
              {formatTime(currentTime)}
            </span>
          </div>
          <div className="bg-black/70 backdrop-blur-sm px-3 py-1 rounded border border-gray-700">
            <span className="text-gray-400 text-xs font-mono">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Waveform with loop selection */}
        <div
          ref={containerRef}
          className="w-full relative"
          style={{ height, cursor: 'crosshair' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {/* Hardware-inspired gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-black/20 pointer-events-none" />

        {/* Glass reflection effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-between gap-2 px-2">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">Zoom:</span>
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="p-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
          </button>
          <div className="bg-gray-900 border border-gray-700 rounded px-3 py-1 min-w-[60px] text-center">
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {zoom}x
            </span>
          </div>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 100}
            className="p-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
          </button>
          <button
            onClick={handleResetZoom}
            disabled={zoom === 1}
            className="p-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
          </button>
        </div>

        {/* Loop controls and playback indicator */}
        <div className="flex items-center gap-2">
          {loop && (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1 flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-medium">
                  LOOP {formatTime(loopStart)} - {formatTime(loopEnd)}
                </span>
                <button
                  onClick={handleClearLoop}
                  className="p-0.5 hover:bg-emerald-500/20 rounded transition-colors"
                  title="Clear loop region (Shift+L)"
                >
                  <X className="w-3 h-3 text-emerald-400" />
                </button>
              </div>
            </>
          )}
          {!loop && isReady && (
            <div className="text-xs text-gray-500 font-medium hidden sm:inline">
              Drag to select loop region
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full transition-all ${
                isPlaying
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse'
                  : 'bg-gray-600'
              }`}
            />
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">
              {isPlaying ? 'PLAYING' : 'STOPPED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Convert AudioBuffer to WAV format
 * Helper function to create a WAV blob from an AudioBuffer
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const data = new Float32Array(buffer.length * numChannels);

  // Interleave channels
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      data[i * numChannels + channel] = sample;
    }
  }

  const dataLength = data.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // Write WAV header
  let offset = 0;

  // "RIFF" chunk descriptor
  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, totalLength - 8, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;

  // "fmt " sub-chunk
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4; // Subchunk size
  view.setUint16(offset, format, true); offset += 2; // Audio format
  view.setUint16(offset, numChannels, true); offset += 2; // Num channels
  view.setUint32(offset, sampleRate, true); offset += 4; // Sample rate
  view.setUint32(offset, sampleRate * blockAlign, true); offset += 4; // Byte rate
  view.setUint16(offset, blockAlign, true); offset += 2; // Block align
  view.setUint16(offset, bitDepth, true); offset += 2; // Bits per sample

  // "data" sub-chunk
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, dataLength, true); offset += 4;

  // Write audio data
  const volume = 0.8;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample * 0x7FFF * volume, true);
    offset += 2;
  }

  return arrayBuffer;
}

/**
 * Write string to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
