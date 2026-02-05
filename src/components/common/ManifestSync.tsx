import React from 'react';
import { useManifestStore } from '../../store';
import './ManifestSync.css';

export const ManifestSync: React.FC = () => {
    const { isLoaded, isLoading, loadingProgress, error } = useManifestStore();

    if (isLoaded || (!isLoading && !error)) return null;

    return (
        <div className="manifest-sync-overlay">
            <div className="sync-terminal">
                <div className={`sync-scanner-container ${error ? 'error' : ''}`}>
                    <div className="sync-scanner-circle">
                        <div className="sync-scanner-fill"></div>
                        {/* We use a ring that fills based on percentage */}
                        <svg className="sync-progress-ring" viewBox="0 0 100 100">
                            <circle
                                className="sync-progress-ring-bg"
                                cx="50" cy="50" r="48"
                            />
                            <circle
                                className="sync-progress-ring-fill"
                                cx="50" cy="50" r="48"
                                style={{ strokeDashoffset: 301.59 - (301.59 * (loadingProgress / 100)) }}
                            />
                        </svg>
                        <img
                            src="/logo_dsc.svg"
                            className={`sync-scanner-logo ${isLoading && !error ? 'pulse' : ''}`}
                            alt=""
                        />
                    </div>
                </div>

                <div className="sync-info">
                    <div className="sync-status-container">
                        <p className={`sync-status-text ${error ? 'error' : ''}`}>
                            {error ? 'Connection Failed' : 'Loading'}
                        </p>
                    </div>
                </div>

                {error && (
                    <button className="sync-btn-retry" onClick={() => window.location.reload()}>
                        RE-INITIALIZE UPLINK
                    </button>
                )}

            </div>
        </div>
    );
};
