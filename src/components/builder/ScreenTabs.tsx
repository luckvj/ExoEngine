import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import './ScreenTabs.css';

interface ScreenTabsProps {
    onGalaxyRefresh?: () => void;
}

const TABS = [
    { label: 'ExoMind', path: '/agent-wake' },
    { label: 'Builds', path: '/builds' },
    { label: 'Galaxy', path: '/galaxy' },
    { label: 'Settings', path: '/settings' }
];

export function ScreenTabs({ onGalaxyRefresh }: ScreenTabsProps) {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine active index based on current path
    const activeIndex = TABS.findIndex(t => location.pathname.startsWith(t.path));

    const handleNavigate = (index: number) => {
        const targetIndex = (index + TABS.length) % TABS.length;
        navigate(TABS[targetIndex].path);
    };

    const handleTabClick = (path: string) => {
        // If clicking on Galaxy tab while already on Galaxy page, call reset function
        if (path === '/galaxy' && location.pathname.startsWith('/galaxy')) {
            if (onGalaxyRefresh) {
                onGalaxyRefresh();
            }
        } else {
            navigate(path);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                handleNavigate(activeIndex - 1);
            } else if (e.key === 'ArrowRight') {
                handleNavigate(activeIndex + 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex, handleNavigate]);

    return (
        <div className="screen-tabs-container">
            <div className="screen-tabs">
                <button
                    className="screen-tabs__arrow-button"
                    onClick={() => handleNavigate(activeIndex - 1)}
                    aria-label="Previous Tab"
                >
                    <span className="arrow-key">←</span>
                </button>

                <div className="screen-tabs__list">
                    {TABS.map((tab, idx) => (
                        <button
                            key={tab.label}
                            className={`screen-tab ${activeIndex === idx ? 'is-active' : ''}`}
                            onClick={() => handleTabClick(tab.path)}
                        >
                            <span className="screen-tab__label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <button
                    className="screen-tabs__arrow-button"
                    onClick={() => handleNavigate(activeIndex + 1)}
                    aria-label="Next Tab"
                >
                    <span className="arrow-key">→</span>
                </button>
            </div>
        </div>
    );
}
