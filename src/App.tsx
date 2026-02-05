import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthInitializer } from './components/common/AuthInitializer';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { useTheme } from './hooks/useTheme';
import { Loader } from './components/common/Loader';

// Eager load critical pages (shown immediately on auth)
import { CharacterSelectPage } from './pages/CharacterSelectPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

// Lazy load all other pages for better initial load
const BuilderPage = lazy(() => import('./pages/BuilderPage'));
const LoadoutVaultPage = lazy(() => import('./pages/LoadoutVaultPage'));
const GeneratorPage = lazy(() => import('./pages/GeneratorPage'));
const AgentWakePage = lazy(() => import('./pages/AgentWakePage'));
const LoadoutViewerPage = lazy(() => import('./pages/LoadoutViewerPage'));
const DIMLoadoutViewerPage = lazy(() => import('./pages/DIMLoadoutViewerPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SavedBuildsPage = lazy(() => import('./pages/SavedBuildsPage'));
const CreditsPage = lazy(() => import('./pages/CreditsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfUsePage = lazy(() => import('./pages/TermsOfUsePage'));

import { ToastContainer } from './components/common/Toast';
import { BungieMaintenanceModal } from './components/common/BungieMaintenanceModal';
import { syncManager } from './services/bungie/sync-manager.service';
import { bungieApi } from './services/bungie/api-client';
import { useAuthStore, useProfileStore } from './store';
import { warnLog } from './utils/logger';
import './App.css';



function App() {
  const { setAuthenticated } = useAuthStore();
  const location = useLocation();

  // Apply theme and image size settings
  useTheme();

  // Session Persistence & Hydration Check
  useEffect(() => {
    // Initialize Sync Manager
    syncManager.init();

    // Register Global Auth Failure Handler (Redirect to Home on 401/Invalid Tokens)
    bungieApi.setAuthFailureHandler(() => {
      warnLog('App', '🔐 Global auth failure detected - Redirecting to home');
      useAuthStore.getState().logout();
    });

    // Register Maintenance Handler
    bungieApi.setMaintenanceHandler((isMaintenance) => {
      useAuthStore.getState().setMaintenance(isMaintenance);
    });

    const restoreSession = async () => {
      // 1. Fast-Follow: Hydrate from IDB immediately
      useProfileStore.getState().hydrateFromCache();

      // Don't interfere with auth callback flow
      if (location.pathname.startsWith('/auth/callback')) return;

      const isAuthenticated = await bungieApi.isAuthenticated();
      if (isAuthenticated) {
        setAuthenticated(true);
      }
    };
    restoreSession();
  }, [setAuthenticated]);

  return (
    <ErrorBoundary>
      <AuthInitializer>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<CharacterSelectPage />} />

            {/* Protected Routes wrapped in Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout><Outlet /></Layout>}>
                <Route path="/agent-wake" element={<AgentWakePage />} />
                <Route path="/dim-loadout" element={<DIMLoadoutViewerPage />} />
                <Route path="/galaxy" element={<BuilderPage />} />
                <Route path="/builds" element={<LoadoutVaultPage />} />
                <Route path="/optimizer" element={<LoadoutVaultPage />} /> {/* Legacy redirect */}
                <Route path="/generator" element={<GeneratorPage />} />
                <Route path="/loadout/:encodedData" element={<LoadoutViewerPage />} />
                <Route path="/saved-builds" element={<SavedBuildsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/credits" element={<CreditsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfUsePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <ToastContainer />
        <BungieMaintenanceModal />
      </AuthInitializer>
    </ErrorBoundary>
  );
}

export default App;
