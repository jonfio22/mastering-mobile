/**
 * @fileoverview Reusable footer for plugin interfaces
 * @module components/mastering/plugins/PluginFooter
 * @description Provides bypass, reset, and A/B comparison buttons
 */

import React from 'react';
import HardwareButton from '../HardwareButton';
import type { PluginType } from '@/lib/types/plugin.types';

interface PluginFooterProps {
  pluginType: PluginType;
  bypassed: boolean;
  onBypassToggle: () => void;
  onReset: () => void;
}

/**
 * PluginFooter Component
 *
 * Reusable footer with standard plugin actions:
 * - BYPASS: Toggle plugin on/off
 * - RESET: Reset parameters to defaults
 * - A/B: Quick comparison (dry/wet toggle)
 */
export default function PluginFooter({
  pluginType,
  bypassed,
  onBypassToggle,
  onReset,
}: PluginFooterProps) {
  const handleReset = () => {
    if (confirm('Reset all parameters to default values?')) {
      onReset();
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-gray-900/50 border-t-2 border-gray-700">
      <HardwareButton
        label="BYPASS"
        active={bypassed}
        onClick={onBypassToggle}
        variant={bypassed ? 'mute' : 'default'}
        size="medium"
      />

      <HardwareButton
        label="RESET"
        onClick={handleReset}
        variant="default"
        size="medium"
      />

      <div className="text-[8px] text-gray-500 font-mono">
        {pluginType.toUpperCase()}
      </div>
    </div>
  );
}
