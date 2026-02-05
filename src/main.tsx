// --- SERVICE WORKER KILL-SWITCH ---
// This must run before anything else to purge legacy caches in browsers like Firefox.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('SW Killed - Forcing Refresh');
        window.location.reload();
      });
    }
  });
}

import { BrowserRouter } from 'react-router-dom'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './styles/global.css'
import './styles/mobile-view.css'
import App from './App.tsx'
import { db } from './services/db/indexeddb.service'
import { infoLog, errorLog } from './utils/logger';

// ... (existing code omitted) ...

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// --- Version-Based Cache Busting ---
// This ensures that when we push major UI or logic updates, 
// returning users get a fresh experience by clearing stale caches once.
// APP_VERSION is injected from package.json via vite.config.ts

async function checkAppVersion() {
  const storedVersion = localStorage.getItem('exo_app_version');

  if (storedVersion !== APP_VERSION) {
    infoLog('App', `🔄 New version detected (${APP_VERSION}). Clearing stale caches...`);

    try {
      // SURGICAL CLEAR: We only remove transient data that causes UI/Data bugs.
      // WE PRESERVE: savedBuilds (IndexedDB), settings (IndexedDB), and exo_virtual_loadouts (LocalStorage)

      // 1. Clear profile cache (internal transient state, e.g., cached inventory snapshots)
      // This DOES NOT touch 'savedBuilds' or 'settings' stores.
      await db.clearProfileCache();

      // 2. Clear manifest cache to ensure new item definitions apply correctly
      await db.clearManifest();

      // 3. Update version in storage
      localStorage.setItem('exo_app_version', APP_VERSION);

      // 4. Force a one-time reload to ensure all new assets are active
      window.location.reload();
    } catch (e) {
      errorLog('App', 'Failed to perform cache bust:', e);
    }
  }
}

// Initialize services
checkAppVersion().then(() => db.init()).then(async () => {

  // Service worker removed - ExoEngine requires Bungie API and cannot work offline
  // Unregister any existing service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister();
        infoLog('ServiceWorker', 'Service worker unregistered');
      }
    });
  }

  // Check online status
  const isOnline = navigator.onLine;

  if (isOnline) {
    // Initial sync attempt
    const { syncService } = await import('./services/bungie/sync.service');
    syncService.pullFromCloud().catch(err => errorLog('Sync', 'Initial pull failed:', err));
    syncService.startHeartbeat();


  }

  // Initialize analytics
  const { analyticsService } = await import('./services/analytics.service');
  await analyticsService.init();
});

// Listen for online/offline events
window.addEventListener('online', () => {
  import('./services/bungie/sync.service').then(({ syncService }) => {
    syncService.pullFromCloud().catch(err => errorLog('Sync', 'Online sync failed:', err));
  });
});

window.addEventListener('offline', () => {
});



