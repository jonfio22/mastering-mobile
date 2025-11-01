import React, { useState } from 'react';

interface VerticalFaderProps {
  label: string;
  value?: number;
  onChange: (value: number) => void;
  height?: string;
}

export default function VerticalFader({
  label,
  value = 0,
  onChange,
  height = 'h-32'
}: VerticalFaderProps) {
  const [currentValue, setCurrentValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setCurrentValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Fader track */}
        <div className={`w-6 ${height} bg-gradient-to-b from-gray-900 to-gray-800 rounded-sm shadow-inner border border-gray-700`}>
          {/* Scale marks */}
          <div className="absolute inset-y-0 left-0 w-full">
            {[0, 25, 50, 75, 100].map((mark) => (
              <div
                key={mark}
                className="absolute left-0 w-1 h-px bg-gray-600"
                style={{ top: `${100 - mark}%` }}
              />
            ))}
          </div>
          
          {/* Fader handle */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-8 h-6 bg-gradient-to-b from-gray-300 via-gray-200 to-gray-400 rounded-sm shadow-lg border border-gray-500 cursor-pointer transition-all hover:shadow-xl"
            style={{ 
              top: `${100 - currentValue}%`,
              transform: 'translateX(-50%) translateY(-50%)'
            }}
          >
            {/* Handle grip lines */}
            <div className="flex flex-col items-center justify-center h-full gap-px">
              <div className="w-4 h-px bg-gray-500" />
              <div className="w-4 h-px bg-gray-500" />
              <div className="w-4 h-px bg-gray-500" />
            </div>
          </div>
        </div>

        {/* Invisible range input */}
        <input
          type="range"
          min="0"
          max="100"
          value={currentValue}
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          style={{ writingMode: 'vertical-lr' as React.CSSProperties['writingMode'], WebkitAppearance: 'slider-vertical' }}
        />
      </div>

      {label && (
        <span className="text-[9px] md:text-[11px] text-gray-300 font-mono uppercase">
          {label}
        </span>
      )}
    </div>
  );
}