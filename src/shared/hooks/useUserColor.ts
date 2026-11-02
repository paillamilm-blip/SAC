// shared/hooks/useUserColor.ts
// ═══════════════════════════════════════════════════════════════════════
// useUserColor — Hook that returns the user's chosen accent color reactively.
// Reads from localStorage (set during onboarding via ColorPicker).
// Re-reads on mount and listens for storage events (cross-tab sync).
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { getUserColor } from '@/shared/services/userColor';

/**
 * Returns the user's selected color as a hex string (e.g. '#a0aec0').
 * Updates reactively if the color changes (storage event or custom event).
 */
export function useUserColor(): string {
  const [color, setColor] = useState<string>(getUserColor);

  useEffect(() => {
    // Listen for cross-tab storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'omicron_user_color') {
        setColor(getUserColor());
      }
    };

    // Listen for in-app color changes (dispatched when user picks a new color)
    const handleCustom = () => {
      setColor(getUserColor());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('omicron:color-changed', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('omicron:color-changed', handleCustom);
    };
  }, []);

  return color;
}
