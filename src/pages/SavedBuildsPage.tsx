import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavedBuildsStore, useProfileStore, useAuthStore } from '../store';
import { buildService } from '../services/build.service';
import { GlassCard } from '../components/common/GlassCard';
import { useToast } from '../components/common/Toast';
import { manifestService } from '../services/bungie/manifest.service';
import { loadoutLinkService, convertBuildToLoadoutShareData } from '../services/bungie/loadout-link.service';
import { csvService } from '../services/csv.service';
import { errorLog } from '../utils/logger';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import type { BuildTemplate } from '../types';
import './SavedBuildsPage.css';

export function SavedBuildsPage() {
    const navigate = useNavigate();
    const { builds, isLoading } = useSavedBuildsStore();
    const { selectedCharacterId } = useProfileStore();
    const { isAuthenticated } = useAuthStore();
    const { success, error: showError } = useToast();
    const [equippingId, setEquippingId] = useState<string | null>(null);
    const [lastEquippedBuild, setLastEquippedBuild] = useState<any | null>(null);
    const [showSnapshotUI, setShowSnapshotUI] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        buildService.loadSavedBuilds();
    }, []);

    const handleEquip = async (build: any) => {
        if (!selectedCharacterId) {
            showError("Please select a character in the header first.");
            return;
        }

        setEquippingId(build.id);
        try {
            const result = await buildService.equip(build.template, selectedCharacterId);
            if (result.success) {
                success(`Equipped ${build.name}!`);
                setLastEquippedBuild(build);
                setShowSnapshotUI(true);

                // After successful equip, navigate back to Orbit (agent-wake)
                // This gives a premium "operation complete" feel
                setTimeout(() => {
                    navigate('/agent-wake');
                }, 1500);
            } else {
                showError(result.error || "Failed to equip build.");
            }
        } catch (e) {
            errorLog('SavedBuildsPage', 'Equip error:', e);
            showError("Equip failed due to an error.");
        } finally {
            setEquippingId(null);
        }
    };

    const [isEquippingSnapshot, setIsEquippingSnapshot] = useState(false);

    const handleSnapshot = async (index: number) => {
        if (!selectedCharacterId) return;
        setIsEquippingSnapshot(true);
        try {
            // Wait for Bungie server consistency
            await new Promise(resolve => setTimeout(resolve, 2000));

            const successResult = await buildService.snapshotToInGameSlot(selectedCharacterId, index);
            if (successResult) {
                setShowSnapshotUI(false);
                success(`Saved to In-Game Loadout Slot ${index + 1}!`);
            } else {
                showError("Failed to save loadout. Are you in an activity?");
            }
        } catch (e) {
            showError("Snapshot failed.");
        } finally {
            setIsEquippingSnapshot(false);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (deleteConfirmId) {
            await buildService.deleteBuild(deleteConfirmId);
            success("Build deleted.");
            setDeleteConfirmId(null);
        }
    };

    const handleShareExo = async (buildTemplate: BuildTemplate) => {
        const shareData = convertBuildToLoadoutShareData(buildTemplate);
        const link = await loadoutLinkService.generateExoEngineLink(shareData);
        navigator.clipboard.writeText(link);
        success("ExoEngine Link copied to clipboard!");
    };

    const handleShareDIM = (buildTemplate: BuildTemplate) => {
        const shareData = convertBuildToLoadoutShareData(buildTemplate);
        const link = loadoutLinkService.generateDIMCompatibleLink(shareData);
        navigator.clipboard.writeText(link);
        success("DIM Link copied to clipboard!");
    };

    const handleExportCSV = () => {
        if (builds.length === 0) {
            showError("No builds to export.");
            return;
        }

        // Convert to format expected by csvService
        const buildsToExport = builds.map(b => ({ name: b.name, template: b.template }));
        const csv = csvService.exportBuilds(buildsToExport);

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exo-loadouts-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();

        success(`Exported ${builds.length} builds to CSV.`);
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (text) {
                try {
                    const templates = await csvService.importBuilds(text);
                    if (templates.length === 0) {
                        showError("No valid builds found in CSV.");
                        return;
                    }

                    // Save imported builds
                    let addedCount = 0;
                    for (const t of templates) {
                        // Avoid exact duplicates? For now just add.
                        await buildService.saveBuild(t, t.name);
                        addedCount++;
                    }

                    success(`Successfully imported ${addedCount} builds!`);
                    // Refresh listing
                    buildService.loadSavedBuilds();
                } catch (err) {
                    errorLog('SavedBuildsPage', 'Export error:', err);
                    showError("Failed to parse CSV.");
                }
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const handleImportDIM = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (text) {
                try {
                    const json = JSON.parse(text);
                    const shareDataList = loadoutLinkService.importDIMJson(json);

                    if (shareDataList.length === 0) {
                        showError("No valid DIM loadouts found in this file.");
                        return;
                    }

                    let addedCount = 0;
                    for (const data of shareDataList) {
                        const template = loadoutLinkService.convertToBuildTemplate(data);
                        await buildService.saveBuild(template, data.name || 'Imported DIM Build');
                        addedCount++;
                    }

                    success(`Successfully imported ${addedCount} DIM builds!`);
                    buildService.loadSavedBuilds();
                } catch (err) {
                    errorLog('SavedBuildsPage', 'DIM Import error:', err);
                    showError("Failed to parse DIM JSON.");
                }
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    if (!isAuthenticated) {
        return (
            <div className="saved-builds-page">
                <div className="empty-state">
                    <h2>Login Required</h2>
                    <p>You need to sign in with Bungie.net to see and manage your saved builds.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="saved-builds-page">
            <header className="page-header">
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/generator')}
                    style={{ marginBottom: 'var(--space-md)' }}
                >
                    Generate Build
                </button>
                <h1>Saved Builds</h1>
                <p style={{ color: '#ffffff' }}>Your collection of custom and saved combat configurations ({builds.length})</p>
                <div className="header-actions">
                    <button className="btn btn-outline btn-sm" onClick={handleExportCSV}>
                        Export CSV
                    </button>
                    <label className="btn btn-outline btn-sm">
                        Import CSV
                        <input
                            id="import-csv-input"
                            name="import-csv-input"
                            type="file"
                            accept=".csv"
                            style={{ display: 'none' }}
                            onChange={handleImportCSV}
                        />
                    </label>
                    <label className="btn btn-outline btn-sm">
                        Import DIM JSON
                        <input
                            id="import-dim-input"
                            name="import-dim-input"
                            type="file"
                            accept=".json"
                            style={{ display: 'none' }}
                            onChange={handleImportDIM}
                        />
                    </label>
                </div>
            </header>

            {showSnapshotUI && (
                <div className="snapshot-notice glass-panel" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="snapshot-notice__content">
                        <h3>Build Initialized: {lastEquippedBuild?.name}</h3>
                        <p>Gear & Subclass mapped. Snapshot to an in-game slot to save this configuration:</p>
                        <div className="snapshot-slots">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
                                <button
                                    key={i}
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => handleSnapshot(i)}
                                    disabled={isEquippingSnapshot}
                                >
                                    Slot {i + 1}
                                </button>
                            ))}
                            <button className="btn btn-sm btn-text" onClick={() => setShowSnapshotUI(false)}>Dismiss</button>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="loading-state">
                    <div className="spinner" />
                    <p>Accessing vault...</p>
                </div>
            ) : builds.length === 0 ? (
                <div className="empty-state">
                    <h2>No Builds Saved Yet</h2>
                    <p>Press <span className="key-cap">D</span> while viewing an ExoEngine build to save it here.</p>
                </div>
            ) : (
                <div className="builds-grid">
                    {builds.map((build) => {
                        const PRISMATIC_HASHES = [2946726027, 2603483315, 3170703816, 3893112950];
                        const isPrismatic = PRISMATIC_HASHES.includes(build.template.subclassConfig?.subclassHash || 0);
                        const displayElement = isPrismatic ? 'prismatic' : build.template.element;

                        return (
                            <GlassCard key={build.id} element={displayElement} className="saved-build-card">
                                <div className="saved-build-card__header">
                                    <h3>{build.name}</h3>
                                    <span className={`badge badge-${String(displayElement).toLowerCase()}`}>
                                        {String(displayElement).charAt(0).toUpperCase() + String(displayElement).slice(1)}
                                    </span>
                                </div>

                                <div className="saved-build-card__items">
                                    {/* Exotics Row */}
                                    <div className="items-row" style={{ marginBottom: '0.5rem' }}>
                                        {build.template.exoticWeapon && <BuildItemIcon hash={build.template.exoticWeapon.hash} label="Exotic Weapon" />}
                                        {build.template.exoticArmor && <BuildItemIcon hash={build.template.exoticArmor.hash} label="Exotic Armor" />}
                                    </div>

                                    {/* Super & Aspects Row */}
                                                                        <div className="items-row" style={{ marginBottom: '0.5rem' }}>
                                                                            <BuildItemIcon hash={build.template.subclassConfig?.superHash || 0} label="Super" />
                                                                            {build.template.subclassConfig?.aspects?.map((h: number, i: number) => (
                                                                                <BuildItemIcon key={h} hash={h} label={`Aspect ${i + 1}`} />  
                                                                            ))}
                                                                        </div>
                                    
                                                                        {/* Abilities Row */}
                                                                        <div className="items-row" style={{ marginBottom: '0.5rem' }}>        
                                                                            <BuildItemIcon hash={build.template.subclassConfig?.grenadeHash || 0} label="Grenade" />
                                                                            <BuildItemIcon hash={build.template.subclassConfig?.meleeHash || 0} label="Melee" />
                                                                            <BuildItemIcon hash={build.template.subclassConfig?.classAbilityHash || 0} label="Class Ability" />
                                                                        </div>
                                    
                                                                        {/* Fragments Row */}
                                                                        {(build.template.subclassConfig?.fragments?.length || 0) > 0 && (
                                                                            <div className="items-row fragments-row">
                                                                                {(build.template.subclassConfig?.fragments || []).map((h: number, i: number) => (
                                                                                    <BuildItemIcon key={h} hash={h} label={`Fragment ${i + 1}`} />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                    {/* Armor Mods Row */}
                                    {build.template.armorMods && build.template.armorMods.length > 0 && (
                                        <div className="items-row mods-row" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>MODS</span>
                                            {build.template.armorMods.slice(0, 6).map((h: number, i: number) => (
                                                <BuildItemIcon key={`${h}-${i}`} hash={h} label={`Mod ${i + 1}`} />
                                            ))}
                                            {build.template.armorMods.length > 6 && (
                                                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>+{build.template.armorMods.length - 6}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Stats Row */}
                                    {build.template.stats && (
                                        <div className="saved-build-card__stats" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                                            <StatMini value={build.template.stats.resilience} label="Health" icon="resilience" />
                                            <StatMini value={build.template.stats.recovery} label="Recovery" icon="recovery" />
                                            <StatMini value={build.template.stats.discipline} label="Grenade" icon="discipline" />
                                            <StatMini value={build.template.stats.strength} label="Melee" icon="strength" />
                                        </div>
                                    )}
                                </div>

                                <div className="saved-build-card__footer">
                                    <div className="footer-actions-row">
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleEquip(build)}
                                            disabled={equippingId === build.id}
                                        >
                                            {equippingId === build.id ? 'Equipping...' : 'Equip'}
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm text-red"
                                            onClick={() => handleDelete(build.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                    <div className="footer-links-row" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-xs btn-outline" onClick={() => handleShareExo(build.template)} title="Copy Exo Link">
                                            Exo
                                        </button>
                                        <button className="btn btn-xs btn-outline" onClick={() => handleShareDIM(build.template)} title="Copy to DIM Link">
                                            DIM
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            )}

            <ConfirmationModal
                isOpen={!!deleteConfirmId}
                title="DELETE BUILD?"
                message="Are you sure you want to delete this recorded build? This action cannot be undone."
                confirmText="Delete"
                cancelText="Keep"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmId(null)}
                type="danger"
            />
        </div>
    );
}

export default SavedBuildsPage;

function BuildItemIcon({ hash, label }: { hash: number; label: string }) {
    const [icon, setIcon] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<string>(label);

    useEffect(() => {
        if (hash) {
            const url = manifestService.getIcon(hash);
            if (url) setIcon(url);

            const def = manifestService.getFullDefinition(hash);
            if (def) {
                const name = def.name || 'Unknown';
                const desc = def.description || '';
                setTooltip(desc ? `${name}\n${desc}` : name);
            }
        }
    }, [hash]);

    if (!hash || !icon) return <div className="item-icon-placeholder" title={label}>?</div>;

    return (
        <div className="item-icon-wrapper" title={tooltip}>
            <img src={icon} alt={label} />
        </div>
    );
}

function StatMini({ value, label, icon }: { value: number; label: string; icon: string }) {
    const tier = Math.floor(value / 10);
    return (
        <div className="stat-mini" title={`${label}: ${value}`}>
            <span className={`stat-mini__icon stat-icon-${icon}`} />
            <span className="stat-mini__value">T{tier}</span>
        </div>
    );
}
