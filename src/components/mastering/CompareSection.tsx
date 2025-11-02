import React, { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '@/store/audioStore';

type VisualizationType = 'spectrum' | 'waveform' | 'stereo';

export default function CompareSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [activeView, setActiveView] = useState<VisualizationType>('spectrum');

  const { masteringEngine, playbackState } = useAudioStore();

  useEffect(() => {
    if (!masteringEngine) return;

    const analyser = masteringEngine.getAnalyser();
    if (!analyser) return;

    // Set up analyser
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeDomainData = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      // Get frequency and time domain data
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeDomainData);

      // Draw based on active view
      switch (activeView) {
        case 'spectrum':
          drawSpectrum(frequencyData);
          break;
        case 'waveform':
          drawWaveform(timeDomainData);
          break;
        case 'stereo':
          drawStereoField(timeDomainData);
          break;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [masteringEngine, playbackState, activeView]);

  const drawSpectrum = (frequencyData: Uint8Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    // Draw frequency bars
    const barCount = 64;
    const barWidth = width / barCount;
    const step = Math.floor(frequencyData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i * step] || 0;
      const barHeight = (value / 255) * height * 0.9;

      // Color gradient based on frequency
      const hue = (i / barCount) * 60; // 0-60 (red to yellow)
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

      ctx.fillRect(
        i * barWidth,
        height - barHeight,
        barWidth - 1,
        barHeight
      );
    }

    // Draw frequency labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    const labels = ['20Hz', '100Hz', '1kHz', '10kHz', '20kHz'];
    const positions = [0.02, 0.15, 0.4, 0.7, 0.95];

    labels.forEach((label, i) => {
      ctx.fillText(label, width * positions[i], height - 5);
    });
  };

  const drawWaveform = (timeDomainData: Uint8Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#1f2937';
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw waveform
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / timeDomainData.length;
    let x = 0;

    for (let i = 0; i < timeDomainData.length; i++) {
      const v = timeDomainData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  };

  const drawStereoField = (timeDomainData: Uint8Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    // Clear canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    // Draw polar grid circles
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let r = radius * 0.25; r <= radius; r += radius * 0.25) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw cardinal directions
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText('L', centerX - radius - 20, centerY);
    ctx.fillText('R', centerX + radius + 20, centerY);
    ctx.fillText('M', centerX, centerY - radius - 20);
    ctx.fillText('S', centerX, centerY + radius + 20);

    // Draw stereo correlation visualization
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();

    const samples = 150;
    const step = Math.floor(timeDomainData.length / samples);

    for (let i = 0; i < samples; i++) {
      const idx = i * step;

      // Simulate L/R channels from mono data
      const mid = (timeDomainData[idx] - 128) / 128;
      const side = (timeDomainData[idx + 1] - 128) / 128;

      const x = centerX + (side * radius * 0.85);
      const y = centerY - (mid * radius * 0.85);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.globalAlpha = 1.0;
  };

  const viewButtons: { id: VisualizationType; label: string; icon: string }[] = [
    { id: 'spectrum', label: 'SPECTRUM', icon: '📊' },
    { id: 'waveform', label: 'WAVEFORM', icon: '〰️' },
    { id: 'stereo', label: 'STEREO', icon: '◄►' },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* View Selector */}
      <div className="grid grid-cols-3 gap-2">
        {viewButtons.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`
              px-3 py-2 rounded-lg border-2 transition-all duration-200
              ${
                activeView === view.id
                  ? 'bg-gradient-to-b from-blue-700 to-blue-800 border-blue-500 shadow-lg'
                  : 'bg-gradient-to-b from-gray-700 to-gray-800 border-gray-600 hover:border-gray-500'
              }
            `}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{view.icon}</span>
              <span className="text-[10px] font-bold tracking-wider text-gray-100">
                {view.label}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Visualization Display */}
      <div className="flex-1 flex flex-col bg-gray-900 rounded-lg border-2 border-gray-700 overflow-hidden">
        {/* Title Bar */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-850 px-3 py-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-gray-400 font-bold tracking-wider uppercase">
              {activeView === 'spectrum' && 'Frequency Spectrum'}
              {activeView === 'waveform' && 'Waveform Oscilloscope'}
              {activeView === 'stereo' && 'Stereo Phase Scope'}
            </h3>
            <span className="text-xs text-gray-500">
              {activeView === 'spectrum' && 'FFT Analyzer'}
              {activeView === 'waveform' && 'Time Domain'}
              {activeView === 'stereo' && 'L/R Correlation'}
            </span>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="flex-1 p-3 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={activeView === 'stereo' ? 400 : 300}
            className="w-full h-full max-w-full max-h-full"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      </div>
    </div>
  );
}
