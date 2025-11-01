import React from 'react';

export default function VUMeter({ label = "VU", type = "volume", value = 0 }) {
  // Convert value (0-100) to needle angle (-45 to 45 degrees)
  const needle = (value / 100) * 90 - 45;

  return (
    <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-amber-100 to-amber-50 rounded-lg shadow-inner border-2 border-gray-700 overflow-hidden">
      {/* Vintage paper texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,90,40,0.3),transparent_50%)]" />
      
      {/* Scale background */}
      <svg viewBox="0 0 200 150" className="absolute inset-0 w-full h-full">
        {/* Arc scale */}
        <defs>
          <radialGradient id="meterGlow">
            <stop offset="0%" stopColor="rgba(255,200,100,0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        
        {/* Scale arc */}
        <path
          d="M 30 140 A 80 80 0 0 1 170 140"
          fill="none"
          stroke="#8B4513"
          strokeWidth="1"
          opacity="0.6"
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
          
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#654321"
              strokeWidth={isMainMark ? 2 : 1}
            />
          );
        })}
        
        {/* Scale numbers */}
        {type === "volume" ? (
          <>
            <text x="35" y="135" fontSize="10" fill="#654321" fontFamily="serif">-20</text>
            <text x="60" y="95" fontSize="10" fill="#654321" fontFamily="serif">-10</text>
            <text x="95" y="75" fontSize="10" fill="#654321" fontFamily="serif">0</text>
            <text x="135" y="95" fontSize="10" fill="#654321" fontFamily="serif">+3</text>
          </>
        ) : (
          <>
            <text x="35" y="135" fontSize="10" fill="#654321" fontFamily="serif">0</text>
            <text x="65" y="95" fontSize="10" fill="#654321" fontFamily="serif">5</text>
            <text x="95" y="75" fontSize="10" fill="#654321" fontFamily="serif">10</text>
            <text x="130" y="95" fontSize="10" fill="#654321" fontFamily="serif">15</text>
          </>
        )}
        
        {/* Needle */}
        <g transform={`rotate(${needle} 100 140)`}>
          <line
            x1="100"
            y1="140"
            x2="100"
            y2="75"
            stroke="#2c1810"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="100" cy="140" r="6" fill="#2c1810" />
          <circle cx="100" cy="140" r="3" fill="#8B4513" />
        </g>
      </svg>

      {/* Label */}
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-[10px] md:text-xs font-serif text-amber-900 font-bold tracking-wider">
          {label}
        </span>
      </div>

      {/* Glass effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none" />
    </div>
  );
}