/**
 * @fileoverview Base layout component for all plugin interfaces
 * @module components/mastering/plugins/PluginBase
 * @description Provides consistent layout structure with header, waveform, controls, and footer
 */

import React from 'react';
import PluginFooter from './PluginFooter';
import type { PluginType } from '@/lib/types/plugin.types';

interface PluginBaseProps {
  title: string;
  pluginType: PluginType;
  bypassed: boolean;
  onClose: () => void;
  onBypassToggle: () => void;
  onReset: () => void;
  children: React.ReactNode;
}

/**
 * PluginBase Component
 *
 * Base component providing consistent layout for all plugins:
 * - Header section with plugin title and close button
 * - Main controls section (children - plugin-specific controls)
 * - Footer section with bypass, reset, and A/B buttons
 */
export default function PluginBase({
  title,
  pluginType,
  bypassed,
  onClose,
  onBypassToggle,
  onReset,
  children,
}: PluginBaseProps) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur">
        <h2 className="text-lg md:text-xl font-bold tracking-[0.2em] text-emerald-400 uppercase">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-gradient-to-b from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 transition-all text-gray-200 text-xs font-bold tracking-widest shadow-lg border border-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Plugin-specific controls (children) */}
      <div className="flex-1 overflow-auto p-6 bg-gradient-to-b from-transparent to-gray-900/20">
        {bypassed && (
          <div className="mb-4 p-3 bg-red-900/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center backdrop-blur">
            ⚠️ Plugin Bypassed - Enable to hear changes
          </div>
        )}
        {children}
      </div>

      {/* Footer */}
      <PluginFooter
        pluginType={pluginType}
        bypassed={bypassed}
        onBypassToggle={onBypassToggle}
        onReset={onReset}
      />

      {/* Decorative screws in corners */}
      {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map(
        (pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-2 h-2 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 shadow-lg`}
          >
            <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-gray-700 to-gray-900">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-px bg-gray-600 rotate-45" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-0.5 bg-gray-600 rotate-45" />
            </div>
          </div>
        )
      )}
    </div>
  );
}
