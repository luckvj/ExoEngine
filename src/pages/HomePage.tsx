// Home Page - Dashboard
import { useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useProfileStore, useManifestStore, useToastStore } from '../store';
import { GlassCard } from '../components/common/GlassCard';
import { bungieApi } from '../services/bungie/api-client';
import { ElementType, type DestinyCharacter } from '../types';
import { profileService } from '../services/bungie/profile.service';
import { errorLog } from '../utils/logger';
import MouseLeftIcon from '../assets/mouse-left-plain.png';
import './HomePage.css';
import { SimpleTooltip } from '../components/common/SimpleTooltip';

export function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const { characters, setCharacters, setInventories, setLoading: setProfileLoading } = useProfileStore();
  const { isLoaded: manifestLoaded } = useManifestStore();
  const { addToast } = useToastStore();

  // OPTIMIZATION: Load profile on mount - simplified dependencies
  useEffect(() => {
    if (!isAuthenticated || characters.length > 0) return;

    async function initializeProfile() {
      try {
        setProfileLoading(true);
        const profileData = await profileService.getProfile();
        if (profileData) {
          // Transform characters
          if (profileData.characters?.data) {
            const chars = Object.values(profileData.characters.data);
            // Sort by last played
            chars.sort((a, b) => new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime());
            setCharacters(chars as unknown as DestinyCharacter[]);
          }

          // Transform inventories using service helper
          setInventories(profileService.formatForStore(profileData));
        }
      } catch (err) {
        errorLog('HomePage', 'Profile load failed:', err);
        addToast({
          message: 'Failed to fetch Destiny 2 profile.',
          type: 'error'
        });
      } finally {
        setProfileLoading(false);
      }
    }

    initializeProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <WelcomeView />;
  }

  // Error State: Authenticated but no characters loaded
  if (isAuthenticated && !setProfileLoading && characters.length === 0) {
    return (
      <div className="home-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 'var(--space-md)' }}>
        <h2 style={{ color: 'var(--text-error)' }}>Failed to Load Guardians</h2>
        <p style={{ color: 'var(--text-secondary)' }}>We couldn't retrieve your Destiny 2 profile.</p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Retry Connection
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => useAuthStore.getState().logout()}
        >
          Logout & Re-auth
        </button>
      </div>
    );
  }

  return (
    <div className="home-page animate-fade-in">
      <header className="home-page__header">
        <div className="home-page__logo-container">
          <img src="/logo_dsc.svg" alt="ExoEngine" className="home-page__logo" />
        </div>
        <h1>Welcome, {useAuthStore.getState().membership?.bungieGlobalDisplayName || 'Guardian'}</h1>
        <p>Choose your path to optimize your gameplay</p>
      </header>

      <div className="home-page__status">
        <SimpleTooltip text="Guardian Database Sync Status">
          <div className="status-badge">
            <span className={`status-dot ${manifestLoaded ? 'status-dot--success' : 'status-dot--warning'}`} />
            <span>VAULT ARCHIVE: {manifestLoaded ? 'SYNCED' : 'SYNCHRONIZING...'}</span>
          </div>
        </SimpleTooltip>
        <SimpleTooltip text="Active Character Count">
          <div className="status-badge">
            <span className="status-dot status-dot--success" />
            <span>GUARDS DETECTED: {characters.length}</span>
          </div>
        </SimpleTooltip>
      </div>

      <div className="home-page__features">
        <FeatureCard
          title="Loadout Vault"
          description="Save and manage your favorite builds. Import from DIM or ExoEngine and quickly equip them."
          icon=""
          element={ElementType.Void}
          link="/builds"
          tags={['Save Builds', 'DIM Import']}
        />

        <FeatureCard
          title="Build Generator"
          description="Spin the wheel and get a random meta build. Auto-equip exotics and subclass configurations instantly."
          icon=""
          element={ElementType.Arc}
          link="/generator"
          tags={['Quick Builds', 'Auto-Equip']}
        />

        <FeatureCard
          title="Saved Builds"
          description="Save your favorite loadouts and switch between them with one click."
          icon=""
          element={ElementType.Stasis}
          link="/saved-builds"
          tags={['Loadouts', 'Quick Swap']}
        />

        <FeatureCard
          title="Credits & Attribution"
          description="Meet the team and community behind ExoEngine. Support development and learn about our inspirations."
          icon=""
          element={ElementType.Solar}
          link="/credits"
          tags={['Team', 'Support']}
        />
      </div>

    </div>
  );
}

function WelcomeView() {
  const handleLogin = async () => {
    const url = await bungieApi.getAuthorizationUrl();
    window.location.href = url;
  };

  return (
    <div className="welcome-view animate-fade-in">
      <div className="welcome-view__content">
        <div className="welcome-view__logo">
          <img src="/logo_dsc.svg" alt="ExoEngine Logo" className="welcome-view__icon-img" />
          <h1 className="welcome-view__title">ExoEngine</h1>
          <p className="welcome-view__subtitle">
            Destiny 2 Loadout & Synergy Tool
          </p>
        </div>

        <div className="welcome-view__features">
          <div className="welcome-feature">
            <img src={MouseLeftIcon} className="welcome-mouse-icon" alt="L" />
            <div>
              <h3>Synergy Optimizer</h3>
              <p>Visual ability loops for new players</p>
            </div>
          </div>
          <div className="welcome-feature">
            <img src={MouseLeftIcon} className="welcome-mouse-icon" alt="L" />
            <div>
              <h3>Random Meta Generator</h3>
              <p>Instant build randomization</p>
            </div>
          </div>

        </div>

        {/* MASSIVE DISCLAIMER - BETWEEN TRAVELER AND FLAG */}
        <div style={{
          width: '100%',
          maxWidth: '900px',
          margin: '4rem auto',
          padding: '3rem',
          background: '#ff0000',
          border: '5px solid #ffff00',
          color: '#ffffff',
          textAlign: 'center',
          zIndex: 10000,
          position: 'relative'
        }}>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '28px', fontWeight: '900', textTransform: 'uppercase' }}>
            ⚠️ LEGAL NOTICE ⚠️
          </p>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '22px', fontWeight: '800' }}>
            ExoEngine™ is an independent API project and trademark of Vj (@Unluckvj).
          </p>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', lineHeight: '1.8' }}>
            NOT affiliated with Bungie, Inc. Destiny, Destiny 2, Bungie, and all associated names,
            logos, and gameplay elements are trademarks and copyrights of Bungie, Inc. All rights reserved by Bungie.
            ExoEngine is not endorsed by or connected to Bungie.
          </p>
        </div>

        <div className="welcome-view__cta-container">
          <button onClick={handleLogin} className="welcome-flag-cta">
            <div className="flag-logo-container">
              <img src="/logo_dsc.svg" alt="" className="flag-logo" />
            </div>
            <span className="flag-text">INITIALIZE NEURAL LINK</span>
          </button>
        </div>

      </div>

      {/* Legal Disclaimer - HIGHLY VISIBLE */}
      <div style={{
        width: '100%',
        maxWidth: '700px',
        margin: '2rem auto',
        padding: '2rem',
        background: '#ffffff',
        border: '3px solid #ff0000',
        color: '#000000',
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        zIndex: 9999,
        position: 'relative'
      }}>
        <p style={{ margin: '0 0 1rem 0', fontSize: '18px' }}>
          ExoEngine™ is an independent API project and trademark of Vj (@Unluckvj).
        </p>
        <p style={{ margin: 0, fontSize: '16px' }}>
          NOT affiliated with Bungie, Inc. Destiny, Destiny 2, Bungie, and all associated names,
          logos, and gameplay elements are trademarks and copyrights of Bungie, Inc. All rights reserved by Bungie.
          ExoEngine is not endorsed by or connected to Bungie.
        </p>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  element: ElementType;
  link: string;
  tags: string[];
}

// OPTIMIZATION: Memoize FeatureCard to prevent unnecessary re-renders
const FeatureCard = memo(({ title, description, icon, element, link, tags }: FeatureCardProps) => {
  return (
    <Link to={link} className="feature-card-link">
      <GlassCard element={element} hoverable className="feature-card">
        <div className="feature-card__header">
          <span className="feature-card__icon">{icon}</span>
          <h2 className="feature-card__title">{title}</h2>
        </div>
        <p className="feature-card__description">{description}</p>
        <div className="feature-card__tags">
          {tags.map((tag) => (
            <span key={tag} className={`badge badge-${element}`}>
              {tag}
            </span>
          ))}
        </div>
        <div className="feature-card__arrow">&gt;</div>
      </GlassCard>
    </Link>
  );
});
