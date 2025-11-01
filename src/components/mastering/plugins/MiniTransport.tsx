/**
 * @fileoverview Compact transport controls for plugin panels
 * @module components/mastering/plugins/MiniTransport
 * @description Provides play/pause/stop controls and time display for plugin interfaces
 */

import React from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { useAudioStore, PlaybackState } from '@/store/audioStore';

/**
 * MiniTransport Component
 *
 * Compact transport controls for plugin panels
 * - Play/pause/stop buttons
 * - Current time and duration display
 * - Syncs with audio store playback state
 */
export default function MiniTransport() {
  const playbackState = useAudioStore((state) => state.playbackState);
  const currentTime = useAudioStore((state) => state.currentTime);
  const duration = useAudioStore((state) => state.duration);
  const play = useAudioStore((state) => state.play);
  const pause = useAudioStore((state) => state.pause);
  const stop = useAudioStore((state) => state.stop);

  const isPlaying = playbackState === PlaybackState.PLAYING;
  const isLoading = playbackState === PlaybackState.LOADING;

  const togglePlay = async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/50 rounded">
      {/* Transport buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-emerald-400" />
          ) : (
            <Play className="w-4 h-4 text-emerald-400" />
          )}
        </button>

        <button
          onClick={stop}
          disabled={isLoading}
          className="p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Stop"
        >
          <Square className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Time display */}
      <div className="flex items-center gap-1 text-xs font-mono text-gray-400">
        <span>{formatTime(currentTime)}</span>
        <span>/</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
