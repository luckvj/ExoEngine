// Settings Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { db } from '../services/db/indexeddb.service';
import { useSettingsStore, useAuthStore, useProfileStore } from '../store';
import { profileLoader } from '../services/bungie/profile.service';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

import './SettingsPage.css';

// Simple Icon Components (SVGs) - Removed unused Icons constant

type SettingsTab = 'DISPLAY' | 'DATA' | 'ACCOUNT' | 'ABOUT';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ACCOUNT');
  const toast = useToast();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [manifestVersion, setManifestVersion] = useState<string>('7.3.0.1');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'info'
  });

  const {
    maxSynergies, setMaxSynergies,
    organizedGalaxy, toggleOrganizedGalaxy,
    performanceMode, setPerformanceMode
  } = useSettingsStore();
  const { logout } = useAuthStore();
  const { setLoading } = useProfileStore();

  // Load manifest version on mount
  useEffect(() => {
    const loadManifestVersion = async () => {
      try {
        const version = await db.getManifestVersion();
        if (version) {
          setManifestVersion(version);
        }
      } catch (error) {
        errorLog('Settings', 'Manifest version load failed:', error);
      }
    };
    loadManifestVersion();
  }, []);

  const handleClearManifest = async () => {
    setClearing(true);
    try {
      await db.clearManifest();
      toast.success('Manifest cleared. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
    } catch { toast.error('Failed to clear manifest'); } finally { setClearing(false); }
  };

  const handleClearCache = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'CLEAR CACHE?',
      message: 'This will clear cached profile data. You will need to re-sync with Bungie servers. Continue?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setClearing(true);
        try {
          await db.clearProfileCache();
          toast.success('Cache cleared successfully');
        } catch { toast.error('Failed to clear cache'); } finally { setClearing(false); }
      },
      type: 'info'
    });
  };

  const handleClearAll = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'WIPE ALL DATA?',
      message: 'This will wipe all local data, including settings, manifest, and all saved ExoEngine builds. This is a total reset. Continue?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setClearing(true);
        try {
          await db.clearAll();
          toast.success('All data wiped. Redirecting...');
          setTimeout(() => {
            window.location.href = '/';  // Redirect to main page instead of reload
          }, 1000);
        } catch { toast.error('Failed to clear data'); } finally { setClearing(false); }
      },
      type: 'danger'
    });
  };

  const handleSyncProfile = async () => {
    setSyncing(true);
    try {
      setLoading(true);
      // Force a fresh profile fetch
      const membership = useAuthStore.getState().membership;
      if (membership) {
        await profileLoader.loadProfile(true);
        toast.success('Profile synced successfully');
      }
    } catch (error) {
      toast.error('Failed to sync profile');
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'LOGOUT?',
      message: 'Are you sure you want to logout of your current session?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await logout();
          toast.success('Logged out successfully');
        } catch {
          toast.error('Failed to logout');
        }
      },
      type: 'info'
    });
  };

  const handleChangeCharacter = () => {
    navigate('/');
  };

  return (
    <div className="settings-container">
      {/* Sidebar Navigation */}
      <div className="settings-sidebar">
        <button
          className={`settings-nav-btn ${activeTab === 'ACCOUNT' ? 'settings-nav-btn--active' : ''}`}
          onClick={() => setActiveTab('ACCOUNT')}
        >
          Account
        </button>
        <button
          className={`settings-nav-btn ${activeTab === 'DISPLAY' ? 'settings-nav-btn--active' : ''}`}
          onClick={() => setActiveTab('DISPLAY')}
        >
          Display
        </button>
        <button
          className={`settings-nav-btn ${activeTab === 'DATA' ? 'settings-nav-btn--active' : ''}`}
          onClick={() => setActiveTab('DATA')}
        >
          Data & Cache
        </button>
        <button
          className={`settings-nav-btn ${activeTab === 'ABOUT' ? 'settings-nav-btn--active' : ''}`}
          onClick={() => setActiveTab('ABOUT')}
        >
          About
        </button>
      </div>

      {/* Main Content Area */}
      <div className="settings-content">

        {/* DISPLAY TAB */}
        {activeTab === 'DISPLAY' && (
          <div className="animate-fade-in">
            <div className="settings-category-header">
              <span className="settings-category-title">Display Settings</span>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Synergy Display Limit</span>
                <span className="settings-row-description">Maximum number of synergies shown at once in the Galaxy</span>
              </div>
              <div className="settings-row-control">
                <div className="d2-slider-container">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={maxSynergies}
                    onChange={(e) => setMaxSynergies(parseInt(e.target.value))}
                    className="d2-slider"
                  />
                  <span className="d2-slider-value">{maxSynergies}</span>
                </div>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Organized Galaxy Layout</span>
                <span className="settings-row-description">Sorts weapons and armor into columns instead of a random scatter</span>
              </div>
              <div className="settings-row-control">
                <button
                  className={`d2-toggle-btn ${organizedGalaxy ? 'd2-toggle-btn--active' : ''}`}
                  onClick={toggleOrganizedGalaxy}
                >
                  {organizedGalaxy ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            <div className="settings-row">
              <div>
                <span className="settings-row-label">Performance Mode</span>
                <span className="settings-row-description">Adjust visual quality and rendering distance</span>
              </div>
              <div className="settings-row-control">
                <div className="settings-button-group">
                  <button
                    className={`d2-keybind-btn ${performanceMode === 'low' ? 'd2-keybind-btn--active' : ''}`}
                    onClick={() => setPerformanceMode('low')}
                  >
                    Low
                  </button>
                  <button
                    className={`d2-keybind-btn ${performanceMode === 'medium' ? 'd2-keybind-btn--active' : ''}`}
                    onClick={() => setPerformanceMode('medium')}
                  >
                    Medium
                  </button>
                  <button
                    className={`d2-keybind-btn ${performanceMode === 'high' ? 'd2-keybind-btn--active' : ''}`}
                    onClick={() => setPerformanceMode('high')}
                  >
                    High
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DATA TAB */}
        {activeTab === 'DATA' && (
          <div className="animate-fade-in">
            <div className="settings-category-header">
              <span className="settings-category-title">Data Management</span>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Refresh Manifest</span>
                <span className="settings-row-description">Update game database and definitions</span>
              </div>
              <div className="settings-row-control">
                <button className="d2-keybind-btn" onClick={handleClearManifest} disabled={clearing}>
                  {clearing ? 'Wait...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Clear Profile Cache</span>
                <span className="settings-row-description">Remove cached character and inventory data</span>
              </div>
              <div className="settings-row-control">
                <button className="d2-keybind-btn" onClick={handleClearCache} disabled={clearing}>
                  Clear Cache
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Reset All Data</span>
                <span className="settings-row-description">Clear all application data and settings</span>
              </div>
              <div className="settings-row-control">
                <button
                  className="d2-keybind-btn"
                  style={{ borderColor: '#ff4444', color: '#ff4444' }}
                  onClick={handleClearAll}
                  disabled={clearing}
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'ACCOUNT' && (
          <div className="animate-fade-in">
            <div className="settings-category-header">
              <span className="settings-category-title">Account Management</span>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Change Character</span>
                <span className="settings-row-description">Return to character selection screen</span>
              </div>
              <div className="settings-row-control">
                <button className="d2-keybind-btn" onClick={handleChangeCharacter}>
                  Select Character
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Sync Profile</span>
                <span className="settings-row-description">Force refresh character and inventory data</span>
              </div>
              <div className="settings-row-control">
                <button className="d2-keybind-btn" onClick={handleSyncProfile} disabled={syncing}>
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Logout</span>
                <span className="settings-row-description">Sign out of your Bungie account</span>
              </div>
              <div className="settings-row-control">
                <button
                  className="d2-keybind-btn"
                  style={{ borderColor: '#ff4444', color: '#ff4444' }}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'ABOUT' && (
          <div className="animate-fade-in">
            <div className="settings-category-header">
              <span className="settings-category-title">System Information</span>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Developer</span>
                <span className="settings-row-description">Visit developer profile on GitHub</span>
              </div>
              <div className="settings-row-control">
                <a href="https://github.com/luckvj/ExoEngine" target="_blank" className="d2-keybind-btn" style={{ textDecoration: 'none' }}>
                  Vj
                </a>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Credits</span>
                <span className="settings-row-description">View all contributors and acknowledgments</span>
              </div>
              <div className="settings-row-control">
                <button
                  className="d2-keybind-btn"
                  onClick={() => navigate('/credits')}
                >
                  View Credits
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Game Build</span>
                <span className="settings-row-description">Destiny 2 version compatibility</span>
              </div>
              <div className="settings-row-control">
                <span className="settings-row-label">{manifestVersion}</span>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <span className="settings-row-label">Version</span>
                <span className="settings-row-description">Current application version</span>
              </div>
              <div className="settings-row-control">
                <span className="settings-row-label">1.0</span>
              </div>
            </div>

            <div className="settings-category-header" style={{ marginTop: '40px' }}>
              <span className="settings-category-title">Legal</span>
            </div>
            <div style={{ padding: '16px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', lineHeight: '1.6' }}>
              ExoEngine is a fan-made application. Destiny 2, Bungie, and all related assets are trademarks of Bungie, Inc.
            </div>
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmModal.type}
      />
    </div>
  );
}

export default SettingsPage;
