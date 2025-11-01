import React, { useState } from 'react';

export default function HardwareButton({ 
  label, 
  active = false, 
  onClick,
  variant = 'default',
  size = 'medium'
}) {
  const [isPressed, setIsPressed] = useState(false);

  const variants = {
    default: active 
      ? 'bg-gradient-to-b from-amber-400 to-amber-500 shadow-amber-400/50' 
      : 'bg-gradient-to-b from-gray-600 to-gray-700 shadow-black/50',
    solo: active 
      ? 'bg-gradient-to-b from-yellow-400 to-yellow-500 shadow-yellow-400/50' 
      : 'bg-gradient-to-b from-gray-600 to-gray-700 shadow-black/50',
    mute: active 
      ? 'bg-gradient-to-b from-red-500 to-red-600 shadow-red-500/50' 
      : 'bg-gradient-to-b from-gray-600 to-gray-700 shadow-black/50',
  };

  const sizes = {
    small: 'w-6 h-6 text-[8px]',
    medium: 'w-8 h-8 text-[9px]',
    large: 'w-10 h-10 text-[10px]'
  };

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`
        ${sizes[size]}
        ${variants[variant]}
        rounded-sm
        shadow-lg
        border border-gray-800/50
        font-mono font-bold uppercase
        text-gray-900
        transition-all duration-75
        ${isPressed ? 'translate-y-px shadow-md' : ''}
        hover:brightness-110
        active:translate-y-px active:shadow-md
      `}
    >
      {active && (
        <div className="absolute inset-0 rounded-sm shadow-inner shadow-white/30" />
      )}
      {label}
    </button>
  );
}