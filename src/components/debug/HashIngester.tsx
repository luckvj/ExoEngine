
import { useEffect, useState } from 'react';
import { manifestService } from '../../services/bungie/manifest.service';

export const HashIngester = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState('Idle');
    const [output, setOutput] = useState('');
    const [cacheSize, setCacheSize] = useState<number>(0);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) loadManifest();
    }, [isOpen]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: 10,
                    right: 10,
                    padding: '8px 16px',
                    background: '#333',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    zIndex: 9999,
                    fontSize: 12
                }}
            >
                Debug Tools
            </button>
        );
    }

    const loadManifest = () => {
        setStatus('Loading Manifest...');
        manifestService.load()
            .then(() => {
                const defs = (manifestService as any).manifestData?.DestinyInventoryItemDefinition || {};
                const count = Object.keys(defs).length;
                setCacheSize(count);
                setStatus(`Manifest Loaded! Items in cache: ${count}. Ready to process.`);
            })
            .catch(e => setStatus('Manifest Load Failed: ' + e.message));
    };

    const forceUpdate = async () => {
        setStatus('Forcing Manifest Update...');
        try {
            await manifestService.createManifestDatabase(); // Clear/Init DB
            await manifestService.downloadManifest((table, prog) => {
                setStatus(`Downloading ${table}: ${(prog * 100).toFixed(0)}%`);
            });
            loadManifest();
        } catch (e: any) {
            setStatus('Update Failed: ' + e.message);
        }
    };

    const processData = async () => {
        setStatus('Reading file...');
        try {
            const response = await fetch('/raw-hashes.txt');
            const text = await response.text();

            setStatus('Extracting Hashes...');

            const hashSet = new Set<string>();
            const regex = /"itemHash":\s*(\d+)/g;
            let match;

            while ((match = regex.exec(text)) !== null) {
                hashSet.add(match[1]);
            }

            const regex2 = /"hash":\s*(\d+)/g;
            while ((match = regex2.exec(text)) !== null) {
                hashSet.add(match[1]);
            }

            setStatus(`Found ${hashSet.size} unique hashes. Resolving via Manifest...`);

            const newHashes: any = {
                fragments: {},
                classAbilities: {},
                melees: {},
                supers: {},
                grenades: {},
                exoticArmor: {},
                weapons: {},
                others: {}, // Store aspects and unidentified items here
                debug_all: {} // Dump everything here to verify what is actually hitting the loop
            };

            let count = 0;
            const hashes = Array.from(hashSet);
            const debugLog: string[] = [];

            for (let i = 0; i < hashes.length; i++) {
                const hashStr = hashes[i];
                const hash = parseInt(hashStr, 10);
                // Get RAW definition to access properties lost in transformation (itemTypeDisplayName, inventory struct)
                const rawDefs = (manifestService as any).manifestData?.DestinyInventoryItemDefinition || {};
                const def = rawDefs[hash]; // Raw definition

                // Diagnostics
                if (i < 50) {
                    let msg = `[${i}] Hash: ${hash}`;
                    if (def) {
                        msg += ` | FOUND | Name: "${def.displayProperties?.name}" | Type: ${def.itemType} | Disp: ${def.itemTypeDisplayName}`;
                    } else {
                        msg += ` | NOT FOUND`;
                    }
                    debugLog.push(msg);
                }

                if (def && def.displayProperties?.name && def.displayProperties.name !== 'Unknown') {
                    const name = def.displayProperties.name;
                    const displayName = def.itemTypeDisplayName || '';

                    // Match Fragments by Name Prefix
                    let isFragment = name.includes('Fragment') ||
                        name.startsWith('Ember of') ||
                        name.startsWith('Spark of') ||
                        name.startsWith('Echo of') ||
                        name.startsWith('Whisper of') ||
                        name.startsWith('Thread of') ||
                        name.startsWith('Facet of');

                    if (isFragment) {
                        // Identify subclass
                        let subclass = 'UNKNOWN';
                        if (name.startsWith('Ember')) subclass = 'SOLAR';
                        else if (name.startsWith('Spark')) subclass = 'ARC';
                        else if (name.startsWith('Echo')) subclass = 'VOID';
                        else if (name.startsWith('Whisper')) subclass = 'STASIS';
                        else if (name.startsWith('Thread')) subclass = 'STRAND';
                        else if (name.startsWith('Facet')) subclass = 'PRISMATIC';

                        const key = name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '');

                        if (!newHashes.fragments[subclass]) newHashes.fragments[subclass] = {};
                        newHashes.fragments[subclass][key] = hash;
                        count++;
                    } else if (displayName.includes('Class Ability')) {
                        // Class Abilities
                        const key = name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '');
                        const classKey = def.classType === 0 ? 'TITAN' : def.classType === 1 ? 'HUNTER' : def.classType === 2 ? 'WARLOCK' : 'OTHER';
                        if (!newHashes.classAbilities) newHashes.classAbilities = {};
                        if (!newHashes.classAbilities[classKey]) newHashes.classAbilities[classKey] = {};
                        newHashes.classAbilities[classKey][key] = hash;
                        count++;
                    } else if (displayName.includes('Melee')) {
                        // Melees
                        const key = name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '');
                        const classKey = def.classType === 0 ? 'TITAN' : def.classType === 1 ? 'HUNTER' : def.classType === 2 ? 'WARLOCK' : 'OTHER';
                        if (!newHashes.melees) newHashes.melees = {};
                        if (!newHashes.melees[classKey]) newHashes.melees[classKey] = {};
                        newHashes.melees[classKey][key] = hash;
                        count++;
                    } else if (displayName.includes('Super')) {
                        // Supers
                        const key = name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '');
                        const classKey = def.classType === 0 ? 'TITAN' : def.classType === 1 ? 'HUNTER' : def.classType === 2 ? 'WARLOCK' : 'OTHER';
                        if (!newHashes.supers) newHashes.supers = {};
                        if (!newHashes.supers[classKey]) newHashes.supers[classKey] = {};
                        newHashes.supers[classKey][key] = hash;
                        count++;
                    } else if (displayName.includes('Grenade')) {
                        // Grenades
                        const key = name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '');
                        const classKey = def.classType === 0 ? 'TITAN' : def.classType === 1 ? 'HUNTER' : def.classType === 2 ? 'WARLOCK' : 'OTHER';
                        if (!newHashes.grenades) newHashes.grenades = {};
                        if (!newHashes.grenades[classKey]) newHashes.grenades[classKey] = {};
                        newHashes.grenades[classKey][key] = hash;
                        count++;
                    } else if (def.itemType === 2) {
                        // Armor (Possible Exotic)
                        const isExotic = def.inventory?.tierType === 6;
                        const key = name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '');
                        const classKey = def.classType === 0 ? 'TITAN' : def.classType === 1 ? 'HUNTER' : def.classType === 2 ? 'WARLOCK' : 'OTHER';

                        if (isExotic) {
                            if (!newHashes.exoticArmor) newHashes.exoticArmor = {};
                            if (!newHashes.exoticArmor[classKey]) newHashes.exoticArmor[classKey] = {};
                            newHashes.exoticArmor[classKey][key] = hash;
                            count++;
                        }
                    } else if (def.itemType === 19) {
                        // Catch-all for Aspects and other mods
                        // DEBUG: Append itemTypeDisplayName to key to see what it is
                        const key = `${name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '')}__${displayName.replace(/ /g, '_')}`;
                        const classKey = def.classType === 0 ? 'TITAN' : def.classType === 1 ? 'HUNTER' : def.classType === 2 ? 'WARLOCK' : 'OTHER';

                        if (!newHashes.others[classKey]) newHashes.others[classKey] = {};
                        newHashes.others[classKey][key] = hash;
                        count++;
                    }

                    // CAUTION: DEBUG ALL - Dump everything to verify file content
                    if (!newHashes.debug_all) newHashes.debug_all = {};
                    const debugKey = `${name} (${displayName || def.itemType})`.replace(/[^a-zA-Z0-9 ()_-]/g, '');
                    newHashes.debug_all[debugKey] = hash;
                }
            }


            setStatus(`Done! Processed ${count} relevant items.`);

            if (count === 0) {
                setOutput('No relevant items found!\n\nDEBUG LOG (First 50):\n' + debugLog.join('\n'));
            } else {
                setOutput(JSON.stringify(newHashes, null, 2));
            }

        } catch (e: any) {
            setStatus('Error: ' + e.message);
            setOutput(e.stack || e.message);
        }
    };

    return (
        <div style={{ padding: 20, background: '#111', color: '#fff', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Hash Ingester (Debug Tools)</h1>
                <button onClick={() => setIsOpen(false)} style={{ padding: '10px 20px', fontSize: 16, cursor: 'pointer', background: '#c33' }}>Close</button>
            </div>
            <p>1. Ensure <code>public/raw-hashes.txt</code> exists.</p>
            <div style={{ marginBottom: 10 }}>
                <strong>Cache Size:</strong> {cacheSize} items (Expected: ~20,000+)
                {cacheSize < 1000 && <span style={{ color: 'red', marginLeft: 10 }}>WARNING: CACHE EMPTY</span>}
            </div>
            <button onClick={processData} style={{ padding: '10px 20px', fontSize: 16, cursor: 'pointer', marginRight: 10 }}>Process raw-hashes.txt</button>
            <button onClick={async () => {
                setStatus('Scanning Manifest for ALL Exotics...');
                try {
                    const weapons = manifestService.getExoticWeapons();
                    const titanArmor = manifestService.getExoticArmor(0);
                    const hunterArmor = manifestService.getExoticArmor(1);
                    const warlockArmor = manifestService.getExoticArmor(2);

                    // Proper slotting for weapons using raw data
                    const rawDefs = (manifestService as any).manifestData?.DestinyInventoryItemDefinition || {};
                    const categorizedWeapons: any = { KINETIC: {}, ENERGY: {}, POWER: {} };

                    weapons.forEach(w => {
                        const raw = rawDefs[w.hash];
                        // Accessing deep raw property safely
                        const bucketHash = raw?.inventory?.bucketTypeHash;
                        const key = w.name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '');

                        // Destiny Bucket Hashes:
                        // Kinetic: 1498876634
                        // Energy: 2465295030
                        // Power: 953998646
                        if (bucketHash === 1498876634) categorizedWeapons.KINETIC[key] = w.hash;
                        else if (bucketHash === 2465295030) categorizedWeapons.ENERGY[key] = w.hash;
                        else if (bucketHash === 953998646) categorizedWeapons.POWER[key] = w.hash;
                        else {
                            // Fallback to damage type if bucket hash is missing or unknown
                            const damageType = raw?.defaultDamageType;
                            if (damageType === 1 || damageType === 6 || damageType === 7) categorizedWeapons.KINETIC[key] = w.hash;
                            else if (damageType === 2 || damageType === 3 || damageType === 4) categorizedWeapons.ENERGY[key] = w.hash;
                            else categorizedWeapons.KINETIC[key] = w.hash;
                        }
                    });

                    const categorizedArmor: any = { TITAN: {}, HUNTER: {}, WARLOCK: {} };
                    titanArmor.forEach(a => categorizedArmor.TITAN[a.name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '')] = a.hash);
                    hunterArmor.forEach(a => categorizedArmor.HUNTER[a.name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '')] = a.hash);
                    warlockArmor.forEach(a => categorizedArmor.WARLOCK[a.name.toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '')] = a.hash);

                    setOutput(JSON.stringify({ WEAPONS: categorizedWeapons, ARMOR: categorizedArmor }, null, 2));
                    setStatus(`Done! Found ${weapons.length} weapons and ${titanArmor.length + hunterArmor.length + warlockArmor.length} armor pieces.`);
                } catch (e: any) {
                    setStatus('Error: ' + e.message);
                }
            }} style={{ padding: '10px 20px', fontSize: 16, cursor: 'pointer', marginRight: 10, backgroundColor: '#4a4' }}>Scan All Exotics from Manifest</button>
            <button onClick={forceUpdate} style={{ padding: '10px 20px', fontSize: 16, cursor: 'pointer', backgroundColor: '#e66' }}>Force Redownload Manifest</button>
            <div style={{ marginTop: 10 }}>
                <label htmlFor="debug-search" style={{ marginRight: 10 }}>Search Items:</label>
                <input
                    id="debug-search"
                    name="debug-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search item by name (e.g., Still Hunt)"
                    style={{ padding: '10px', fontSize: 16, width: 300, marginRight: 10 }}
                />
                <button onClick={() => {
                    if (!searchQuery.trim()) return;
                    setStatus(`Searching for "${searchQuery}"...`);
                    const results = manifestService.searchItems(searchQuery, { limit: 20 });
                    if (results.length === 0) {
                        setOutput(`No items found matching "${searchQuery}"`);
                    } else {
                        const formatted = results.map(r => `${r.name}: ${r.hash} (${r.tierTypeName || 'Unknown'} ${r.itemTypeDisplayName || ''})`).join('\n');
                        setOutput(`Found ${results.length} items:\n\n${formatted}`);
                    }
                    setStatus(`Found ${results.length} items matching "${searchQuery}"`);
                }} style={{ padding: '10px 20px', fontSize: 16, cursor: 'pointer', backgroundColor: '#66a' }}>Search Items</button>
            </div>
            <div style={{ marginTop: 20, fontSize: 18, fontWeight: 'bold' }}>Status: {status}</div>
            <label htmlFor="debug-output" style={{ display: 'block', marginTop: 10, fontWeight: 'bold' }}>Extraction Output:</label>
            <textarea
                id="debug-output"
                name="debug-output"
                readOnly
                value={output}
                style={{ width: '100%', height: '500px', marginTop: 10, background: '#222', color: '#0f0', fontFamily: 'monospace' }}
            />
        </div>
    );
};
