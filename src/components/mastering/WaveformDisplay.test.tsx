/**
 * @fileoverview Tests for WaveformDisplay component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WaveformDisplay from './WaveformDisplay';
import { useAudioStore } from '@/store/audioStore';

// Mock the audio store
vi.mock('@/store/audioStore', () => ({
  useAudioStore: vi.fn(),
  PlaybackState: {
    STOPPED: 'stopped',
    PLAYING: 'playing',
    PAUSED: 'paused',
    LOADING: 'loading',
  },
}));

// Mock WaveSurfer hook
vi.mock('@wavesurfer/react', () => ({
  useWavesurfer: vi.fn(() => ({
    wavesurfer: null,
    isPlaying: false,
  })),
}));

describe('WaveformDisplay', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it('should render empty state when no audio is loaded', () => {
    // Mock empty store state
    (useAudioStore as any).mockImplementation((selector: any) => {
      const state = {
        audioBuffer: null,
        currentTime: 0,
        duration: 0,
        playbackState: 'stopped',
        loopStart: 0,
        loopEnd: 0,
        loop: false,
        seek: vi.fn(),
      };
      return selector(state);
    });

    render(<WaveformDisplay />);

    expect(screen.getByText('No audio loaded')).toBeInTheDocument();
    expect(screen.getByText('Upload an audio file to see the waveform')).toBeInTheDocument();
  });

  it('should render waveform container when audio is loaded', () => {
    // Create a mock AudioBuffer
    const mockAudioBuffer = {
      length: 44100,
      duration: 1,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: vi.fn(() => new Float32Array(44100)),
    } as any;

    // Mock store with audio loaded
    (useAudioStore as any).mockImplementation((selector: any) => {
      const state = {
        audioBuffer: mockAudioBuffer,
        currentTime: 0,
        duration: 1,
        playbackState: 'stopped',
        loopStart: 0,
        loopEnd: 1,
        loop: false,
        seek: vi.fn(),
      };
      return selector(state);
    });

    const { container } = render(<WaveformDisplay />);

    // Should not show empty state
    expect(screen.queryByText('No audio loaded')).not.toBeInTheDocument();

    // Should have waveform container classes
    expect(container.querySelector('.bg-gradient-to-b')).toBeInTheDocument();
  });

  it('should apply custom height prop', () => {
    const customHeight = 256;

    const mockAudioBuffer = {
      length: 44100,
      duration: 1,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: vi.fn(() => new Float32Array(44100)),
    } as any;

    (useAudioStore as any).mockImplementation((selector: any) => {
      const state = {
        audioBuffer: mockAudioBuffer,
        currentTime: 0,
        duration: 1,
        playbackState: 'stopped',
        loopStart: 0,
        loopEnd: 1,
        loop: false,
        seek: vi.fn(),
      };
      return selector(state);
    });

    const { container } = render(<WaveformDisplay height={customHeight} />);

    const waveformDiv = container.querySelector('[style*="height"]');
    expect(waveformDiv).toHaveStyle({ height: `${customHeight}px` });
  });

  it('should apply custom className', () => {
    const customClass = 'my-custom-class';

    const mockAudioBuffer = {
      length: 44100,
      duration: 1,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: vi.fn(() => new Float32Array(44100)),
    } as any;

    (useAudioStore as any).mockImplementation((selector: any) => {
      const state = {
        audioBuffer: mockAudioBuffer,
        currentTime: 0,
        duration: 1,
        playbackState: 'stopped',
        loopStart: 0,
        loopEnd: 1,
        loop: false,
        seek: vi.fn(),
      };
      return selector(state);
    });

    const { container } = render(<WaveformDisplay className={customClass} />);

    expect(container.firstChild).toHaveClass(customClass);
  });
});
