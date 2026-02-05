
import { useEffect } from 'react';
import { useProfileStore, useAuthStore, useManifestStore, useToastStore } from '../../store';
import { manifestService } from '../../services/bungie/manifest.service';
import { profileService, profileLoader } from '../../services/bungie/profile.service';
import { bungieApi } from '../../services/bungie/api-client';
import { LoadingScreen } from './Loader';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
    const manifestLoaded = useManifestStore(state => state.isLoaded);
    const manifestLoading = useManifestStore(state => state.isLoading);
    const manifestError = useManifestStore(state => state.error);
    const setManifestLoaded = useManifestStore(state => state.setLoaded);
    const setManifestProgress = useManifestStore(state => state.setProgress);
    const setManifestError = useManifestStore(state => state.setError);
    const setManifestLoading = useManifestStore(state => state.setLoading);

    const setAuthenticated = useAuthStore(state => state.setAuthenticated);
    const setAuthLoading = useAuthStore(state => state.setLoading);
    const setMembership = useAuthStore(state => state.setMembership);

    const setCharacters = useProfileStore(state => state.setCharacters);
    const setInventories = useProfileStore(state => state.setInventories);

    const addToast = useToastStore(state => state.addToast);

    // Load Manifest and then Auth/Profile sequence
    useEffect(() => {
        let isCancelled = false;

        async function initialize() {
            // 1. Load Manifest first if not already loaded
            if (!manifestLoaded) {
                try {
                    setManifestLoading(true);
                    await manifestService.load((table, progress) => {
                        if (!isCancelled) setManifestProgress(progress, table);
                    });
                    if (!isCancelled) setManifestLoaded(true);
                } catch (err) {
                    if (!isCancelled) {
                        setManifestError('Failed to load Destiny 2 manifest.');
                        addToast({
                            message: 'Manifest download failed. Check your connection.',
                            type: 'error'
                        });
                    }
                    return;
                } finally {
                    if (!isCancelled) setManifestLoading(false);
                }
            }

            // 2. Restore Auth sequence
            // Run either if manifest was already loaded OR we just finished loading it (and not cancelled)
            if (manifestLoaded || !isCancelled) {
                // If it was already running and got cancelled by a re-render during manifest load,
                // the new render's effect will catch this branch.
                setAuthLoading(true);
                try {
                    const isAuth = await bungieApi.isAuthenticated();
                    if (isCancelled) return;
                    setAuthenticated(isAuth);

                    if (isAuth) {
                        const membership = await profileService.getPrimaryMembership();
                        if (isCancelled) return;
                        if (membership) {
                            setMembership(membership);
                            // Load profile data
                            await profileLoader.loadProfile();
                            profileLoader.startAutoRefresh();
                        }
                    }
                } catch (err) {
                    if (!isCancelled) setAuthenticated(false);
                } finally {
                    if (!isCancelled) setAuthLoading(false);
                }
            }
        }

        initialize();

        return () => {
            isCancelled = true;
            profileLoader.stopAutoRefresh();
        };
    }, [manifestLoaded, setManifestLoaded, setManifestProgress, setManifestError, setManifestLoading, addToast, setAuthenticated, setAuthLoading, setMembership, setInventories, setCharacters]);

    // OPTIMIZATION: Show loading screen while manifest is downloading
    if (manifestLoading && !manifestLoaded) {
        return <LoadingScreen message="Downloading Manifest..." />;
    }

    // Show error state if manifest failed to load
    if (manifestError) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                gap: 'var(--space-md)',
                padding: 'var(--space-xl)'
            }}>
                <h2 style={{ color: 'var(--text-error)' }}>Failed to Load Game Data</h2>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{manifestError}</p>
                <button
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </button>
            </div>
        );
    }

    return <>{children}</>;
}
