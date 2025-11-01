import React, { useState, useRef, useEffect } from 'react';

interface RotaryKnobProps {
  label?: string;
  value?: number;
  onChange?: (value: number) => void;
  onDoubleClick?: () => void;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: 'burgundy' | 'default' | 'blue';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
}

export default function RotaryKnob({
  label,
  value = 50,
  onChange,
  onDoubleClick: onDoubleClickProp,
  size = 'medium',
  color = 'burgundy',
  min = 0,
  max = 100,
  step = 0.1,
  unit = '',
  defaultValue = 50
}: RotaryKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [draggingMode, setDraggingMode] = useState<'normal' | 'fine' | 'ultra-fine'>('normal');
  const startYRef = useRef(0);
  const startValueRef = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef(0);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Add global mouse move listener for smooth dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (e: MouseEvent) => {
      handleMove(e.clientY, e.shiftKey, e.altKey);
    };

    const handleGlobalUp = () => {
      setIsDragging(false);
      setDraggingMode('normal');
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [isDragging, startYRef, startValueRef, min, max, step, draggingMode]);

  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-24 h-24'
  };

  // Calculate position value (0-1) from actual value
  const normalizeValue = (val: number): number => {
    return (val - min) / (max - min);
  };

  // Calculate actual value from position
  const denormalizeValue = (position: number): number => {
    const rawValue = min + position * (max - min);
    return Math.round(rawValue / step) * step;
  };

  const handleStart = (clientY: number, shiftKey: boolean, altKey: boolean) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startValueRef.current = currentValue;

    // Determine dragging mode based on modifier keys
    if (altKey) {
      setDraggingMode('ultra-fine');
    } else if (shiftKey) {
      setDraggingMode('fine');
    } else {
      setDraggingMode('normal');
    }
  };

  const handleMove = (clientY: number, shiftKey?: boolean, altKey?: boolean) => {
    if (!isDragging) return;

    // Determine current mode if not set by handleStart
    let mode = draggingMode;
    if (altKey) mode = 'ultra-fine';
    else if (shiftKey) mode = 'fine';

    // Calculate sensitivity based on mode
    const baseSensitivity = 1; // Reduced from 3
    const sensitivity = mode === 'ultra-fine' ? baseSensitivity * 0.1 : mode === 'fine' ? baseSensitivity * 0.5 : baseSensitivity;

    // Invert direction: dragging UP increases value (negative delta becomes positive)
    const delta = (clientY - startYRef.current) * sensitivity * -1;
    const range = max - min;
    const newValue = Math.max(min, Math.min(max, startValueRef.current + delta));

    // Round to step precision
    const roundedValue = Math.round(newValue / step) * step;
    setCurrentValue(roundedValue);
    onChange?.(roundedValue);
  };

  const handleEnd = () => {
    setIsDragging(false);
    setDraggingMode('normal');
  };

  const handleDoubleClick = () => {
    const now = Date.now();
    const isDoubleClick = now - lastClickTimeRef.current < 300;
    lastClickTimeRef.current = now;

    if (!isDoubleClick) {
      // First click - schedule reset check
      if (doubleClickTimeoutRef.current) {
        clearTimeout(doubleClickTimeoutRef.current);
      }
      doubleClickTimeoutRef.current = setTimeout(() => {
        // Single click detected - open edit mode
        setIsEditing(true);
        setEditValue(currentValue.toFixed(step < 1 ? 2 : 1));
      }, 300);
      return;
    }

    // Double click detected - reset to default
    if (doubleClickTimeoutRef.current) {
      clearTimeout(doubleClickTimeoutRef.current);
      doubleClickTimeoutRef.current = null;
    }

    setCurrentValue(defaultValue);
    onChange?.(defaultValue);

    // Call custom handler if provided
    if (onDoubleClickProp) {
      onDoubleClickProp();
    }
  };

  const handleEditSubmit = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      // Use actual min/max for clamping, not 0-100
      const clamped = Math.max(min, Math.min(max, parsed));
      // Round to step precision
      const roundedValue = Math.round(clamped / step) * step;
      setCurrentValue(roundedValue);
      onChange?.(roundedValue);
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // Calculate rotation: normalize value to 0-1, then to rotation angle
  const normalizedPosition = normalizeValue(currentValue);
  const rotation = normalizedPosition * 270 - 135;

  // Format display value based on step size
  const displayValue = step < 1 ? currentValue.toFixed(2) : currentValue.toFixed(0);

  return (
    <div className="flex flex-col items-center gap-2">
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditSubmit}
          onKeyDown={handleEditKeyDown}
          className="w-24 px-2 py-1 text-center bg-gray-900 border border-emerald-500 rounded text-emerald-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          step={step}
          min={min}
          max={max}
        />
      ) : (
        <div
          ref={containerRef}
          className={`${sizeClasses[size]} relative cursor-grab active:cursor-grabbing select-none hover:scale-105 transition-transform`}
          onMouseDown={(e) => handleStart(e.clientY, e.shiftKey, e.altKey)}
          onTouchStart={(e) => handleStart(e.touches[0].clientY, false, false)}
          onTouchMove={(e) => handleMove(e.touches[0].clientY)}
          onTouchEnd={handleEnd}
          onDoubleClick={handleDoubleClick}
          title="Drag to adjust (Shift for fine control, Alt for ultra-fine) • Double-click to reset"
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
      )}

      {/* Display current value with unit */}
      <div className="text-center">
        <div className="text-[10px] md:text-xs text-emerald-400 font-mono font-semibold">
          {displayValue}{unit}
        </div>
        {label && (
          <div className="text-[8px] md:text-[10px] text-gray-400 font-mono uppercase tracking-wider mt-0.5">
            {label}
          </div>
        )}
      </div>

      {/* Dragging mode indicator */}
      {isDragging && draggingMode !== 'normal' && (
        <div className="text-[8px] text-yellow-400 font-mono">
          {draggingMode === 'fine' ? '(Fine)' : '(Ultra-Fine)'}
        </div>
      )}
    </div>
  );
}