
import { useEffect, useState, useRef } from 'react';
import { debugLog } from '../utils/logger';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useProfileStore } from '../store';
import { bungieApi } from '../services/bungie/api-client';
import { BUNGIE_CONFIG } from '../config/bungie.config';
import { GuardianClass } from '../types';
import './CharacterSelectPage.css';

import { syncManager } from '../services/bungie/sync-manager.service';
import { Spinner } from '../components/common/Loader';
import { CharacterTooltip } from '../components/character/CharacterTooltip';
import MouseLeftIcon from '../assets/mouse-left-plain.png';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import titanLogo from '../assets/logos/titan.png';
import warlockLogo from '../assets/logos/warlock.png';
import hunterLogo from '../assets/logos/hunter.png';
import { NeuralLinkConnection } from '../components/login/NeuralLinkConnection';

import travelerSphere from '../assets/traveler-sphere.png';
import titanFull from '../assets/guardian-titan.png';
import hunterFull from '../assets/guardian-hunter.png';
import warlockFull from '../assets/guardian-warlock.png';

export function CharacterSelectPage() {
    const navigate = useNavigate();
    const { isAuthenticated, setAuthenticated } = useAuthStore();
    const { characters, setSelectedCharacter, isLoading: isProfileLoading } = useProfileStore();

    // UI State
    const [hoveredCharId, setHoveredCharId] = useState<string | null>(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [clanName, setClanName] = useState<string | null>(null);

    const membership = useAuthStore(state => state.membership);

    // State for cycling logos on the login screen
    const [loginLogoIndex, setLoginLogoIndex] = useState(0);
    const loginLogos = [titanLogo, hunterLogo, warlockLogo];

    // Parallax State
    const [parallax, setParallax] = useState({ x: 0, y: 0 });

    // Link Visuals
    const [isLoginHovered, setIsLoginHovered] = useState(false);
    const loginButtonRef = useRef<HTMLButtonElement>(null);
    const travelerRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        // Only cycle when not authenticated
        if (isAuthenticated) return;

        const interval = setInterval(() => {
            setLoginLogoIndex((prev) => (prev + 1) % loginLogos.length);
        }, 3000); // Cycle every 3 seconds

        return () => clearInterval(interval);
    }, [isAuthenticated]);

    useEffect(() => {
        // Check auth status on mount if not already done
        async function checkAuth() {
            if (!isAuthenticated) return;

            // Trigger a fresh sync ONLY if we don't have characters yet
            if (characters.length === 0) {
                debugLog('CharacterSelect', 'CharacterSelect mounted without data - triggering sync');
                await syncManager.refresh(true);
            }

            // Fetch clan info
            const { profileService } = await import('../services/bungie/profile.service');
            const clan = await profileService.getClanInfo();
            setClanName(clan);
        }
        checkAuth();
    }, [isAuthenticated]);

    const handleMouseMove = (e: React.MouseEvent) => {
        // Calculate normalized position from center (-0.5 to 0.5)
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;
        setParallax({ x, y });
    };

    const handleCharacterSelect = (characterId: string) => {
        setSelectedCharacter(characterId);
        navigate('/agent-wake');
    };

    const handleCharacterRightClick = (e: React.MouseEvent) => {
        debugLog('CharacterSelect', 'Character Card Right-Click');
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling to global
        setShowLogoutModal(true);
    };

    const handleLogoutConfirm = async () => {
        setShowLogoutModal(false);
        await bungieApi.logout();
        setAuthenticated(false);
        // Force reload or nav to clean state?
        window.location.reload();
    };



    const handleGlobalContextMenu = (e: React.MouseEvent) => {
        debugLog('CharacterSelect', 'Global Right-Click', { isAuthenticated });
        // If authenticated, right click anywhere to show logout
        if (isAuthenticated) {
            e.preventDefault();
            setShowLogoutModal(true);
        }
    };

    const handleLogin = async () => {
        const url = await bungieApi.getAuthorizationUrl();
        window.location.href = url;
    };

    const renderClassLogo = () => {
        if (!hoveredCharId) return null;
        const char = characters.find(c => c.characterId === hoveredCharId);
        if (!char) return null;

        let logoSrc = '';
        let classNamespace = '';
        switch (char.classType) {
            case GuardianClass.Titan:
                logoSrc = titanLogo;
                classNamespace = 'titan';
                break;
            case GuardianClass.Hunter:
                logoSrc = hunterLogo;
                classNamespace = 'hunter';
                break;
            case GuardianClass.Warlock:
                logoSrc = warlockLogo;
                classNamespace = 'warlock';
                break;
        }

        return <img src={logoSrc} className={`class-logo-image logo-${classNamespace}`} alt="" />;
    };

    const hoveredChar = characters.find(c => c.characterId === hoveredCharId);
    const hoveredClassType = hoveredChar?.classType;

    return (
        <div
            className="character-select-page"
            onMouseMove={handleMouseMove}
            onContextMenu={handleGlobalContextMenu}
            style={{
                '--parallax-x': parallax.x,
                '--parallax-y': parallax.y
            } as React.CSSProperties}
        >
            <div className="character-select-bg"></div>

            <div className="traveler-backdrop-container">
                <img ref={travelerRef} src={travelerSphere} className="traveler-sphere" alt="" />
                <div 
                    className="brand-logo-beside-traveler" 
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate('/credits');
                    }} 
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate('/credits');
                        }
                    }}
                >
                    <img src="/logo_favicon.svg" alt="ExoEngine" className="brand-logo-traveler" />
                </div>
                <div className="guardian-silhouette-layer">
                    <img src={warlockFull} className={`guardian-full warlock ${hoveredClassType === GuardianClass.Warlock ? 'visible' : ''}`} alt="" />
                    <img src={titanFull} className={`guardian-full titan ${hoveredClassType === GuardianClass.Titan ? 'visible' : ''}`} alt="" />
                    <img src={hunterFull} className={`guardian-full hunter ${hoveredClassType === GuardianClass.Hunter ? 'visible' : ''}`} alt="" />
                </div>
            </div>

            <div className={`class-logo-background ${hoveredCharId ? 'visible' : ''}`}>
                {renderClassLogo()}
            </div>

            <ConfirmationModal
                isOpen={showLogoutModal}
                title="LOGOUT?"
                message="Are you sure you would like to quit your current session and return to the login screen?"
                onConfirm={handleLogoutConfirm}
                onCancel={() => setShowLogoutModal(false)}
            />

            {!isAuthenticated && (
                <NeuralLinkConnection
                    isActive={isLoginHovered}
                    buttonRef={loginButtonRef}
                    travelerRef={travelerRef}
                />
            )}

            <div className="character-select-content">
                {!isAuthenticated ? (
                    <div className="login-container">
                        <div style={{ position: 'relative' }}>
                            <button
                                ref={loginButtonRef}
                                className={`btn-mega-login ${isLoginHovered ? 'hovered' : ''}`}
                                onClick={handleLogin}
                                onMouseEnter={() => setIsLoginHovered(true)}
                                onMouseLeave={() => setIsLoginHovered(false)}
                            >
                                <div className="btn-logo-container">
                                    <img
                                        src={loginLogos[loginLogoIndex]}
                                        className={`btn-logo cycling-logo cycling-logo-${loginLogoIndex}`}
                                        alt=""
                                        key={loginLogoIndex}
                                    />
                                </div>
                                <div className="btn-text-content">
                                    <span className="btn-main-text">ESTABLISH EXOMIND</span>
                                    <span className="btn-sub">Connect with Bungie.net</span>
                                </div>
                            </button>

                            {isLoginHovered && (
                                <div style={{
                                    position: 'absolute',
                                    right: '100%',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    marginRight: '30px',
                                    zIndex: 2000,
                                    pointerEvents: 'none'
                                }}>
                                    <div className="d2-tooltip">
                                        <div className="d2-tooltip-header">
                                            AUTHENTICATE
                                        </div>
                                        <div className="d2-tooltip-content">
                                            <div className="d2-tooltip-status">
                                                <span className="status-icon">♦</span> Connect with Bungie.net
                                            </div>
                                        </div>
                                        <div className="d2-tooltip-footer">
                                            <div className="footer-action">
                                                <img src={MouseLeftIcon} className="mouse-icon-img" alt="L" />
                                                <span>Login</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="character-list-container">
                        {membership && (
                            <div className="player-identity animate-fade-in">
                                <div className="player-bungie-name">
                                    {membership.bungieGlobalDisplayName}
                                    <span className="player-hash">#{membership.bungieGlobalDisplayNameCode.toString().padStart(4, '0')}</span>
                                </div>
                                {clanName && (
                                    <div className="player-clan">CLAN // {clanName.toUpperCase()}</div>
                                )}
                            </div>
                        )}

                        {isProfileLoading && characters.length === 0 ? (
                            <div style={{ marginTop: '2rem' }}><Spinner size="lg" /></div>
                        ) : (
                            <div className="character-list">
                                {characters.map((char) => (
                                    <div className="character-card-wrapper" key={char.characterId} style={{ position: 'relative' }}>
                                        <div
                                            className="character-card"
                                            onClick={() => handleCharacterSelect(char.characterId)}
                                            onContextMenu={(e) => handleCharacterRightClick(e)}
                                            onMouseEnter={() => setHoveredCharId(char.characterId)}
                                            onMouseLeave={() => setHoveredCharId(null)}
                                            style={{
                                                '--emblem-bg': `url(${BUNGIE_CONFIG.bungieNetOrigin}${char.emblemBackgroundPath})`
                                            } as React.CSSProperties}
                                        >
                                            <div className="character-card-bg"></div>
                                            <div className="character-card-content">
                                                <div className="character-details">
                                                    <div className="character-class-name">{getClassName(char.classType)}</div>
                                                    <div className="character-race">{getRaceName(char.raceType)} / {getGenderName(char.genderType).toUpperCase()}</div>
                                                </div>
                                                <div className="character-light">
                                                    <span className="light-symbol">◇</span>
                                                    {char.light}
                                                </div>
                                            </div>
                                        </div>

                                        {hoveredCharId === char.characterId && (
                                            <div style={{
                                                position: 'absolute',
                                                right: '102%',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                zIndex: 2000,
                                                pointerEvents: 'none'
                                            }}>
                                                <CharacterTooltip />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Legal Disclaimer Footer */}
            {!isAuthenticated && (
                <div className="legal-footer-disclaimer animate-fade-in">
                    <p><strong>ExoEngine™</strong> is an independent API project by Vj (@Unluckvj). Not affiliated with Bungie, Inc.</p>
                    <p>Destiny 2 content and materials are trademarks and copyrights of Bungie, Inc. All rights reserved.</p>
                    <div className="legal-links">
                        <a href="/credits">Credits</a>
                        <span className="separator">•</span>
                        <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Use</a>
                        <span className="separator">•</span>
                        <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helpers
function getClassName(type: GuardianClass): string {
    switch (type) {
        case GuardianClass.Titan: return 'TITAN';
        case GuardianClass.Hunter: return 'HUNTER';
        case GuardianClass.Warlock: return 'WARLOCK';
        default: return 'UNKNOWN';
    }
}



function getRaceName(type: number): string {
    switch (type) {
        case 0: return 'Human';
        case 1: return 'Awoken';
        case 2: return 'Exo';
        default: return 'Unknown';
    }
}

function getGenderName(type: number): string {
    switch (type) {
        case 0: return 'Male';
        case 1: return 'Female';
        default: return '';
    }
}
