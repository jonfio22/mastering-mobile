import React, { useState, useRef } from 'react';

export default function RotaryKnob({ 
  label, 
  value = 50, 
  onChange, 
  size = 'medium',
  color = 'burgundy' 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const startYRef = useRef(0);
  const startValueRef = useRef(value);

  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-24 h-24'
  };

  const handleStart = (clientY) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startValueRef.current = currentValue;
  };

  const handleMove = (clientY) => {
    if (!isDragging) return;
    const delta = (startYRef.current - clientY) * 0.5;
    const newValue = Math.max(0, Math.min(100, startValueRef.current + delta));
    setCurrentValue(newValue);
    onChange?.(newValue);
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const rotation = (currentValue / 100) * 270 - 135;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} relative cursor-pointer select-none`}
        onMouseDown={(e) => handleStart(e.clientY)}
        onMouseMove={(e) => handleMove(e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientY)}
        onTouchEnd={handleEnd}
      >
        {/* Knob base shadow */}
        <div className="absolute inset-0 rounded-full bg-black opacity-30 blur-sm translate-y-1" />
        
        {/* Knob body */}
        <div 
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${
            color === 'burgundy' 
              ? 'from-red-900 via-red-800 to-red-950' 
              : 'from-gray-700 via-gray-600 to-gray-800'
          } shadow-lg`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Highlight */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          
          {/* Indicator line */}
          <div className="absolute top-1 left-1/2 w-0.5 h-1/3 bg-white/90 -translate-x-1/2 rounded-full shadow-lg" />
          
          {/* Center cap */}
          <div className="absolute top-1/2 left-1/2 w-1/3 h-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 shadow-inner" />
        </div>

        {/* Metal ring */}
        <div className="absolute inset-0 rounded-full ring-1 ring-gray-600/50" />
      </div>
      
      {label && (
        <span className="text-[8px] md:text-[10px] text-gray-300 font-mono uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}