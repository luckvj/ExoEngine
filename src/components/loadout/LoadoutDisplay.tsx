import { useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import html2canvas from 'html2canvas';
import type { LoadoutShareData } from '../../services/bungie/loadout-link.service';
import { manifestService } from '../../services/bungie/manifest.service';
import { errorLog } from '../../utils/logger';
import { getBungieUrl } from '../../utils/url-helper';
import { TierBadge } from '../builder/TierBadge';

import { useToastStore, useProfileStore } from '../../store';
import { loadoutLinkService, applyLoadout, convertToBuildTemplate } from '../../services/bungie/loadout-link.service';
import { buildService } from '../../services/build.service';
import { ProgressBar } from '../common/ProgressBar';
import './LoadoutDisplay.css';

interface LoadoutDisplayProps {
    loadout: LoadoutShareData;
}

// Global Strand Tint Style
const STRAND_TINT = { filter: 'hue-rotate(-100deg) saturate(2.5) brightness(1.2)' };

export const LoadoutDisplay = forwardRef(({ loadout }: LoadoutDisplayProps, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToastStore();
    const [copiedType, setCopiedType] = useState<'exo' | 'dim' | null>(null);
    const [isEquipping, setIsEquipping] = useState(false);
    const [equipProgress, setEquipProgress] = useState({ message: '', percent: 0 });

    useImperativeHandle(ref, () => ({
        captureImage: async () => {
            if (!containerRef.current) return null;
            try {
                // Ensure all images are loaded before capture
                const images = containerRef.current.querySelectorAll('img');
                await Promise.all(Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                }));

                const canvas = await html2canvas(containerRef.current, {
                    useCORS: true,
                    backgroundColor: 'transparent',
                    scale: 2, // Higher quality
                });
                return canvas.toDataURL('image/png');
            } catch (e) {
                errorLog('LoadoutDisplay', 'Capture failed:', e);
                return null;
            }
        }
    }));

    const getClassName = (classType: number): string => {
        switch (classType) {
            case 0: return 'Titan';
            case 1: return 'Hunter';
            case 2: return 'Warlock';
            default: return 'Unknown';
        }
    };

    const getClassColor = (classType: number): string => {
        switch (classType) {
            case 0: return '#e74c3c'; // Titan - Red
            case 1: return '#3498db'; // Hunter - Blue
            case 2: return '#f39c12'; // Warlock - Orange
            default: return '#95a5a6';
        }
    };

    const handleCopyLink = (type: 'exo' | 'dim') => {
        try {
            const link = type === 'exo'
                ? loadoutLinkService.generateExoEngineLink(loadout)
                : loadoutLinkService.generateDIMCompatibleLink(loadout);

            navigator.clipboard.writeText(link);
            setCopiedType(type);
            addToast({
                message: `${type === 'exo' ? 'ExoEngine' : 'DIM'} link copied!`,
                type: 'success'
            });

            setTimeout(() => setCopiedType(null), 2000);
        } catch (error) {
            addToast({ message: 'Failed to copy link', type: 'error' });
        }
    };

    const handleEquip = async () => {
        const characterId = useProfileStore.getState().selectedCharacterId;
        if (!characterId) {
            addToast({ message: 'Please select a character first', type: 'error' });
            return;
        }

        setIsEquipping(true);
        useProfileStore.getState().setEquipping(true);
        setEquipProgress({ message: 'Initializing...', percent: 0 });

        const result = await applyLoadout(loadout, characterId, (msg, pct) => {
            setEquipProgress({ message: msg, percent: pct });
        });

        if (!result.success) {
            addToast({ message: `Equip failed: ${result.error}`, type: 'error' });
            setIsEquipping(false);
            useProfileStore.getState().setEquipping(false);
        } else {
            addToast({ message: 'Loadout equipped successfully', type: 'alert' });
            // Keep the isEquipping flag true for a short duration to let Bungie DB settle
            setTimeout(() => {
                setIsEquipping(false);
                useProfileStore.getState().setEquipping(false);
            }, 3000);
        }
    };

    const handleSave = async () => {
        try {
            const template = convertToBuildTemplate(loadout);
            await buildService.saveBuild(template, loadout.name || `Loadout ${new Date().toLocaleDateString()}`);
            addToast({ message: 'Loadout saved to your collection!', type: 'success' });
        } catch (error) {
            errorLog('LoadoutDisplay', 'Failed to save loadout:', error);
            addToast({ message: 'Failed to save loadout', type: 'error' });
        }
    };

    // Analyze Loadout items
    const { weapons, armor, subclass, subclassPlugs, artifactMods, modGroups, armorCosmetics, artifactItem } = useMemo(() => {
        const weapons: any[] = [];
        const armor: Record<string, any> = {
            helmet: null,
            arms: null,
            chest: null,
            legs: null,
            classItem: null
        };
        let subclass: any = null;
        let artifactItem: any = null;

        const armorCosmetics: Record<string, number[]> = {
            'helmet': [],
            'arms': [],
            'chest': [],
            'legs': [],
            'classItem': [],
            'general': []
        };

        const modGroups: Record<string, number[]> = {
            'helmet': [],
            'arms': [],
            'chest': [],
            'legs': [],
            'classItem': [],
            'general': []
        };

        const subclassPlugs: any = {
            super: null,
            classAbility: null,
            melee: null,
            grenade: null,
            jump: null,
            transcendence: null,
            aspects: [],
            fragments: [],
            unknown: []
        };

        // Categorize equipped items
        for (const item of loadout.equipped) {
            const def = manifestService.getItem(item.hash) as any;
            if (!def) continue;

            if (def.itemType === 3) weapons.push(item);
            else if (def.itemType === 2) {
                const bucketHash = def.inventory?.bucketTypeHash;
                if (bucketHash === 3448274439) armor.helmet = item;
                else if (bucketHash === 3551918588) armor.arms = item;
                else if (bucketHash === 14239492) armor.chest = item;
                else if (bucketHash === 20886954) armor.legs = item;
                else if (bucketHash === 1585787867) armor.classItem = item;
                else if (def.itemTypeDisplayName?.includes('Helmet') || def.itemTypeDisplayName?.includes('Head')) armor.helmet = item;
                else if (def.itemTypeDisplayName?.includes('Gauntlets') || def.itemTypeDisplayName?.includes('Arms')) armor.arms = item;
                else if (def.itemTypeDisplayName?.includes('Chest') || def.itemTypeDisplayName?.includes('Robes')) armor.chest = item;
                else if (def.itemTypeDisplayName?.includes('Leg') || def.itemTypeDisplayName?.includes('Boots')) armor.legs = item;
                else if (def.itemTypeDisplayName?.includes('Class') || def.itemTypeDisplayName?.includes('Bond') || def.itemTypeDisplayName?.includes('Mark') || def.itemTypeDisplayName?.includes('Cloak')) armor.classItem = item;
            }
            else if (def.itemType === 16) subclass = item;
            else if ((def as any).itemCategoryHashes?.includes(1378222069)) { // Seasonal Artifact
                artifactItem = item;
            }
        }

        // Parse Subclass Plugs (from socketOverrides)
        if (subclass && subclass.socketOverrides) {
            const subDef = manifestService.getItem(subclass.hash) as any;

            if (subDef && subDef.sockets) {
                const getSocketCategory = (index: number) => {
                    const cats = subDef.sockets.socketCategories || subDef.sockets.categories;
                    return cats?.find((c: any) => c.socketIndexes.includes(index));
                };

                const ABILITIES = [309722977, 3218807805];
                const SUPER = 457473665;
                const ASPECTS = [2140934067, 764703411, 3400923910, 2047681910];
                const FRAGMENTS = [1313488945, 2819965312, 193371309, 271461480];

                for (const [socketIndexStr, plugHash] of Object.entries(subclass.socketOverrides)) {
                    const index = parseInt(socketIndexStr);
                    const hash = plugHash as number;
                    const plugDef = manifestService.getItem(hash) as any;

                    if (!plugDef) {
                        if (hash !== 3696633656) {
                            subclassPlugs.unknown.push({ hash });
                        }
                        continue;
                    }

                    const plugCatId = plugDef?.plug?.plugCategoryIdentifier || '';

                    if (plugCatId.includes('supers') || plugDef?.itemType === 16) {
                        subclassPlugs.super = { hash };
                    }
                    else if (plugCatId.includes('aspects')) {
                        subclassPlugs.aspects.push({ hash });
                    }
                    else if (plugCatId.includes('fragments')) {
                        subclassPlugs.fragments.push({ hash });
                    }
                    else if (plugCatId.includes('class_abilities')) {
                        subclassPlugs.classAbility = { hash };
                    }
                    else if (plugCatId.includes('grenades')) {
                        subclassPlugs.grenade = { hash };
                    }
                    else if (plugCatId.includes('melee')) {
                        subclassPlugs.melee = { hash };
                    }
                    else if (plugCatId.includes('movement')) {
                        subclassPlugs.jump = { hash };
                    }
                    else {
                        const category = getSocketCategory(index);
                        const catHash = category?.socketCategoryHash;

                        if (catHash === SUPER) subclassPlugs.super = { hash };
                        else if (catHash && ABILITIES.includes(catHash)) {
                            if (!subclassPlugs.classAbility) subclassPlugs.classAbility = { hash };
                        }
                        else if (catHash && ASPECTS.includes(catHash)) subclassPlugs.aspects.push({ hash });
                        else if (catHash && FRAGMENTS.includes(catHash)) subclassPlugs.fragments.push({ hash });
                        else subclassPlugs.unknown.push({ hash });
                    }
                }
            }
        }

        const artifactMods: any[] = [];
        const seenPerkHashes = new Set<number>();
        const unlocks = (loadout.parameters as any)?.artifactUnlocks?.unlockedItemHashes || loadout.parameters?.artifactPerks || [];

        if (unlocks) {
            unlocks.forEach((hash: number) => {
                if (!hash || seenPerkHashes.has(hash)) return;
                seenPerkHashes.add(hash);
                const def = manifestService.getItem(hash);
                if (def) artifactMods.push(def);
                else artifactMods.push({ hash });
            });
        }

        const BUCKET_TO_SLOT: Record<number, keyof typeof modGroups> = {
            3448274439: 'helmet',
            3551918588: 'arms',
            14239492: 'chest',
            20886954: 'legs',
            1585787867: 'classItem'
        };

        const goalCounts = new Map<number, number>();
        if (loadout.parameters?.mods) {
            loadout.parameters.mods.forEach(h => goalCounts.set(h, (goalCounts.get(h) || 0) + 1));
        }

        const currentCounts = new Map<number, number>();

        const trackMod = (hash: number, slot: string) => {
            currentCounts.set(hash, (currentCounts.get(hash) || 0) + 1);
            const def = manifestService.getItem(hash) as any;
            const plugCat = def?.plug?.plugCategoryIdentifier?.toLowerCase() || '';
            const typeName = def?.itemTypeDisplayName?.toLowerCase() || '';

            const isCosmetic =
                plugCat.includes('shader') ||
                plugCat.includes('skins') ||
                plugCat.includes('ornament') ||
                typeName.includes('shader') ||
                typeName.includes('ornament');

            const isGameplayMod = plugCat.includes('enhancements') || plugCat.includes('armor_stats');

            const isSubclassItem =
                plugCat.includes('fragments') ||
                plugCat.includes('aspects') ||
                plugCat.includes('abilities') ||
                plugCat.includes('supers') ||
                plugCat.includes('plugs.subclass') ||
                typeName.includes('fragment') ||
                typeName.includes('aspect') ||
                def?.itemCategoryHashes?.includes(1313488945) ||
                def?.itemCategoryHashes?.includes(764703411);

            if (isSubclassItem) return;

            if (isCosmetic && !isGameplayMod) {
                armorCosmetics[slot].push(hash);
            } else {
                modGroups[slot].push(hash);
            }
        };

        Object.entries(armor).forEach(([slot, item]) => {
            if (item && item.socketOverrides) {
                Object.values(item.socketOverrides).forEach((hash: any) => {
                    const modHash = Number(hash);
                    if (modHash && modHash !== 3696633656) {
                        const def = manifestService.getItem(modHash);
                        if (def && (def.itemType === 19 || def.itemType === 24 || def.plug?.plugCategoryIdentifier?.includes('shader'))) {
                            trackMod(modHash, slot);
                        }
                    }
                });
            }
        });

        if (loadout.parameters?.modsByBucket) {
            for (const [bucketStr, mods] of Object.entries(loadout.parameters.modsByBucket)) {
                const bucketHash = parseInt(bucketStr);
                const slot = BUCKET_TO_SLOT[bucketHash];
                if (Array.isArray(mods)) {
                    const targetSlot = slot || 'general';
                    mods.forEach(hash => trackMod(hash, targetSlot));
                }
            }
        }

        goalCounts.forEach((goal, hash) => {
            const current = currentCounts.get(hash) || 0;
            const remaining = goal - current;

            if (remaining > 0) {
                const def = manifestService.getItem(hash) as any;
                if (def) {
                    const plugCat = def.plug?.plugCategoryIdentifier?.toLowerCase() || '';
                    const name = def?.displayProperties?.name || def?.name || '';
                    const isArtifice =
                        plugCat.includes('artifice') ||
                        name === 'Melee Mod' ||
                        name === 'Armor Charge Mod' ||
                        name.includes('/ -') ||
                        name.includes('+Class');

                    let targetSlot = 'general';
                    if (!isArtifice) {
                        if (plugCat.includes('head') || plugCat.includes('helmet')) targetSlot = 'helmet';
                        else if (plugCat.includes('arms') || plugCat.includes('gauntlets')) targetSlot = 'arms';
                        else if (plugCat.includes('chest') || plugCat.includes('plate') || plugCat.includes('vest') || plugCat.includes('robe')) targetSlot = 'chest';
                        else if (plugCat.includes('legs') || plugCat.includes('boots')) targetSlot = 'legs';
                        else if (plugCat.includes('class')) targetSlot = 'classItem';
                    }

                    if (targetSlot !== 'general') {
                        for (let i = 0; i < remaining; i++) trackMod(hash, targetSlot);
                    } else {
                        if (plugCat.includes('armor_stats') || def.itemTypeDisplayName?.includes('General') || isArtifice) {
                            const armorSlots = ['helmet', 'arms', 'chest', 'legs', 'classItem'];
                            let assigned = 0;
                            let attempts = 0;
                            while (assigned < remaining && attempts < 20) {
                                const slotIndex = (current + assigned) % 5;
                                const slotName = armorSlots[slotIndex];
                                const item = armor[slotName as keyof typeof armor];
                                let isExotic = false;
                                if (item) {
                                    const itemDef = manifestService.getItem(item.hash) as any;
                                    isExotic = itemDef?.tierType === 6;
                                }
                                if (isArtifice && isExotic) { } else {
                                    trackMod(hash, slotName);
                                    assigned++;
                                }
                                attempts++;
                            }
                            if (assigned < remaining) {
                                for (let k = 0; k < (remaining - assigned); k++) trackMod(hash, 'general');
                            }
                        } else {
                            for (let i = 0; i < remaining; i++) trackMod(hash, 'general');
                        }
                    }
                }
            }
        });

        return { weapons, armor, subclass, subclassPlugs, artifactMods, modGroups, armorCosmetics, artifactItem };
    }, [loadout]);

    const isStrand = useMemo(() => {
        if (!subclass) return false;
        try {
            const def = manifestService.getItem(subclass.hash) as any;
            if (!def) return false;
            if (def.damageType === 7 || def.defaultDamageType === 7) return true;
            const name = def.displayProperties?.name?.toLowerCase() || def.name?.toLowerCase() || '';
            if (name.includes('berserker') || name.includes('broodweaver') || name.includes('threadrunner')) return true;
            if (subclassPlugs?.super?.hash) {
                const superDef = manifestService.getItem(subclassPlugs.super.hash) as any;
                const superName = superDef?.displayProperties?.name?.toLowerCase() || '';
                if (superName.includes('needle') || superName.includes('bladefury') || superName.includes('silk')) return true;
                if (superDef?.damageType === 7) return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }, [subclass, subclassPlugs]);

    const renderArmorRow = (slotName: string, item: any, mods: number[], cosmetics: number[], emptyLabel: string) => {
        let glowClass = '';
        if (item) {
            const def = manifestService.getItem(item.hash) as any;
            const tier = def?.tierType;
            const typeTierName = def?.itemTypeAndTierDisplayName || '';
            if (tier === 6 || typeTierName.includes('Exotic')) glowClass = 'armor-row-glow-exotic';
            else if (tier === 5 || typeTierName.includes('Legendary')) glowClass = 'armor-row-glow-legendary';
        }

        return (
            <div className={`armor-slot-row ${glowClass}`}>
                <div className="armor-top-row">
                    <div className="armor-item-col">
                        {item ? <LoadoutItem item={item} /> : <div className="empty-slot">{emptyLabel}</div>}
                    </div>
                    <div className="armor-cosmetics-col">
                        {cosmetics.map((hash, idx) => (
                            <ModDisplay key={`${slotName}-cosmetic-${idx}`} hash={hash} />
                        ))}
                    </div>
                </div>
                <div className="armor-mods-row">
                    {mods.map((hash, idx) => (
                        <ModDisplay key={`${slotName}-mod-${idx}`} hash={hash} />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="loadout-display" ref={containerRef} id="loadout-capture-area">
            <header className="loadout-display-header" style={{ borderColor: getClassColor(loadout.classType) }}>
                <div className="loadout-title-section">
                    <h2 className="loadout-name">{loadout.name}</h2>
                    <div className="loadout-class" style={{ color: getClassColor(loadout.classType) }}>
                        {getClassName(loadout.classType)}
                    </div>
                </div>
                {loadout.notes && <p className="loadout-notes">{loadout.notes}</p>}
            </header>

            {subclass && (
                <section className="loadout-section subclass-section">
                    <div className="subclass-header">
                        <LoadoutItem item={subclass} minimal />
                    </div>
                    <div className="subclass-grid">
                        <div className="subclass-row abilities-row">
                            <div className="ability-group super-group">
                                <span className="ability-label">Super & Transcendence</span>
                                <div className="super-container" style={{ display: 'flex', gap: '8px' }}>
                                    {subclassPlugs.classAbility ? <LoadoutItem item={subclassPlugs.classAbility} size="large" /> : <div className="empty-slot">Class</div>}
                                    {subclassPlugs.transcendence && <LoadoutItem item={subclassPlugs.transcendence} size="large" />}
                                </div>
                            </div>
                            <div className="ability-group">
                                <span className="ability-label">Abilities</span>
                                <div className="abilities-list">
                                    {subclassPlugs.super && <LoadoutItem item={subclassPlugs.super} size="medium" style={isStrand ? STRAND_TINT : undefined} />}
                                    {subclassPlugs.jump && <LoadoutItem item={subclassPlugs.jump} size="medium" style={isStrand ? STRAND_TINT : undefined} />}
                                    {subclassPlugs.melee && <LoadoutItem item={subclassPlugs.melee} size="medium" />}
                                    {subclassPlugs.grenade && <LoadoutItem item={subclassPlugs.grenade} size="medium" />}
                                </div>
                            </div>
                        </div>
                        <div className="subclass-row aspects-fragments-row">
                            <div className="ability-group">
                                <span className="ability-label">Aspects</span>
                                <div className="aspects-list">
                                    {subclassPlugs.aspects.map((p: any, i: number) => <LoadoutItem key={i} item={p} size="aspect" />)}
                                </div>
                            </div>
                            <div className="ability-group">
                                <span className="ability-label">Fragments</span>
                                <div className="fragments-list">
                                    {subclassPlugs.fragments.map((p: any, i: number) => <LoadoutItem key={i} item={p} size="fragment" />)}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {((artifactMods && artifactMods.length > 0) || artifactItem) && (
                <section className="loadout-section artifact-section" style={{ marginTop: '1rem' }}>
                    <div className="section-header" style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Seasonal Artifact</div>
                    <div className="artifact-container" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {artifactItem && <LoadoutItem item={artifactItem} size="medium" />}
                        <div className="artifact-mods-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {artifactMods.map((mod: any, index: number) => <LoadoutItem key={`artifact-mod-${index}`} item={{ hash: mod?.hash }} size="medium" />)}
                        </div>
                    </div>
                </section>
            )}

            {weapons.length > 0 && (
                <section className="loadout-section">
                    <h3 className="section-title"><span className="section-icon"></span> Weapons ({weapons.length})</h3>
                    <div className="items-grid">
                        {weapons.map((item: any, index: number) => <LoadoutItem key={`${item.hash}-${index}`} item={item} />)}
                    </div>
                </section>
            )}

            <section className="loadout-section armor-section">
                <h3 className="section-title"><span className="section-icon"></span> Armor & Mods</h3>
                <div className="armor-grid">
                    {renderArmorRow('helmet', armor.helmet, modGroups.helmet, armorCosmetics.helmet, 'No Helmet')}
                    {renderArmorRow('arms', armor.arms, modGroups.arms, armorCosmetics.arms, 'No Arms')}
                    {renderArmorRow('chest', armor.chest, modGroups.chest, armorCosmetics.chest, 'No Chest')}
                    {renderArmorRow('legs', armor.legs, modGroups.legs, armorCosmetics.legs, 'No Legs')}
                    {renderArmorRow('classItem', armor.classItem, modGroups.classItem, armorCosmetics.classItem, 'No Class Item')}
                    {(modGroups.general.length > 0 || armorCosmetics.general.length > 0) && (
                        <div className="armor-slot-row">
                            <div className="armor-top-row">
                                <div className="armor-item-col"><span className="general-mods-label">General</span></div>
                                <div className="armor-cosmetics-col">
                                    {armorCosmetics.general.map((hash, idx) => <ModDisplay key={`general-cosmetic-${idx}`} hash={hash} />)}
                                </div>
                            </div>
                            <div className="armor-mods-row">
                                {modGroups.general.map((hash, idx) => <ModDisplay key={`general-mod-${idx}`} hash={hash} />)}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {isEquipping && <ProgressBar percent={equipProgress.percent} message={equipProgress.message} color="#4CAF50" />}

            <footer className="loadout-footer">
                <h3 className="footer-title">Actions</h3>
                <div className="share-buttons">
                    <button className="share-btn share-btn-save" onClick={handleSave} style={{ background: '#3498db', color: 'white' }}><span className="btn-icon"></span> Save</button>
                    <button className="share-btn share-btn-equip" onClick={handleEquip} disabled={isEquipping} style={{ background: '#4CAF50', color: 'white' }}><span className="btn-icon"></span> {isEquipping ? 'Equipping...' : 'Equip Loadout'}</button>
                    <button className={`share-btn share-btn-exo ${copiedType === 'exo' ? 'copied' : ''}`} onClick={() => handleCopyLink('exo')}><span className="btn-icon"></span> {copiedType === 'exo' ? 'Copied!' : 'Copy Exo Link'}</button>
                    <button className={`share-btn share-btn-dim ${copiedType === 'dim' ? 'copied' : ''}`} onClick={() => handleCopyLink('dim')}><span className="btn-icon"></span> {copiedType === 'dim' ? 'Copied!' : 'Copy to DIM Link'}</button>
                </div>
            </footer>
        </div>
    );
});

function LoadoutItem({ item, size = 'normal', minimal = false, style }: { item: any, size?: 'normal' | 'large' | 'medium' | 'aspect' | 'fragment', minimal?: boolean, style?: React.CSSProperties }) {
    const { activeTransfers, successfulTransfers } = useProfileStore();
    const def = manifestService.getItem(item.hash) as any;
    const fullDef = manifestService.getFullDefinition(item.hash);
    if (!def) return <div className={`loadout-item loadout-item-missing size-${size}`}><div className="item-icon-placeholder">?</div>{!minimal && <div className="item-name">Unknown ({item.hash})</div>}</div>;

    const instanceId = item.itemInstanceId;
    const isTransferring = instanceId ? activeTransfers.has(instanceId) : false;
    const isSuccess = instanceId ? successfulTransfers.has(instanceId) : false;
    const hasSocketOverrides = item.socketOverrides && Object.keys(item.socketOverrides).length > 0;
    const tooltip = fullDef?.description ? `${fullDef.name}\n\n${fullDef.description}` : (fullDef?.name || def.name);

    // Get item instance data for detailed overlays
    const itemInstance = item.itemInstanceId ? (item as any) : undefined;
    const tierType = def.inventory?.tierType;
    const isExotic = tierType === 6;
    const isWeapon = def.itemType === 3;
    const isArmor = def.itemType === 2;

    // Tier badge (for non-exotics)
    const gearTier = itemInstance?.gearTier || item.tier || 0;
    const showTierBadge = !isExotic && (isWeapon || isArmor) && gearTier > 0;

    // Crafted/Enhanced status
    const isMasterwork = !!(item?.state && (item.state & 4));
    const isCrafted = !!(item?.state && (item.state & 8));
    const isEnhanced = !!(isCrafted && gearTier >= 2);

    // Power level
    const power = itemInstance?.power || item.power;
    const damageType = itemInstance?.damageType || def.defaultDamageType;

    // Damage type names
    const DAMAGE_TYPE_NAMES: Record<number, string> = {
        1: 'kinetic',
        2: 'arc',
        3: 'solar',
        4: 'void',
        6: 'stasis',
        7: 'strand',
    };
    const damageTypeName = damageType ? DAMAGE_TYPE_NAMES[damageType] : undefined;
    const damageIconUrl = damageTypeName ? manifestService.getDamageTypeIcon(damageTypeName as any) : undefined;

    // Watermark
    const featuredWatermark = def.iconWatermarkFeatured;
    const standardWatermark = def.iconWatermark;
    const watermarkUrl = featuredWatermark || standardWatermark;
    const isLegacyWatermark = !featuredWatermark && !!standardWatermark;

    return (
        <div className={`loadout-item size-${size} ${minimal ? 'minimal' : ''} ${isMasterwork ? 'loadout-item--masterwork' : ''} ${isTransferring ? 'transfer-active' : ''} ${isSuccess ? 'transfer-success' : ''}`} title={tooltip}>
            <div className="item-icon-container">
                <div className="transmat-overlay" />
                <img src={def.icon || (item.hash === 1324853482 ? 'https://www.bungie.net/common/destiny2_content/icons/683050c8fc02022718ef557f20224d08.png' : '')} alt={def.name} className="item-icon" style={style} />

                {/* Watermark overlay */}
                {watermarkUrl && (
                    <img
                        src={getBungieUrl(watermarkUrl)}
                        className={`loadout-item__watermark ${isLegacyWatermark ? 'loadout-item__watermark--legacy' : 'loadout-item__watermark--featured'}`}
                        alt=""
                    />
                )}

                {/* Tier stars */}
                {showTierBadge && (
                    <div className="loadout-item__tier-stars">
                        <TierBadge tier={gearTier} />
                    </div>
                )}

                {/* Power level with damage icon */}
                {power != null && power > 0 && !minimal && (
                    <div className="loadout-item__power">
                        {damageIconUrl && (
                            <img src={getBungieUrl(damageIconUrl)} className="loadout-item__damage-icon" alt="" />
                        )}
                        <span className="loadout-item__power-value">{power}</span>
                    </div>
                )}

                {/* Crafted/Enhanced icons */}
                {isWeapon && (isCrafted || isEnhanced) && !minimal && (
                    <div className="loadout-item__craft-status">
                        {isCrafted && (
                            <img
                                src={getBungieUrl('/img/destiny_content/items/crafted-icon-overlay.png')}
                                className="loadout-item__crafted-icon"
                                alt="Crafted"
                            />
                        )}
                        {isEnhanced && (
                            <img
                                src={getBungieUrl('/img/destiny_content/items/enhanced-item-overlay.png')}
                                className="loadout-item__enhanced-icon"
                                alt="Enhanced"
                            />
                        )}
                    </div>
                )}

                {hasSocketOverrides && !minimal && <div className="socket-indicator" title="Has custom perks/mods"></div>}
            </div>
            {!minimal && size !== 'fragment' && size !== 'medium' && <div className="item-info"><div className="item-name">{def.name}</div><div className="item-type">{def.itemTypeDisplayName}</div></div>}
            {size === 'aspect' && <div className="item-info"><div className="item-name">{def.name}</div></div>}
        </div>
    );
}

function ModDisplay({ hash }: { hash: number }) {
    const fullDef = manifestService.getFullDefinition(hash);
    const def = manifestService.getItem(hash) as any;
    if (!def) return <div className="mod-item mod-item-missing"><div className="mod-icon-placeholder">?</div><div className="mod-name">Unknown Mod</div></div>;
    const iconUrl = def.icon;
    const description = fullDef?.description || def.description;
    const tooltip = description ? `${def.name}\n\n${description}` : def.name;
    return (
        <div className="mod-item" title={tooltip}>
            <img src={iconUrl} alt={def.name} className="mod-icon" />
            <div className="mod-name">{def.name}</div>
        </div>
    );
}
