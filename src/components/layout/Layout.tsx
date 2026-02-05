import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useProfileStore, useAuthStore, useManifestStore, useUIStore, useSettingsStore } from '../../store';
import { manifestService } from '../../services/bungie/manifest.service';
import { profileLoader } from '../../services/bungie/profile.service';
import { getBungieUrl } from '../../utils/url-helper';
import { ManifestSync } from '../common/ManifestSync';
import { IntroTransition } from './IntroTransition';
import { EmblemBanner } from '../builder/EmblemBanner';
import { ScreenTabs } from '../builder/ScreenTabs';
import { CustomCursor } from './CustomCursor';
import './Layout.css';

// --- Header Data Logic ---

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { introComplete, setIntroComplete, hideGlobalUI, globalTransmat } = useUIStore();
  const { isLoaded: manifestLoaded } = useManifestStore();
  const { deviceMode, setDeviceMode, customCursor } = useSettingsStore();
  const { isAuthenticated } = useAuthStore();

  // DIM Standard: Auto-sync on Landing and Visibility
  useEffect(() => {
    if (isAuthenticated) {
      // 1. Initial Load Sync
      profileLoader.loadProfile(true);

      // 2. Visibility Change Sync (Returning to tab)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          profileLoader.loadProfile(true);
        }
      };

      window.addEventListener('visibilitychange', handleVisibilityChange);
      return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [isAuthenticated]);

  // Auto-detect Device Mode
  useEffect(() => {
    const handleResize = () => {
      const mode = window.innerWidth <= 768 ? 'mobile' : 'pc';
      if (deviceMode !== mode) {
        setDeviceMode(mode);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [deviceMode, setDeviceMode]);

  const {
    selectedCharacterId,
    characters,
    currentGuardianRank,
    commendationScore,
    commendationNodeScores,
    commendationNodePercentages,
    artifactLevel,
    powerBonusXP,
    commendationsSent,
    commendationsReceived,
  } = useProfileStore();
  const { membership } = useAuthStore();

  const character = characters.find((c) => c.characterId === selectedCharacterId);

  const emblemDef = (character && manifestLoaded) ? manifestService.getItem(character.emblemHash) : undefined;
  const emblemBg = emblemDef?.secondarySpecial || character?.emblemBackgroundPath;
  const emblemOverlay = emblemDef?.secondaryOverlay;

  const guardianRankName = (currentGuardianRank && manifestLoaded)
    ? manifestService.getGuardianRankName(currentGuardianRank)
    : undefined;

  return (
    <div className={`layout mode-${deviceMode} ${customCursor ? 'custom-cursor' : ''}`}>
      {!introComplete && <IntroTransition onComplete={() => setIntroComplete(true)} />}

      <ManifestSync />
      <div className="bg-noise" />

      {/* Global Header */}
      <header className={`layout__header ${hideGlobalUI ? 'layout__header--hidden' : ''}`}>
        <div className="layout__identity">
          <EmblemBanner
            emblemBackgroundPath={getBungieUrl(emblemBg)}
            emblemOverlayPath={getBungieUrl(emblemOverlay)}
            displayName={membership?.bungieGlobalDisplayName || membership?.displayName || 'Guardian'}    
            guardianRank={currentGuardianRank || character?.guardianRank}
            guardianRankName={guardianRankName}
            commendationScore={commendationScore}
            commendationNodeScores={commendationNodeScores}
            commendationNodePercentages={commendationNodePercentages}
            artifactLevel={artifactLevel}
            powerBonusXP={powerBonusXP}
            powerLevel={character?.light}
            commendationsSent={commendationsSent}
            commendationsReceived={commendationsReceived}
            onEmblemClick={() => navigate('/')}
          >
            {/* Inject Navigation directly into Emblem Banner for shared layout context */}
            <ScreenTabs onGalaxyRefresh={() => {
              // Trigger galaxy refresh by dispatching custom event
              window.dispatchEvent(new CustomEvent('galaxy-refresh'));
            }} />
          </EmblemBanner>
        </div>
      </header>

      <div className="layout__main">
        <main className="layout__content">
          {children}
        </main>
      </div>

      {/* Global Transmat Overlay - Topmost element, rendered via Portal */}
      {globalTransmat && createPortal(
        <div className={`global-transmat-container global-transmat--${globalTransmat}`}>
          <div className="global-transmat-beam" />
          <div className="global-transmat-flash" />
        </div>,
        document.body
      )}

      <CustomCursor />
    </div>
  );
}