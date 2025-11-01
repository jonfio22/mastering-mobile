import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useAudioStore, PlaybackState } from '@/store/audioStore';

/**
 * AudioPlayer component
 * Integrates with Zustand audio store for playback control
 */
export default function AudioPlayer() {
  // Get state and actions from store
  const audioFile = useAudioStore((state) => state.audioFile);
  const playbackState = useAudioStore((state) => state.playbackState);
  const currentTime = useAudioStore((state) => state.currentTime);
  const duration = useAudioStore((state) => state.duration);
  const play = useAudioStore((state) => state.play);
  const pause = useAudioStore((state) => state.pause);
  const stop = useAudioStore((state) => state.stop);
  const seek = useAudioStore((state) => state.seek);

  // Derived state
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const isLoading = playbackState === PlaybackState.LOADING;

  /**
   * Toggle play/pause
   */
  const togglePlay = async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  };

  /**
   * Handle seek by clicking on progress bar
   */
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;
      seek(newTime);
    }
  };

  /**
   * Format time as MM:SS
   */
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Skip forward or backward by specified seconds
   */
  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    seek(newTime);
  };

  // Don't render if no audio file is loaded
  if (!audioFile) return null;

  return (
    <div className="w-full p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-2 border-gray-700">
      {/* Progress bar */}
      <div
        className="w-full h-2 bg-gray-900 rounded-full mb-4 cursor-pointer overflow-hidden"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-mono">
          {formatTime(currentTime)}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-10)}
            disabled={isLoading}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SkipBack className="w-4 h-4 text-gray-300" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </button>

          <button
            onClick={() => skip(10)}
            disabled={isLoading}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SkipForward className="w-4 h-4 text-gray-300" />
          </button>
        </div>

        <span className="text-xs text-gray-400 font-mono">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}