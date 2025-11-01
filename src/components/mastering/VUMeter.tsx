import React from 'react';

export default function VUMeter({ label = "VU", type = "volume", value = 0 }) {
  // Convert value (0-100) to needle angle (-45 to 45 degrees)
  const needle = (value / 100) * 90 - 45;

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] border-2 border-gray-800 overflow-hidden">
      {/* Warm backlit glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 via-red-900/30 to-amber-900/40" />

      {/* Inner lit meter face */}
      <div className="absolute inset-1 bg-gradient-to-b from-orange-600/20 to-red-800/30 rounded" />

      {/* Warm glow from behind */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_bottom,rgba(255,140,0,0.4),transparent_70%)]" />
      
      {/* Scale background */}
      <svg viewBox="0 0 200 150" className="absolute inset-0 w-full h-full">
        {/* Arc scale */}
        <defs>
          <radialGradient id="meterGlow">
            <stop offset="0%" stopColor="rgba(255,100,0,0.8)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Warm glow behind scale */}
        <ellipse cx="100" cy="140" rx="90" ry="80" fill="url(#meterGlow)" opacity="0.3" />

        {/* Scale arc */}
        <path
          d="M 30 140 A 80 80 0 0 1 170 140"
          fill="none"
          stroke="#ff8800"
          strokeWidth="2"
          opacity="0.8"
          filter="url(#glow)"
        />
        
        {/* Scale marks */}
        {Array.from({ length: 19 }).map((_, i) => {
          const angle = -90 + (i * 10);
          const isMainMark = i % 2 === 0;
          const length = isMainMark ? 12 : 8;
          const startRadius = 75;
          const endRadius = startRadius - length;

          const x1 = 100 + startRadius * Math.cos((angle * Math.PI) / 180);
          const y1 = 140 + startRadius * Math.sin((angle * Math.PI) / 180);
          const x2 = 100 + endRadius * Math.cos((angle * Math.PI) / 180);
          const y2 = 140 + endRadius * Math.sin((angle * Math.PI) / 180);

          // Red zone for high values (last 5 marks)
          const isRedZone = i >= 14;

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isRedZone ? "#ff3333" : "#ffaa00"}
              strokeWidth={isMainMark ? 2.5 : 1.5}
              opacity="0.9"
              filter={isMainMark ? "url(#glow)" : undefined}
            />
          );
        })}
        
        {/* Scale numbers */}
        {type === "volume" ? (
          <>
            <text x="35" y="135" fontSize="11" fill="#ffaa00" fontFamily="monospace" fontWeight="bold" filter="url(#glow)">-20</text>
            <text x="60" y="95" fontSize="11" fill="#ffaa00" fontFamily="monospace" fontWeight="bold" filter="url(#glow)">-10</text>
            <text x="95" y="75" fontSize="11" fill="#ffaa00" fontFamily="monospace" fontWeight="bold" filter="url(#glow)">0</text>
            <text x="130" y="95" fontSize="11" fill="#ff3333" fontFamily="monospace" fontWeight="bold" filter="url(#glow)">+3</text>
          </>
        ) : (
          <>
            <text x="35" y="135" fontSize="11" fill="#ffaa00" fontFamily="monospace" fontWeight="bold" filter="url(#glow)">0</text>
            <text x="65" y="95" fontSize="11" fill="#ffaa00" fontFamily="monospace" fontWeight="bold" filter="url(#glow)">5</text>
            <text x="95" y="75" fontSize="11" fill="#ffaa00" fontFamily="monospace" fontWeight="bold" filter="url(#glow)">10</text>
            <text x="125" y="95" fontSize="11" fill="#ff3333" fontFamily="monospace" fontWeight="bold" filter="url(#glow)">20</text>
          </>
        )}

        {/* VU/dB markings */}
        <text x="100" y="110" fontSize="14" fill="#ff8800" fontFamily="monospace" fontWeight="bold" textAnchor="middle" filter="url(#glow)">
          {type === "volume" ? "VU" : "dB"}
        </text>

        {/* Red zone indicator */}
        <rect x="140" y="85" width="25" height="8" fill="#ff3333" opacity="0.6" rx="1" filter="url(#glow)" />
        <text x="153" y="91" fontSize="7" fill="#ffffff" fontFamily="monospace" fontWeight="bold" textAnchor="middle">+3dB</text>

        {/* Needle with shadow */}
        <g transform={`rotate(${needle} 100 140)`}>
          {/* Needle shadow */}
          <line
            x1="100"
            y1="140"
            x2="100"
            y2="75"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="3"
            strokeLinecap="round"
            transform="translate(2, 2)"
          />
          {/* Main needle */}
          <line
            x1="100"
            y1="140"
            x2="100"
            y2="75"
            stroke="#111111"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Needle tip highlight */}
          <circle cx="100" cy="75" r="2" fill="#ff3333" filter="url(#glow)" />
          {/* Needle center */}
          <circle cx="100" cy="140" r="7" fill="#222222" />
          <circle cx="100" cy="140" r="5" fill="#333333" />
          <circle cx="100" cy="140" r="3" fill="#444444" />
        </g>
      </svg>

      {/* Label */}
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-[10px] md:text-xs font-mono text-orange-400 font-bold tracking-wider uppercase drop-shadow-[0_0_8px_rgba(255,140,0,0.8)]">
          {label}
        </span>
      </div>

      {/* Glass effect with subtle reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none" />

      {/* Top highlight to simulate glass cover */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
    </div>
  );
}