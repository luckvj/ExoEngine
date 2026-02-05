import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bungieApi } from '../services/bungie/api-client';
import { errorLog } from '../utils/logger';
import { profileService } from '../services/bungie/profile.service';
import { useAuthStore } from '../store';
import { db } from '../services/db/indexeddb.service';
import { syncManager } from '../services/bungie/sync-manager.service';
import './AuthCallbackPage.css';

// Module-level guard to prevent double execution in Strict Mode
let codeExchangeAttempted = false;

export function AuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setTokens, setAuthenticated, setLoading } = useAuthStore();
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('AUTHENTICATING...');

    // Parallax State (for consistency with CharacterSelect)
    const [parallax, setParallax] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (codeExchangeAttempted) return;

        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
            setError('No authorization code found in URL');
            return;
        }

        codeExchangeAttempted = true;

        async function exchangeCode() {
            try {
                setLoading(true);
                setStatus('AUTHENTICATING...');

                // CSRF Protection: Verify the state parameter matches what we stored before redirecting
                const savedState = await db.getOAuthState();

                if (state !== savedState) {
                    errorLog('Auth', 'CSRF: State mismatch', {
                        received: state,
                        saved: savedState,
                        origin: window.location.origin,
                        isDev: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    });
                    setError(`Security validation failed: State missing or mismatch. (Received: ${state ? 'YES' : 'NO'}, Saved: ${savedState ? 'YES' : 'NO'})`);
                    return;
                }

                // Security Hardening: Remove sensitive parameters from URL after successful check
                const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.replaceState({ path: newUrl }, '', newUrl);

                setStatus('VERIFYING...');
                const tokens = await bungieApi.exchangeCode(code!);

                setTokens({
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresAt: Date.now() + tokens.expiresIn * 1000,
                    membershipId: tokens.membershipId
                });
                setAuthenticated(true);

                setStatus('LOADING GUARDIAN...');
                // Fetch full membership details immediately for the UI
                const membership = await profileService.getPrimaryMembership();
                if (membership) useAuthStore.getState().setMembership(membership);

                setStatus('LOADING INVENTORY...');
                // CRITICAL: Trigger sync before navigating so the store is hydrated 
                // This prevents the "blank screen" after login
                await syncManager.refresh(true);

                setStatus('COMPLETE');
                // Artificial delay for UX "snap"
                await new Promise(r => setTimeout(r, 500));
                navigate('/');
            } catch (err: any) {
                errorLog('Auth', 'Token exchange failed:', err);

                // Friendly error for expired codes (common during dev/refresh)
                if (err.message && (err.message.includes('invalid_grant') || err.message.includes('AuthorizationCodeInvalid'))) {
                    setError('EXPIRED_CODE');
                } else {
                    setError(err instanceof Error ? err.message : 'Failed to authenticate');
                }
            } finally {
                setLoading(false);
            }
        }

        exchangeCode();
    }, [searchParams, navigate, setTokens, setAuthenticated, setLoading]);

    // OPTIMIZATION: Memoize parallax handler to prevent recreation
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;
        setParallax({ x, y });
    }, []);

    return (
        <div
            className="auth-callback-page"
            onMouseMove={handleMouseMove}
            style={{
                '--parallax-x': parallax.x,
                '--parallax-y': parallax.y
            } as any}
        >
            <div
                className="auth-callback-bg"
                style={{
                    transform: `translate(calc(${parallax.x * -20}px), calc(${parallax.y * -20}px)) scale(1.1)`
                }}
            ></div>

            <div className="auth-terminal">
                <div className={`auth-scanner ${error ? 'error' : ''}`}>
                    <div className="auth-scanner-circle">
                        <div className="auth-scanner-fill"></div>
                        <img
                            src="/logo_dsc.svg"
                            className={`auth-scanner-logo ${!error ? 'pulse' : ''}`}
                            alt=""
                        />
                    </div>
                </div>

                <div className="auth-info">
                    <h2 className="auth-title">
                        {error ? 'CONNECTION FAILED' : 'AUTHENTICATING...'}
                    </h2>
                    <p className={`auth-status-text ${error ? 'error' : ''}`}>
                        {error ? (error === 'EXPIRED_CODE' ? 'Auth session expired. Please restart.' : error) : status}
                    </p>
                </div>

                {error && (
                    <button
                        className="auth-btn-retry"
                        onClick={() => window.location.href = '/'}
                    >
                        RETRY CONNECTION
                    </button>
                )}
            </div>
        </div>
    );
}
