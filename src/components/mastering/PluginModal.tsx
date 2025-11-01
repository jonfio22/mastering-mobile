/**
 * @fileoverview Base modal overlay component for full-screen plugin display
 * @module components/mastering/PluginModal
 * @description Provides full-screen modal overlay with backdrop for plugin interfaces
 */

import React, { useEffect } from 'react';

interface PluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * PluginModal Component
 *
 * Full-screen modal overlay for plugin interfaces
 * - Dark backdrop (80% opacity)
 * - Centered content area
 * - Click-outside-to-close
 * - ESC key handler
 * - Smooth fade-in/slide-up animation
 */
export default function PluginModal({ isOpen, onClose, children }: PluginModalProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="w-full h-full md:max-w-5xl md:max-h-[90vh] md:h-auto md:rounded-lg overflow-hidden shadow-2xl animate-slideUp">
        {children}
      </div>
    </div>
  );
}
