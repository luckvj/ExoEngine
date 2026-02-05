import { useProfileStore, useAuthStore, useManifestStore } from '../store';
import { manifestService } from '../services/bungie/manifest.service';
import { EmblemBanner } from '../components/builder/EmblemBanner';
import { getBungieUrl } from '../utils/url-helper';
import './CreditsPage.css';

const CreditsPage = () => {
    const {
        characters,
        selectedCharacterId,
        currentGuardianRank,
        commendationScore,
        commendationsReceived,
        commendationsSent,
        commendationNodeScores,
        commendationNodePercentages,
        artifactLevel,
        powerBonusXP
    } = useProfileStore();
    const { isAuthenticated, membership } = useAuthStore();
    const { isLoaded: manifestLoaded } = useManifestStore();

    const character = characters.find(c => c.characterId === selectedCharacterId) || characters[0];
    // Use the emblemBackgroundPath directly (same as character selection screen)
    const emblemBg = character?.emblemBackgroundPath;
    const emblemOverlay = character?.emblemPath;  // Use emblemPath for the icon overlay

    const guardianRankName = (currentGuardianRank && manifestLoaded)
        ? manifestService.getGuardianRankName(currentGuardianRank)
        : undefined;

    // Vj's Creator Identity (Fallback when not logged in)
    const creatorData = {
        backgroundPath: '/common/destiny2_content/icons/c612ec23a7f3b57042cb988788ef37a8.jpg',
        iconPath: '/common/destiny2_content/icons/5f3614bd64c0668febb1ff1ae3d1632b.jpg',
        displayName: 'Vj',
        guardianRank: 11,
        guardianRankName: 'Paragon',
        powerLevel: 2026,
        commendationScore: 420,
        commendationsReceived: 842,
        commendationsSent: 915,
        commendationNodeScores: {
            '154475713': 3180,   // Ally
            '1341823550': 3410,  // Mastery
            '1390663518': 3200,  // Fun
            '4180748446': 2660   // Leadership
        }
    };

    return (
        <div className="credits-page">
            <div className="credits-container">
                {/* Hero Section with Logo */}
                <section className="credits-hero">
                    <div className="credits-hero-logo">
                        <a href="/" className="credits-logo-link">
                            <img src="/logo_dsc.svg" alt="ExoEngine" className="credits-logo" />
                        </a>
                    </div>
                </section>

                {/* Creator Section with Playercard Emblem */}
                <section className="credits-creator">
                    <h2 className="section-title">Created By</h2>
                    <div className="creator-card">
                        {/* Creator/User Playercard */}
                        <div className={`creator-playercard-container ${isAuthenticated ? 'creator-playercard-container--authenticated' : ''}`}>
                            <EmblemBanner
                                emblemBackgroundPath={isAuthenticated ? getBungieUrl(emblemBg) : getBungieUrl(creatorData.backgroundPath)}
                                emblemOverlayPath={isAuthenticated ? getBungieUrl(emblemOverlay) : getBungieUrl(creatorData.iconPath)}
                                displayName={isAuthenticated ? (membership?.bungieGlobalDisplayName || 'Guardian') : creatorData.displayName}
                                guardianRank={isAuthenticated ? currentGuardianRank : creatorData.guardianRank}
                                guardianRankName={isAuthenticated ? guardianRankName : creatorData.guardianRankName}
                                commendationScore={isAuthenticated ? commendationScore : creatorData.commendationScore}
                                commendationNodeScores={isAuthenticated ? commendationNodeScores : creatorData.commendationNodeScores}
                                commendationNodePercentages={isAuthenticated ? commendationNodePercentages : undefined}
                                artifactLevel={isAuthenticated ? artifactLevel : undefined}
                                powerBonusXP={isAuthenticated ? powerBonusXP : undefined}
                                powerLevel={isAuthenticated ? character?.light : creatorData.powerLevel}
                                commendationsSent={isAuthenticated ? commendationsSent : creatorData.commendationsSent}
                                commendationsReceived={isAuthenticated ? commendationsReceived : creatorData.commendationsReceived}
                            />
                        </div>
                        <div className="creator-info">
                            <h3 className="creator-name">Vj</h3>
                            <p className="creator-handle">@Unluckvj</p>
                            <p className="creator-role">Lead Developer & Systems Architect</p>
                            <div className="creator-links">
                                <a
                                    href="https://unluckvj.xyz/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="creator-link"
                                >
                                    unluckvj.xyz
                                </a>
                                <a
                                    href="https://ko-fi.com/unluckvj"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="creator-link creator-link-support"
                                >
                                    Support on Ko-fi
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Acknowledgments */}
                <section className="credits-acknowledgments">
                    <h2 className="section-title">Built With</h2>
                    <div className="acknowledgment-grid">
                        <div className="acknowledgment-item">
                            <h3>Bungie</h3>
                            <p>Destiny 2 API & Manifest</p>
                        </div>
                        <div className="acknowledgment-item">
                            <h3>Destiny Item Manager</h3>
                            <p>Open source inspiration & standards</p>
                        </div>
                        <div className="acknowledgment-item">
                            <h3>Light.gg</h3>
                            <p>Item database & metadata</p>
                        </div>
                        <div className="acknowledgment-item">
                            <h3>Community Theorycrafters</h3>
                            <p>Data mining & synergy research</p>
                        </div>
                    </div>
                </section>

                {/* Community */}
                <section className="credits-community">
                    <h2 className="section-title">Community</h2>
                    <div className="community-grid">
                        <div className="community-item">
                            <h3>r/DestinyTheGame</h3>
                            <p>Build discussions & discoveries</p>
                        </div>
                        <div className="community-item">
                            <h3>r/destiny2builds</h3>
                            <p>Community build templates</p>
                        </div>
                        <div className="community-item">
                            <h3>Content Creators</h3>
                            <p>Build guides & gameplay</p>
                        </div>
                        <div className="community-item">
                            <h3>All Guardians</h3>
                            <p>Sharing builds & knowledge</p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="credits-footer">
                    <p className="credits-copyright">© 2026 ExoEngine. All rights reserved.</p>
                    <p className="credits-disclaimer">
                        Destiny 2 and all related trademarks are property of Bungie, Inc.
                        <br />
                        This application is not affiliated with or endorsed by Bungie, Inc.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default CreditsPage;
