// Theme Hook - Apply theme, image size, and view mode settings to document root
import { useEffect } from 'react';
import { useSettingsStore } from '../store';

export function useTheme() {
  const { imageSize, viewMode, deviceMode } = useSettingsStore();
  const darkMode = true; // Temporary fix if darkMode is not in store

  useEffect(() => {
    const root = document.documentElement;

    // Apply theme
    if (darkMode) {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-image-size', imageSize.toString());
  }, [imageSize]);

  useEffect(() => {
    const root = document.documentElement;

    // Apply view mode
    root.setAttribute('data-view-mode', viewMode);
    root.setAttribute('data-device-mode', deviceMode);

    // Add mobile class to body for easier styling
    if (deviceMode === 'mobile') {
      document.body.classList.add('mobile-view');
      document.body.classList.remove('pc-view');
    } else {
      document.body.classList.add('pc-view');
      document.body.classList.remove('mobile-view');
    }
  }, [viewMode, deviceMode]);
}