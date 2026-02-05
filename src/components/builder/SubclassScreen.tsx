import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useProfileStore, useManifestStore } from '../../store';
import { BUCKET_HASHES } from '../../config/bungie.config';
import { manifestService } from '../../services/bungie/manifest.service';
import { transferService, createMoveSession } from '../../services/bungie/transfer.service';
import { profileLoader } from '../../services/bungie/profile.service';
import { getEquippedItem } from '../../utils/character-helpers';
import { getBungieUrl } from '../../utils/url-helper';
import { SubclassNode } from './SubclassNode';
import { AbilityPicker, type AbilityPickerItem } from './AbilityPicker';
import { RichTooltip } from './RichTooltip';
import type { DestinyItem } from '../../types';
import './SubclassScreen.css';

const CLASS_NAMES: Record<number, string> = { 0: 'TITAN', 1: 'HUNTER', 2: 'WARLOCK' };

function makeAbilityItem(hash: number): DestinyItem {
    return {
        itemHash: hash, itemInstanceId: undefined, quantity: 1, bindStatus: 0, location: 0,
        bucketHash: 0, transferStatus: 0, lockable: false, state: 0,
    };
}

function resolveIcon(def: any, fallbackIcon?: string): string {
    if (def?.displayProperties?.icon) {
        const raw = def.displayProperties.icon;
        // If it's already an absolute URL (from transformItemDefinition), return it
        if (raw.startsWith('http')) return raw;
        return getBungieUrl(raw) || '';
    }
    if (fallbackIcon) {
        if (fallbackIcon.startsWith('http')) return fallbackIcon;
        return getBungieUrl(fallbackIcon) || '';
    }
    return '';
}

function categorizeEquippedSockets(
    sockets: Array<{ plugHash?: number; plugName?: string; plugIcon?: string; socketIndex?: number }>,
    subclassDef?: any
): Record<string, EquippedAbility[]> {
    const result: Record<string, EquippedAbility[]> = {
        SUPER: [], GRENADES: [], MELEE: [], CLASS_ABILITIES: [],
        JUMP: [], ASPECTS: [], FRAGMENTS: [], PRISMATIC_FRAGMENTS: [],
        TRANSCENDENCE: [],
    };

    if (!subclassDef?.sockets?.socketCategories) return result;

    // Map Bungie's Socket Categories to our internal groups
    // Hashes verified against bungie.config.ts and DIM
    const HASH_TO_GROUP: Record<number, string> = {
        457473665: 'SUPER',      // Super
        2047681910: 'ASPECTS',   // Aspects
        2140934067: 'ASPECTS',   // Aspects (Ikora)
        3400923910: 'ASPECTS',   // Aspects (Stranger/Stasis)
        764703411: 'ASPECTS',    // Aspects (Neomuna/Strand)
        271461480: 'FRAGMENTS',  // Fragments
        1313488945: 'FRAGMENTS', // Fragments (Ikora)
        2819965312: 'FRAGMENTS', // Fragments (Stranger)
        193371309: 'FRAGMENTS',  // Fragments (Neomuna)
        4112185160: 'FRAGMENTS', // Fragments (Prismatic Facets)
        309722977: 'CLASS_ABILITIES', // Abilities
        3218807805: 'CLASS_ABILITIES', // Abilities (Ikora) - Light 3.0 subclasses
        1905270138: 'TRANSCENDENCE', // Prismatic Transcendence
    };

    // Subclasses use Socket Categories for primary organization
    for (const cat of subclassDef.sockets.socketCategories) {
        let group = HASH_TO_GROUP[cat.socketCategoryHash];

        // Special case for Prismatic Tertiary Sockets (Facets)
        // If not in HASH_TO_GROUP, try regex on category info if available
        // but hashes 271461480 usually cover Prismatic too.

        if (group && result[group]) {
            for (const socketIndex of cat.socketIndexes) {
                const socket = sockets[socketIndex];
                const plugHash = socket?.plugHash || 0;

                // For abilities, we might need further refinement based on discovered abilities
                // (e.g. distinguishing grenade vs melee vs class ability in the same category)
                let specificGroup = group;
                if (group === 'CLASS_ABILITIES' || group === 'ASPECTS' || group === 'FRAGMENTS') {
                    // These are generally fine as-is
                }

                if (group === 'CLASS_ABILITIES' && plugHash) {
                    const plugDef = manifestService.getItem(plugHash);
                    const plugCat = plugDef?.plug?.plugCategoryIdentifier || '';
                    if (/grenade/i.test(plugCat)) specificGroup = 'GRENADES';
                    else if (/melee/i.test(plugCat)) specificGroup = 'MELEE';
                    else if (/movement/i.test(plugCat)) specificGroup = 'JUMP';
                }

                const def = plugHash ? manifestService.getItem(plugHash) : undefined;

                // DIM Parity: Always prefer manifest data for icons/names if available
                const name = def?.displayProperties?.name || socket?.plugName || (plugHash === 0 ? 'Empty Socket' : '');
                const icon = resolveIcon(def, socket?.plugIcon);

                result[specificGroup].push({
                    hash: plugHash,
                    name,
                    icon,
                    socketIndex: socketIndex,
                });
            }
        }
    }

    // Filter out potential duplicates or misplaced abilities if any
    return result;
}

function getAvailableForSocket(subclassItemHash: number, socketIndex: number, excludedHashes: number[] = []): AbilityPickerItem[] {
    const rawDef = (manifestService as any).getRawDefinition('DestinyInventoryItemDefinition', subclassItemHash);
    if (!rawDef?.sockets?.socketEntries) return [];
    const socketEntry = rawDef.sockets.socketEntries[socketIndex];
    if (!socketEntry) return [];
    const plugSetHash = socketEntry.reusablePlugSetHash || socketEntry.randomizedPlugSetHash;
    if (!plugSetHash) return [];
    const plugs = manifestService.getPlugSet(plugSetHash);
    return plugs
        .filter(p => !excludedHashes.includes(p.hash))
        .filter(p => p.name && p.name !== 'Unknown Perk')
        .map(p => ({ hash: p.hash, name: p.name, icon: p.icon || '' }))
        .sort((a, b) => {
            const aEmpty = a.name.toLowerCase().includes('empty');
            const bEmpty = b.name.toLowerCase().includes('empty');
            if (aEmpty && !bEmpty) return -1;
            if (!aEmpty && bEmpty) return 1;
            return a.name.localeCompare(b.name);
        });
}

interface EquippedAbility {
    hash: number; name: string; icon: string; socketIndex: number;
}

export function SubclassScreen({ subclassHash: propSubclassHash, itemInstanceId: propInstanceId, onBack }: { subclassHash?: number; itemInstanceId?: string; onBack: () => void }) {
    const {
        selectedCharacterId,
        characterEquipment,
        characterInventories,
        itemInstances,
        characters,
        vaultInventory
    } = useProfileStore();
    const { isLoaded: manifestLoaded } = useManifestStore();
    const socketLockRef = useRef(false);

    const [openPicker, setOpenPicker] = useState<string | null>(null);
    const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
    const [equipping, setEquipping] = useState(false);
    const [optimisticOverrides, setOptimisticOverrides] = useState<Record<number, number>>({});
    const [parallax, setParallax] = useState({ x: 0, y: 0 });
    const [uiVisible, setUiVisible] = useState(true);
    const [showLore, setShowLore] = useState(false);
    const [equipProgress, setEquipProgress] = useState<{ status: string; percent: number } | null>(null);
    const [isMoving, setIsMoving] = useState(false);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); onBack(); }
            if (e.key === 'Control') { e.preventDefault(); setUiVisible(v => !v); }
            if (e.key.toLowerCase() === 'a') { e.preventDefault(); setShowLore(v => !v); }
            if (e.key.toLowerCase() === 'f') { e.preventDefault(); handleEquipSubclass(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onBack]);

    const togglePicker = useCallback((id: string) => setOpenPicker(prev => prev === id ? null : id), []);
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        setParallax({ x: (e.clientX / window.innerWidth) - 0.5, y: (e.clientY / window.innerHeight) - 0.5 });
    }, []);

    const equipment = characterEquipment[selectedCharacterId || ''] || [];
    const inventory = characterInventories[selectedCharacterId || ''] || [];
    const character = characters.find(c => c.characterId === selectedCharacterId);
    const classType = character?.classType ?? 2;
    const className = CLASS_NAMES[classType] || 'GUARDIAN';

    const subclassItem = useMemo(() => {
        if (propSubclassHash) {
            const eq = equipment.find(i => i.itemHash === propSubclassHash);
            if (eq) return eq;
            const inv = inventory.find(i => i.itemHash === propSubclassHash && (!propInstanceId || i.itemInstanceId === propInstanceId));
            if (inv) return inv;
            const vlt = vaultInventory.find(i => i.itemHash === propSubclassHash && (!propInstanceId || i.itemInstanceId === propInstanceId));
            return vlt || null;
        }
        return getEquippedItem(equipment, BUCKET_HASHES.SUBCLASS);
    }, [propSubclassHash, propInstanceId, equipment, inventory, vaultInventory]);

    // Auto-move if in vault
    useEffect(() => {
        const checkVault = async () => {
            if (!subclassItem || !selectedCharacterId || isMoving) return;
            const inVault = vaultInventory.some(i => i.itemInstanceId === subclassItem.itemInstanceId);
            if (inVault && subclassItem.itemInstanceId) {
                setIsMoving(true);
                setEquipProgress({ status: 'Retrieving subclass from Vault...', percent: 0 });
                try {
                    await transferService.smartTransfer(
                        subclassItem.itemInstanceId,
                        subclassItem.itemHash,
                        false,
                        selectedCharacterId,
                        createMoveSession([], 1)
                    );
                    await profileLoader.loadProfile(true);
                    setEquipProgress({ status: 'Data retrieved!', percent: 100 });
                    setTimeout(() => setEquipProgress(null), 1000);
                } catch (error: any) {
                    setEquipProgress({ status: `Failed to retrieve: ${error.message}`, percent: 0 });
                } finally {
                    setIsMoving(false);
                }
            }
        };
        checkVault();
    }, [subclassItem?.itemInstanceId, selectedCharacterId]);

    const subclassHash = subclassItem?.itemHash || 0;
    const subclassDef = subclassItem ? manifestService.getItem(subclassItem.itemHash) : undefined;

    const subclassElement = useMemo(() => {
        if (!subclassDef) return 'void';
        let type = subclassDef.defaultDamageType;
        if (!type || type === 0) type = subclassDef.talentGrid?.hudDamageType;
        if (type === 2) return 'arc';
        if (type === 3) return 'solar';
        if (type === 4) return 'void';
        if (type === 6) return 'stasis';
        if (type === 7) return 'strand';
        const name = subclassDef.displayProperties?.name?.toLowerCase() || '';
        // Use word boundary regex to avoid partial matches
        if (/\bprismatic\b/.test(name)) return 'prismatic';
        if (/\bsolar\b/.test(name) || /\bdawn\b/.test(name) || /\bgunslinger\b/.test(name) || /\bfire\b/.test(name)) return 'solar';
        if (/\bvoid\b/.test(name) || /\bnight\b/.test(name) || /\bvoidwalker\b/.test(name) || /\bsentinel\b/.test(name)) return 'void';
        if (/\barc\b/.test(name) || /\bstorm\b/.test(name) || /\bstriker\b/.test(name) || /\bstrider\b/.test(name)) return 'arc';
        if (/\bstasis\b/.test(name) || /\bshade\b/.test(name) || /\brevenant\b/.test(name) || /\bbehemoth\b/.test(name)) return 'stasis';
        if (/\bstrand\b/.test(name) || /\bbrood\b/.test(name) || /\bthread\b/.test(name) || /\bberserk\b/.test(name)) return 'strand';
        return 'void';
    }, [subclassDef]);

    const subclassName = subclassDef?.displayProperties?.name || `${subclassElement.toUpperCase()} ${className}`;

    const realSockets = subclassItem?.itemInstanceId ? (itemInstances[subclassItem.itemInstanceId]?.sockets || []) : [];
    // DIM Parity: Use socket.socketIndex (not array index) as the key for optimistic overrides
    const sockets = useMemo(() => realSockets.map((s) => {
        const socketIdx = s.socketIndex ?? realSockets.indexOf(s);
        return optimisticOverrides[socketIdx] !== undefined ? { ...s, plugHash: optimisticOverrides[socketIdx] } : s;
    }), [realSockets, optimisticOverrides]);
    const equipped = useMemo(() => categorizeEquippedSockets(sockets, subclassDef), [sockets, subclassDef]);

    const allFragments = [...(equipped.FRAGMENTS || []), ...(equipped.PRISMATIC_FRAGMENTS || [])];

    const handleEquip = useCallback(async (socketIndex: number, plugHash: number) => {
        if (!subclassItem?.itemInstanceId || !selectedCharacterId || equipping || socketLockRef.current) return;

        socketLockRef.current = true;
        setOpenPicker(null);

        // DIM Parity: Apply optimistic update immediately - UI should update instantly
        // Find socket by its socketIndex property, not array position
        const currentSocket = realSockets.find(s => s.socketIndex === socketIndex);
        const previousPlugHash = currentSocket?.plugHash;
        setOptimisticOverrides(prev => ({ ...prev, [socketIndex]: plugHash }));
        setEquipping(true);

        try {
            const vaultItem = vaultInventory.find(i => i.itemHash === (subclassItem?.itemHash || 0));
            if (vaultItem && vaultItem.itemInstanceId && selectedCharacterId) {
                await transferService.smartTransfer(vaultItem.itemInstanceId, vaultItem.itemHash, false, selectedCharacterId, createMoveSession([], 1));
                await profileLoader.loadProfile(true);
                await new Promise(r => setTimeout(r, 1000));
            }
            if (!subclassItem?.itemInstanceId) throw new Error('Subclass item instance not found.');

            const success = await transferService.insertSocketPlugFree(subclassItem.itemInstanceId, plugHash, socketIndex, selectedCharacterId);

            // DIM Parity: Don't reload profile on success - the local socket update already happened
            // and calling loadProfile causes the UI to flash. Keep optimistic override as-is.
            // The API response already updated the local item via updateLocalSocketPlug/updateItemFromChange.
            if (!success) {
                throw new Error('Socket plug failed');
            }
            // No background sync needed - the store was updated in insertSocketPlugFree
        } catch (error: any) {
            // Rollback to previous state
            setOptimisticOverrides(prev => {
                const next = { ...prev };
                if (previousPlugHash !== undefined) {
                    next[socketIndex] = previousPlugHash;
                } else {
                    delete next[socketIndex];
                }
                return next;
            });
            // Force profile reload on error to ensure UI consistency
            await profileLoader.loadProfile(true);
        } finally {
            setEquipping(false);
            socketLockRef.current = false;
        }
    }, [subclassItem, selectedCharacterId, equipping, vaultInventory, realSockets]);

    const handleEquipSubclass = useCallback(async () => {
        if (!subclassItem?.itemInstanceId || !selectedCharacterId || equipping || equipProgress) return;
        try {
            setEquipping(true);
            setEquipProgress({ status: 'Preparing to equip subclass...', percent: 0 });
            const curEq = characterEquipment[selectedCharacterId] || [];
            const curSub = curEq.find(i => i.bucketHash === BUCKET_HASHES.SUBCLASS);
            if (curSub?.itemInstanceId !== subclassItem.itemInstanceId) {
                setEquipProgress({ status: 'Switching to this subclass...', percent: 20 });
                await transferService.equipItem(subclassItem.itemInstanceId, selectedCharacterId);
                await new Promise(r => setTimeout(r, 500));
                await profileLoader.loadProfile(true);
            }
            const config = {
                subclassHash: subclassItem.itemHash,
                superHash: equipped.SUPER[0]?.hash,
                grenadeHash: equipped.GRENADES[0]?.hash,
                meleeHash: equipped.MELEE[0]?.hash,
                classAbilityHash: equipped.CLASS_ABILITIES[0]?.hash,
                movementHash: equipped.JUMP[0]?.hash,
                aspects: equipped.ASPECTS?.map(a => a.hash).filter(h => h !== undefined) || [],
                fragments: allFragments?.map(f => f.hash).filter(h => h !== undefined) || [],
            };
            await transferService.applySubclassConfiguration(subclassItem, config, selectedCharacterId, (s: string, p: number) => setEquipProgress({ status: s, percent: 40 + (p * 0.6) }));
            setEquipProgress({ status: 'Subclass equipped successfully!', percent: 100 });

            // Pulse back to orbit immediately upon confirmation
            onBack();

            setTimeout(() => setEquipProgress(null), 1000);
            await profileLoader.loadProfile(true);
        } catch (e: any) {
            setEquipProgress({ status: `Error: ${e.message}`, percent: 0 });
            setTimeout(() => setEquipProgress(null), 3000);
        } finally { setEquipping(false); }
    }, [subclassItem, selectedCharacterId, equipping, equipProgress, equipped, allFragments, characterEquipment]);

    const backgroundImage = useMemo(() => {
        if (subclassDef?.screenshot) return getBungieUrl(subclassDef.screenshot);
        if (subclassDef?.displayProperties?.icon) return getBungieUrl(subclassDef.displayProperties.icon);
        const buckets = [BUCKET_HASHES.HELMET, BUCKET_HASHES.GAUNTLETS, BUCKET_HASHES.CHEST_ARMOR, BUCKET_HASHES.LEG_ARMOR, BUCKET_HASHES.CLASS_ARMOR];
        for (const b of buckets) {
            const it = getEquippedItem(equipment, b);
            if (it) {
                const d = manifestService.getItem(it.itemHash);
                if (d?.inventory?.tierType === 6 && d.screenshot) return getBungieUrl(d.screenshot);
            }
        }
        return null;
    }, [subclassDef, equipment, manifestLoaded]);

    const superId = 'SUPER-main';
    const superAvail = useMemo(() => (equipped.SUPER[0]?.socketIndex !== undefined) ? getAvailableForSocket(subclassHash, equipped.SUPER[0].socketIndex) : [], [subclassHash, equipped.SUPER[0]?.socketIndex]);

    return (
        <div className={`subclass-screen element-${subclassElement} animate-fade-in ${!uiVisible ? 'ui-hidden' : ''}`} onMouseMove={handleMouseMove} style={{ '--parallax-x': parallax.x, '--parallax-y': parallax.y } as any} onMouseDown={() => setOpenPicker(null)}>
            {backgroundImage && <div className="subclass-screen__exotic-bg" style={{ backgroundImage: `url(${backgroundImage})` }} />}
            <div className="subclass-screen__header">
                <button className="btn-back" onMouseDown={(e) => { e.stopPropagation(); onBack(); }}>&larr; Back to Character</button>
                <div className="subclass-screen__title"><h1>{subclassName}</h1><p className="subclass-screen__subtitle">{className} SUBCLASS</p></div>
            </div>
            <div className="subclass-screen__content">
                <div className="subclass-screen__super-section">
                    <div className="subclass-screen__diamond-wrapper" onMouseEnter={() => setHoveredSlot('slot-super')} onMouseLeave={() => setHoveredSlot(null)} onMouseDown={(e) => { e.stopPropagation(); togglePicker(superId); }}>
                        <SubclassNode type="square" size="large" icon={equipped.SUPER[0]?.icon} status="active" element={subclassElement as any} />
                        {hoveredSlot === 'slot-super' && openPicker !== superId && equipped.SUPER[0] && <RichTooltip item={makeAbilityItem(equipped.SUPER[0].hash)} overrideElement={subclassElement as any} hideStats={true} />}
                        {openPicker === superId && superAvail.length > 0 && (
                            <AbilityPicker items={superAvail} columns={4} equippedHash={equipped.SUPER[0]?.hash} onSelect={(h) => equipped.SUPER[0] && handleEquip(equipped.SUPER[0].socketIndex, h)} onClose={() => setOpenPicker(null)} element={subclassElement} type="square" />
                        )}
                    </div>
                </div>
                <div className="subclass-screen__middle">
                    <div className="subclass-screen__top-row">
                        {(equipped.TRANSCENDENCE?.length || 0) > 0 && (
                            <div className="subclass-group"><h3 className="section-label">TRANSCENDENCE</h3><div className="subclass-group__slots">
                                {equipped.TRANSCENDENCE.map((it, i) => <CommonSlot key={`trans-${i}`} item={it} label="" categoryId="TRANSCENDENCE" indexInCat={i} subclassHash={subclassHash} subclassElement={subclassElement} openPicker={openPicker} togglePicker={togglePicker} hoveredSlot={hoveredSlot} setHoveredSlot={setHoveredSlot} handleEquip={handleEquip} setOpenPicker={setOpenPicker} />)}
                            </div></div>
                        )}
                        <div className="subclass-group"><h3 className="section-label">ABILITIES</h3><div className="subclass-group__slots">
                            {['CLASS_ABILITIES', 'JUMP', 'MELEE', 'GRENADES'].map(cat => <CommonSlot key={cat} item={equipped[cat][0]} label="" categoryId={cat} subclassHash={subclassHash} subclassElement={subclassElement} openPicker={openPicker} togglePicker={togglePicker} hoveredSlot={hoveredSlot} setHoveredSlot={setHoveredSlot} handleEquip={handleEquip} setOpenPicker={setOpenPicker} />)}
                        </div></div>
                        <div className="subclass-group"><h3 className="section-label">ASPECTS</h3><div className="subclass-group__slots">
                            {(() => {
                                const raw = equipped.ASPECTS || [];
                                const sorted = [...raw].sort((a, _b) => a.name.toLowerCase().includes('empty') ? -1 : 1);
                                const padded = [...Array(Math.max(0, 2 - sorted.length)).fill(undefined), ...sorted];
                                const hashes = padded.map(a => a?.hash).filter(h => h !== undefined) as number[];
                                return padded.slice(0, 2).map((it, i) => <CommonSlot key={`aspect-${i}`} item={it} label="" categoryId="ASPECTS" indexInCat={i} subclassHash={subclassHash} subclassElement={subclassElement} openPicker={openPicker} togglePicker={togglePicker} hoveredSlot={hoveredSlot} setHoveredSlot={setHoveredSlot} handleEquip={handleEquip} setOpenPicker={setOpenPicker} excludedHashes={hashes.filter(h => h !== it?.hash)} />);
                            })()}
                        </div></div>
                    </div>
                    <div className="subclass-screen__bottom-row"><div className="subclass-group"><h3 className="section-label">FRAGMENTS</h3><div className="subclass-group__slots">
                        {(() => {
                            let max = 0;
                            const FALLBACK: Record<string, number> = { 'Feed the Void': 2, 'Hellion': 2, 'Bleak Watcher': 2, 'Frostpulse': 2, 'Iceflare Bolts': 2, 'Glacial Harvest': 2, 'Weaver\'s Call': 3, 'Lightning Surge': 3, 'Stylish Executioner': 2, 'On the prowl': 3, 'On the Prowl': 3, 'Storm\'s Keep': 2, 'Storm\'s keep': 2, 'Storm Keep': 2, 'Storm keep': 2, 'Ascension': 2, 'Winter\'s Shroud': 2, 'Shatterdive': 2, 'Grim Harvest': 3, 'Touch of Winter': 2, 'Gunpowder Gamble': 3, 'Threaded Specter': 3, 'Consecration': 2, 'Knockout': 2, 'Cryoclasm': 2, 'Tectonic Harvest': 2, 'Howl of the Storm': 2, 'Drengr\'s Lash': 3, 'Diamond Lance': 3, 'Unbreakable': 3 };
                            (equipped.ASPECTS || []).forEach(a => {
                                const d = manifestService.getItem(a.hash);
                                let s = 0;
                                if (d?.investmentStats) for (const st of d.investmentStats) {
                                    const sd = manifestService.getStat(st.statTypeHash);
                                    // 2855639344 is the standard hash for Fragment Slots (AspectEnergyCapacity)
                                    if (st.statTypeHash === 2855639344 || sd?.name?.includes('Slots')) s += st.value;
                                }
                                if (s === 0 && d?.displayProperties?.name) s = FALLBACK[d.displayProperties.name] ?? 2;
                                max += s;
                            });
                            const equippedFragments = allFragments || [];
                            // Filter to unique socket indices
                            const uniqueFragments = Array.from(new Map(equippedFragments.map(f => [f.socketIndex, f])).values());
                            const sorted = [...uniqueFragments.sort((a, b) => {
                                if (a.hash === 0 && b.hash === 0) return a.socketIndex - b.socketIndex;
                                if (a.hash === 0) return 1;
                                if (b.hash === 0) return -1;
                                return a.socketIndex - b.socketIndex;
                            })];
                            // Pad with generic empty objects if we haven't reached 'max' yet
                            // These will have undefined socketIndex which means they won't be interactive 
                            // unless we find their actual socket indices from the manifest.
                            // But 'uniqueFragments' SHOUD already contain all available sockets.
                            const padded = [...sorted];
                            while (padded.length < max) {
                                padded.push({ hash: 0, name: 'Empty Slot', icon: '', socketIndex: -1 });
                            }
                            const hashes = padded.map(p => p?.hash).filter(h => h !== 0) as number[];
                            return padded.slice(0, max).map((it, i) => <CommonSlot key={`frag-${i}`} item={it} label="" categoryId="FRAGMENTS" indexInCat={i} nodeType="square" subclassHash={subclassHash} subclassElement={subclassElement} openPicker={openPicker} togglePicker={togglePicker} hoveredSlot={hoveredSlot} setHoveredSlot={setHoveredSlot} handleEquip={handleEquip} setOpenPicker={setOpenPicker} pickerColumns={8} pickerAlign="start" size="small" excludedHashes={hashes.filter(h => h !== it?.hash)} />);
                        })()}
                    </div></div></div>
                </div>
                <div className="subclass-screen__right-spacer"></div>
            </div>
            <div className="subclass-screen__footer">
                <div className="subclass-screen__controls-right">
                    <div className="d2-control-item" onClick={() => setUiVisible(!uiVisible)}><span className="d2-key-btn">Ctrl</span><span className="d2-control-label">{uiVisible ? 'Hide Menu' : 'Show Menu'}</span></div>
                    <div className="d2-control-item" onClick={onBack}><span className="d2-key-btn">Esc</span><span className="d2-control-label">Dismiss</span></div>
                    <div className="d2-control-item" onClick={handleEquipSubclass}><span className="d2-key-btn">F</span><span className="d2-control-label">Equip Subclass</span></div>
                </div>
            </div>
            {equipProgress && (
                <div className="subclass-screen__service-alert animate-slide-up">
                    <div className="service-alert-content"><div className="service-alert-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg></div><div className="service-alert-text"><span className="alert-bold">SERVICE ALERT</span><span className="alert-message">{equipProgress.status}</span></div></div>
                    {equipProgress.percent > 0 && <div className="service-alert-progress"><div className="service-alert-progress-fill" style={{ width: `${equipProgress.percent}%` }} /></div>}
                </div>
            )}
            {showLore && (
                <div className="subclass-lore-overlay animate-fade-in" onClick={() => setShowLore(false)}>
                    <div className="subclass-lore-content" onClick={e => e.stopPropagation()}>
                        <div className="lore-header"><div className="lore-title">{subclassName}</div><div className="lore-subtitle">LORE</div></div>
                        <div className="lore-body">{subclassDef?.displayProperties?.description || "No lore found for this subclass."}</div>
                        <div className="lore-footer"><span className="d2-key-btn">Esc</span> Dismiss</div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CommonSlot({ item, label, categoryId, indexInCat = 0, nodeType = 'square', customLabel, subclassHash, subclassElement, openPicker, togglePicker, hoveredSlot, setHoveredSlot, handleEquip, setOpenPicker, pickerColumns = 4, pickerAlign = 'center', excludedHashes = [], size }: { item?: EquippedAbility, label: string, categoryId: string, indexInCat?: number, nodeType?: 'square' | 'diamond' | 'round', customLabel?: string, subclassHash: number, subclassElement: string, openPicker: string | null, togglePicker: (id: string) => void, hoveredSlot: string | null, setHoveredSlot: (id: string | null) => void, handleEquip: (idx: number, hash: number) => void, setOpenPicker: (id: string | null) => void, pickerColumns?: number, pickerAlign?: 'start' | 'center', excludedHashes?: number[], size?: 'normal' | 'large' | 'small' }) {
    const pickerId = `${categoryId}-${indexInCat}`;
    const isOpen = openPicker === pickerId;
    const slotId = `slot-${categoryId}-${indexInCat}`;
    const avail = useMemo(() => item?.socketIndex !== undefined ? getAvailableForSocket(subclassHash, item.socketIndex, excludedHashes) : [], [subclassHash, item?.socketIndex, excludedHashes]);
    const style = useMemo(() => pickerAlign === 'start' ? { '--picker-x': `-${(indexInCat || 0) * 72}px`, left: '0', transform: 'none' } : {}, [pickerAlign, indexInCat]);
    return (
        <div className="subclass-slot-col">
            <span className="slot-label">{customLabel || label}</span>
            <div className="subclass-slot" onMouseEnter={() => setHoveredSlot(slotId)} onMouseLeave={() => setHoveredSlot(null)} onMouseDown={(e) => { e.stopPropagation(); togglePicker(pickerId); }}>
                <SubclassNode type={nodeType} size={size} icon={item?.icon} status={item && item.hash !== 0 ? 'active' : 'empty'} element={subclassElement as any} />
                {hoveredSlot === slotId && !isOpen && item && item.hash !== 0 && <RichTooltip item={makeAbilityItem(item.hash)} overrideElement={subclassElement as any} hideStats={true} />}
                {isOpen && avail.length > 0 && (
                    <AbilityPicker items={avail} columns={pickerColumns} equippedHash={item?.hash} onSelect={(h) => item?.socketIndex !== undefined && handleEquip(item.socketIndex, h)} onClose={() => setOpenPicker(null)} element={subclassElement} style={style as any} type={nodeType} />
                )}
            </div>
        </div>
    );
}
