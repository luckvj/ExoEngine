// import { debugLog, warnLog, errorLog } from '../../utils/logger';
import { manifestService } from './manifest.service';
import { transferService, createMoveSession } from './transfer.service';
import { useProfileStore, useToastStore } from '../../store';
import type { DestinyItem, BuildTemplate } from '../../types';
import { SOCKET_CATEGORY_HASHES, BUCKET_HASHES } from '../../config/bungie.config';
import { syncManager } from './sync-manager.service';
import pako from 'pako';

/**
 * DIM-Compatible Loadout Structure
 * Based on DIM's API loadout format for maximum compatibility
 */
export interface LoadoutShareData {
    id: string;
    name: string;
    classType: 0 | 1 | 2; // Titan, Hunter, Warlock
    equipped: LoadoutItem[];
    unequipped?: LoadoutItem[];
    parameters?: {
        mods?: number[];
        modsByBucket?: {
            [bucketHash: number]: number[];
        };
        query?: string;
        exoticArmorHash?: number;
        statConstraints?: {
            statHash: number;
            minTier?: number;
            maxTier?: number;
            ignored?: boolean;
        }[];
        // Support both old format (artifactPerks) and new DIM API format (artifactUnlocks)
        artifactPerks?: number[];
        artifactUnlocks?: {
            unlockedItemHashes: number[] | string; // DIM API returns string, we normalize to array
            seasonNumber: number;
        };
    };
    notes?: string;
    source?: 'dim' | 'exoengine';
}

export interface LoadoutItem {
    id?: string;        // Item instance ID
    hash: number;      // Item hash
    amount?: number;
    socketOverrides?: {
        [socketIndex: number]: number; // Plug hash
    };
    equip?: boolean;
    craftedDate?: number;
}

// Store last raw response for debugging
let lastRawResponse: any = null;

export function getLastDebugRaw(): string {
    return JSON.stringify(lastRawResponse, null, 2);
}

// DIM's empty socket placeholder hash
const DIM_EMPTY_SOCKET_HASH = 4287799666;

/**
 * Parse DIM's flat mods array into modsByBucket structure
 * DIM uses a separator hash (4287799666) to divide mods between armor pieces
 * Format: [helmet mods...], 4287799666, [gauntlet mods...], 4287799666, etc.
 * Order: Helmet, Gauntlets, Chest, Legs, Class Item
 */
function parseModsArrayToModsByBucket(
    modsArray: number[]
): { [bucketHash: number]: number[] } {
    const modsByBucket: { [bucketHash: number]: number[] } = {};

    // Split the flat array by separator
    const bucketGroups: number[][] = [];
    let currentGroup: number[] = [];
    let foundSeparator = false;

    for (const modHash of modsArray) {
        if (modHash === DIM_EMPTY_SOCKET_HASH) {
            foundSeparator = true;
            if (currentGroup.length > 0) {
                bucketGroups.push([...currentGroup]);
                currentGroup = [];
            }
        } else {
            currentGroup.push(modHash);
        }
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
        bucketGroups.push([...currentGroup]);
    }

    // If no separators found, we don't know the buckets. 
    // Return empty so the viewer can distribute them balanced.
    if (!foundSeparator && bucketGroups.length <= 1) {
        return {};
    }

    // Map groups to bucket hashes in order: Helmet, Gauntlets, Chest, Legs, Class Item
    const armorBuckets = [
        BUCKET_HASHES.HELMET,
        BUCKET_HASHES.GAUNTLETS,
        BUCKET_HASHES.CHEST_ARMOR,
        BUCKET_HASHES.LEG_ARMOR,
        BUCKET_HASHES.CLASS_ARMOR,
    ];

    // Assign each group to its corresponding bucket
    for (let i = 0; i < bucketGroups.length && i < armorBuckets.length; i++) {
        const bucketHash = armorBuckets[i];
        const mods = bucketGroups[i];

        if (mods.length > 0) {
            modsByBucket[bucketHash] = mods;
        }
    }


    return modsByBucket;
}

/**
 * Parse a loadout link (DIM API or ExoEngine format)
 * - DIM API links: https://dim.gg/[shareId]/[slug] - fetches from DIM's server
 * - ExoEngine links: https://exoengine.online/loadout/[base64] - client-side decode
 */
export async function parseLoadoutLink(url: string): Promise<LoadoutShareData | null> {
    try {

        // Check if it's a DIM query parameter format (e.g., ?loadout={json})
        // This format is used by both DIM import URLs and ExoEngine's DIM-compatible links
        const loadoutParamMatch = url.match(/[?&]loadout=([^&]+)/);
        if (loadoutParamMatch) {
            const encodedJson = loadoutParamMatch[1];
            const json = decodeURIComponent(encodedJson);

            const loadout = JSON.parse(json) as LoadoutShareData;

            // Validate structure
            if (!loadout.name || loadout.classType === undefined || !loadout.equipped) {
                throw new Error('Loadout data is missing required fields');
            }

            // Parse flat mods array if present
            if (loadout.parameters?.mods && loadout.parameters.mods.length > 0) {
                const parsedMods = parseModsArrayToModsByBucket(loadout.parameters.mods);
                if (!loadout.parameters.modsByBucket) {
                    loadout.parameters.modsByBucket = parsedMods;
                } else {
                    for (const [bucketHash, mods] of Object.entries(parsedMods)) {
                        const bucket = parseInt(bucketHash);
                        const existing = loadout.parameters.modsByBucket[bucket] || [];
                        loadout.parameters.modsByBucket[bucket] = [...existing, ...mods];
                    }
                }
            }

            return loadout;
        }

        // Check if it's a DIM profile page link (not a loadout share link)
        // These links don't contain loadout data, they're just navigation URLs
        const profilePageMatch = url.match(/destinyitemmanager\.com\/\d+\/d2\/(loadouts|inventory|progress|records|optimizer|collections)/i);
        if (profilePageMatch) {
            throw new Error(
                'This is a DIM profile page link, not a loadout share link. ' +
                'To share a loadout from DIM:\n' +
                '1. Open DIM and go to your Loadouts page\n' +
                '2. Click on a loadout\n' +
                '3. Click the Share button to get a dim.gg share link\n' +
                'Or paste a DIM loadout URL with ?loadout= parameter.'
            );
        }

        // Check if it's a DIM API share link (e.g., https://dim.gg/otjycrq/Unluckvj-Melee)
        const dimApiMatch = url.match(/dim\.gg\/([a-z0-9]+)/i);
        if (dimApiMatch) {
            const shareId = dimApiMatch[1];
            console.log('[LoadoutLink] Fetching DIM loadout:', shareId);

            // Fetch from DIM's public API using our own server-side proxy
            // This bypasses CORS and public proxy restrictions
            const proxyUrl = `/dim-proxy.php?shareId=${shareId}`;

            console.log('[LoadoutLink] Fetching from DIM API via Proxy:', shareId);
            const response = await fetch(proxyUrl);

            if (!response.ok) {
                // Try to get error details from response body
                const errorText = await response.text();
                console.error('[LoadoutLink] Proxy Error Response:', errorText);
                throw new Error(`Failed to fetch loadout from DIM (Status: ${response.status}).`);
            }

            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('[LoadoutLink] Failed to parse JSON. Raw response:', responseText);
                throw new Error('DIM Proxy returned an invalid response. See console for details.');
            }

            lastRawResponse = data; // Store for debugging
            console.log('[LoadoutLink] RAW DIM RESPONSE:', JSON.stringify(data, null, 2));

            if (!data.loadout) {
                throw new Error('No loadout data received from DIM');
            }

            // Parse the flat mods array into modsByBucket
            const loadout = data.loadout as LoadoutShareData;
            if (loadout.parameters?.mods && loadout.parameters.mods.length > 0) {
                const parsedMods = parseModsArrayToModsByBucket(loadout.parameters.mods);

                // Merge parsed mods with existing modsByBucket
                if (!loadout.parameters.modsByBucket) {
                    loadout.parameters.modsByBucket = parsedMods;
                } else {
                    for (const [bucketHash, mods] of Object.entries(parsedMods)) {
                        const bucket = parseInt(bucketHash);
                        const existing = loadout.parameters.modsByBucket[bucket] || [];
                        loadout.parameters.modsByBucket[bucket] = [...existing, ...mods];
                    }
                }

                console.log('[LoadoutLink] Parsed mods array into modsByBucket:', loadout.parameters.modsByBucket);
            }

            console.log('[LoadoutLink] Successfully fetched DIM loadout:', data.loadout.name);
            return loadout;
        }

        // Extract base64 data from URL (ExoEngine format)
        // Supports: https://exoengine.online/loadout/[data]
        //           /loadout/[data]
        const match = url.match(/\/loadout\/([A-Za-z0-9+/=_-]+)/);
        if (!match) {
            if (url.includes('loadout/')) {
                throw new Error('Invalid loadout link format. Please paste a DIM share link or ExoEngine loadout link.');
            }
            throw new Error('Not a recognizable loadout link. Please verify the URL.');
        }

        // Decode base64 (handle URL-safe base64)
        const base64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
        const binaryString = atob(base64);

        // Convert binary string to Uint8Array
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Detect compression type and decompress
        let decoded: string;

        // Check for gzip header (0x1f 0x8b)
        if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
            // Decompress gzipped data
            const decompressed = pako.ungzip(bytes, { to: 'string' });
            decoded = decompressed;
        }
        // Check for zlib/deflate header (0x78)
        else if (bytes[0] === 0x78) {
            // Decompress deflate data
            const decompressed = pako.inflate(bytes, { to: 'string' });
            decoded = decompressed;
        }
        else {
            // Try to decompress as deflate anyway (raw deflate without headers)
            try {
                const decompressed = pako.inflateRaw(bytes, { to: 'string' });
                decoded = decompressed;
            } catch (e) {
                // Plain base64 (uncompressed)
                decoded = binaryString;
            }
        }

        // Trim trailing null bytes but keep internal \x00 markers
        const trimmed = decoded.replace(/\0+$/, '');

        let loadout: LoadoutShareData;

        // Check if it's the new binary format (contains \x00 name separator)
        if (trimmed.includes('\x00') && !trimmed.startsWith('[') && !trimmed.startsWith('{')) {
            // Binary format: name\0classType|hash1,idx:plug|hash2|...
            const nullIdx = trimmed.indexOf('\x00');
            const name = trimmed.substring(0, nullIdx);
            const classType = trimmed.charCodeAt(nullIdx + 1);

            // Find parameters marker if exists
            const paramMarkerIdx = trimmed.indexOf('\x01', nullIdx + 2);
            const itemsSection = paramMarkerIdx > 0
                ? trimmed.substring(nullIdx + 2, paramMarkerIdx)
                : trimmed.substring(nullIdx + 2);

            // Parse items
            const itemParts = itemsSection.split('|').filter(p => p);
            const equipped = itemParts.map(itemStr => {
                const parts = itemStr.split(',');
                const hash = parseInt(parts[0], 36); // Base36 decode
                const socketOverrides: Record<number, number> = {};

                // Parse socket overrides
                for (let i = 1; i < parts.length; i++) {
                    const [idxStr, plugStr] = parts[i].split(':');
                    if (idxStr && plugStr) {
                        socketOverrides[parseInt(idxStr, 36)] = parseInt(plugStr, 36);
                    }
                }

                return { hash, socketOverrides };
            });

            // Parse parameters if they exist
            let parameters: any = undefined;
            if (paramMarkerIdx > 0) {
                const paramSection = trimmed.substring(paramMarkerIdx + 1);
                parameters = {
                    mods: [],
                    modsByBucket: {},
                    exoticArmorHash: undefined
                };

                // Improved Parameter Parsing with Delimiters
                const paramsMap: Record<string, string> = {};
                const segments = paramSection.split(';');
                segments.forEach(seg => {
                    if (seg.includes(':')) {
                        const parts = seg.split(':');
                        const key = parts[0];
                        const val = parts.slice(1).join(':'); // Handle values containing colons
                        if (key && val) paramsMap[key] = val;
                    }
                });

                // Decode General Mods
                if (paramsMap.m) {
                    parameters.mods = paramsMap.m.split(',').map(h => parseInt(h, 36));
                }

                // Decode Mods By Bucket
                if (paramsMap.b) {
                    const groups = paramsMap.b.split('|');
                    groups.forEach(group => {
                        const parts = group.split(':');
                        if (parts.length === 2) {
                            const bucketHash = parseInt(parts[0], 36);
                            const mods = parts[1].split(',').map(h => parseInt(h, 36));
                            parameters.modsByBucket[bucketHash] = mods;
                        }
                    });
                }

                // Decode Exotic Armor Hash
                if (paramsMap.e) {
                    parameters.exoticArmorHash = parseInt(paramsMap.e, 36);
                }

                // Decode Artifact Perks
                if (paramsMap.a) {
                    parameters.artifactPerks = paramsMap.a.split(',').map(h => parseInt(h, 36));
                }
            }

            loadout = {
                id: `imported-${Date.now()}`,
                name,
                classType: classType as 0 | 1 | 2,
                equipped,
                parameters,
                source: 'exoengine'
            };
        } else {
            // Internal formats or DIM JSON fallback
            const parsed = JSON.parse(trimmed);

            // Check if it's the hyper-minimal flat array format
            if (Array.isArray(parsed) && typeof parsed[0] === 'string' && typeof parsed[1] === 'number') {
                // Hyper-minimal format: [name, classType, ...items, null?, ...params]
                const name = parsed[0];
                const classType = parsed[1];

                // Find null marker (if exists) which separates items from params
                let nullIndex = parsed.indexOf(null, 2);
                if (nullIndex === -1) nullIndex = parsed.length;

                // Extract items (from index 2 to null or end)
                const itemsData = parsed.slice(2, nullIndex);
                const equipped = itemsData.map((item: any) => {
                    if (typeof item === 'number') {
                        return { hash: item, socketOverrides: {} };
                    } else if (Array.isArray(item)) {
                        const hash = item[0];
                        const socketOverrides: Record<number, number> = {};
                        // Remaining items are socket pairs [idx, hash, idx, hash, ...]
                        for (let i = 1; i < item.length; i += 2) {
                            socketOverrides[item[i]] = item[i + 1];
                        }
                        return { hash, socketOverrides };
                    }
                    return { hash: item, socketOverrides: {} };
                });

                // Extract parameters if they exist after null marker
                let parameters: any = undefined;
                if (nullIndex < parsed.length - 1) {
                    const paramsData = parsed.slice(nullIndex + 1);
                    parameters = {
                        mods: Array.isArray(paramsData[0]) ? paramsData[0] : [],
                        modsByBucket: typeof paramsData[1] === 'object' && !Array.isArray(paramsData[1]) ? paramsData[1] : {},
                        exoticArmorHash: typeof paramsData[2] === 'number' ? paramsData[2] : undefined,
                        artifactPerks: Array.isArray(paramsData[3]) ? paramsData[3] : []
                    };
                }

                loadout = {
                    id: `imported-${Date.now()}`,
                    name,
                    classType: classType as 0 | 1 | 2,
                    equipped,
                    parameters
                };
            } else if (Array.isArray(parsed) && parsed.length >= 3 && !parsed[0].hasOwnProperty('length')) {
                // Old ultra-minimal format: [name, classType, [equipped]]
                loadout = {
                    id: `imported-${Date.now()}`,
                    name: parsed[0],
                    classType: parsed[1] as 0 | 1 | 2,
                    equipped: parsed[2].map((item: any) => {
                        if (Array.isArray(item)) {
                            const hash = item[0];
                            const socketArray = item[1];
                            const socketOverrides: Record<number, number> = {};

                            if (socketArray) {
                                for (let i = 0; i < socketArray.length; i += 2) {
                                    socketOverrides[socketArray[i]] = socketArray[i + 1];
                                }
                            }

                            return { hash, socketOverrides: Object.keys(socketOverrides).length > 0 ? socketOverrides : {} };
                        }
                        return { hash: item, socketOverrides: {} };
                    }),
                    parameters: parsed[3] ? {
                        mods: parsed[3].m || [],
                        modsByBucket: parsed[3].mb || {},
                        exoticArmorHash: parsed[3].ea,
                        artifactPerks: parsed[3].ap || []
                    } : undefined
                };
            } else if (parsed.n !== undefined && parsed.c !== undefined && parsed.e !== undefined) {
                // Old minimal format (object with short keys)
                loadout = {
                    id: `imported-${Date.now()}`,
                    name: parsed.n,
                    classType: parsed.c as 0 | 1 | 2,
                    equipped: parsed.e.map((item: any) => ({
                        hash: item.h,
                        socketOverrides: item.s || {}
                    })),
                    parameters: parsed.p ? {
                        mods: parsed.p.m || [],
                        modsByBucket: parsed.p.mb || {},
                        exoticArmorHash: parsed.p.ea,
                        artifactPerks: parsed.p.ap || []
                    } : undefined
                };
            } else {
                // Original format (full object keys)
                loadout = parsed as LoadoutShareData;
            }
        }

        // Validate structure
        if (!loadout.name || loadout.classType === undefined || !loadout.equipped) {
            throw new Error('Loadout data is missing required fields');
        }

        // Set source fallback if not explicitly set
        if (loadout && !loadout.source) {
            loadout.source = 'dim';
        }

        return loadout;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to parse loadout link');
    }
}

/**
 * Generate an ExoEngine loadout link (Synchronous)
 * Returns a full https://exoengine.online/loadout/[base64] URL
 */
export function generateExoEngineLink(loadout: LoadoutShareData): string {
    try {
        // Binary encoding for maximum compression
        // Format: name\0classType|hash1,idx:plug,idx:plug|hash2|...

        let binary = '';

        // Encode name (shortened to 20 chars max)
        const shortName = loadout.name.substring(0, 20);
        binary += shortName + '\x00';

        // Encode classType (single byte)
        binary += String.fromCharCode(loadout.classType);

        // Encode equipped items
        loadout.equipped.forEach((item, i) => {
            if (i > 0) binary += '|';
            binary += item.hash.toString(36); // Base36 encoding for numbers

            const sockets = item.socketOverrides;
            if (sockets && Object.keys(sockets).length > 0) {
                Object.entries(sockets).forEach(([idx, hash]) => {
                    binary += ',' + parseInt(idx).toString(36) + ':' + (hash as number).toString(36);
                });
            }
        });

        // Encode parameters if they exist
        if (loadout.parameters) {
            const hasParams =
                (loadout.parameters.mods && loadout.parameters.mods.length > 0) ||
                (loadout.parameters.modsByBucket && Object.keys(loadout.parameters.modsByBucket).length > 0) ||
                loadout.parameters.exoticArmorHash;

            if (hasParams) {
                binary += '\x01'; // Parameters marker

                // Encode parameters with clear delimiters
                if (loadout.parameters.mods && loadout.parameters.mods.length > 0) {
                    binary += `;m:${loadout.parameters.mods.map(m => m.toString(36)).join(',')}`;
                }

                if (loadout.parameters.modsByBucket && Object.keys(loadout.parameters.modsByBucket).length > 0) {
                    const bucketStrings = Object.entries(loadout.parameters.modsByBucket)
                        .map(([bucket, mods]) => {
                            const bucketId = parseInt(bucket).toString(36);
                            const modIds = (mods as number[]).map(m => m.toString(36)).join(',');
                            return `${bucketId}:${modIds}`;
                        });
                    binary += `;b:${bucketStrings.join('|')}`;
                }

                if (loadout.parameters.exoticArmorHash) {
                    binary += `;e:${loadout.parameters.exoticArmorHash.toString(36)}`;
                }

                if (loadout.parameters.artifactPerks && loadout.parameters.artifactPerks.length > 0) {
                    binary += `;a:${loadout.parameters.artifactPerks.map(p => p.toString(36)).join(',')}`;
                }
            }
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(binary);

        // Compress with maximum level
        const compressed = pako.deflate(data, { level: 9, windowBits: 15 });

        // Use base64url encoding
        const base64 = btoa(String.fromCharCode(...compressed))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://exoengine.online';
        return `${origin}/loadout/${base64}`;
    } catch (error) {
        throw error;
    }
}

/**
 * Generate a DIM-compatible link
 * Uses the app.destinyitemmanager.com/loadouts?loadout= format
 */
export function generateDIMCompatibleLink(loadout: LoadoutShareData): string {
    try {
        const cleanLoadout = {
            id: loadout.id,
            name: loadout.name,
            classType: loadout.classType,
            equipped: loadout.equipped,
            unequipped: loadout.unequipped || [],
            parameters: loadout.parameters,
            notes: loadout.notes,
            destinyVersion: 2,
            game: 'd2',
            source: 'ExoEngine'
        };

        const json = JSON.stringify(cleanLoadout);
        const encoded = encodeURIComponent(json);

        return `https://app.destinyitemmanager.com/loadouts?loadout=${encoded}`;
    } catch (error) {
        throw error;
    }
}

/**
 * Orchestrates the application of a loadout
 */
export async function applyLoadout(
    loadout: LoadoutShareData,
    characterId: string,
    onProgress: (step: string, progress: number) => void
): Promise<{ success: boolean; error?: string }> {
    try {
        onProgress('Analyzing inventory...', 10);

        // 1. Find items in profile inventory
        const state = useProfileStore.getState();
        const allItems = [
            ...state.vaultInventory,
            ...Object.values(state.characterInventories as Record<string, DestinyItem[]>).flat(),
            ...Object.values(state.characterEquipment as Record<string, DestinyItem[]>).flat()
        ];

        const itemsToMove: { instanceId: string; hash: number; currentOwner: string }[] = [];
        const missingItems: string[] = [];
        const itemsToEquip: DestinyItem[] = [];

        for (const itemRef of loadout.equipped) {
            const def = manifestService.getItem(itemRef.hash);
            const foundItem = allItems.find(i => i.itemHash === itemRef.hash);

            if (foundItem && foundItem.itemInstanceId) {
                itemsToEquip.push(foundItem);

                // Determine current owner
                let currentOwner = 'vault';
                if (state.vaultInventory.find(i => i.itemInstanceId === foundItem.itemInstanceId)) {
                    currentOwner = 'vault';
                } else {
                    for (const [charId, inv] of Object.entries(state.characterInventories as Record<string, DestinyItem[]>)) {
                        if (inv.find(i => i.itemInstanceId === foundItem.itemInstanceId)) currentOwner = charId;
                    }
                    for (const [charId, eq] of Object.entries(state.characterEquipment as Record<string, DestinyItem[]>)) {
                        if (eq.find(i => i.itemInstanceId === foundItem.itemInstanceId)) currentOwner = charId;
                    }
                }

                itemsToMove.push({
                    instanceId: foundItem.itemInstanceId,
                    hash: itemRef.hash,
                    currentOwner
                });
            } else if (def && def.itemType !== 16) { // Ignore Subclass (handled separately)
                missingItems.push(def.name);
            }
        }

        // DIM STANDARD: Proactive Conflict Resolution
        // De-equip conflicting exotics BEFORE moving anything to avoid 1641 errors
        onProgress('Resolving exotic conflicts...', 15);
        await transferService.orchestrateBulkDequip(characterId, itemsToEquip);

        // 3. Transfer Items (Strict Sequential Queue - DIM Standard)
        onProgress('Transferring items...', 20);
        const session = createMoveSession(itemsToMove.map(i => i.instanceId));

        let movedCount = 0;
        // DIM Standard: Process moves one-by-one to allow Bungie API to settle
        for (const item of itemsToMove) {
            if (item.currentOwner === characterId) {
                movedCount++;
                continue;
            }

            const progress = 20 + Math.floor((movedCount / itemsToMove.length) * 40);
            onProgress(`Transferring ${movedCount + 1}/${itemsToMove.length}...`, progress);

            try {
                // Execute move and WAIT for Bungie's confirmation before starting the next
                const success = await transferService.moveItem(
                    { itemHash: item.hash, itemInstanceId: item.instanceId } as any,
                    item.currentOwner,
                    characterId,
                    session,
                    { silent: true }
                );

                if (!success) {
                    console.warn(`[LoadoutLink] Sequential move failed for item ${item.hash}, continuing...`);
                }
            } catch (e) {
                console.error(`[LoadoutLink] Critical error in sequential move for item ${item.hash}:`, e);
            }
            movedCount++;
        }
        console.log(`[LoadoutLink] Sequential transfer phase complete: ${movedCount} items processed`);

        // 4. Equip Items (Bulk API)
        onProgress('Equipping items...', 70);
        const equipIds = itemsToMove.map(i => i.instanceId);
        // Bulk equip is much faster than individual equips
        await transferService.equipItems(equipIds, characterId, 0, { silent: true });

        // CRITICAL: Settle delay after moves/equips. 
        // Bungie's API needs a moment to realize the item is actually on the character before we can socket it.
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 5. Apply Subclass & Item Configuration
        // Note: Socket insertions (mods/perks) MUST remain sequential to avoid 500 errors
        onProgress('Configuring subclass and perks...', 85);

        // 5a. Handle Subclass (Fragments, Aspects, etc.)
        const subclassRef = loadout.equipped.find(i => {
            const def = manifestService.getItem(i.hash);
            return def?.itemType === 16;
        });

        if (subclassRef && subclassRef.socketOverrides) {
            const state = useProfileStore.getState();
            const subclassItem = [...(state.characterEquipment[characterId] || []), ...(state.characterInventories[characterId] || [])]
                .find(i => i.itemHash === subclassRef.hash);

            if (subclassItem?.itemInstanceId) {
                const template = convertToBuildTemplate(loadout);
                try {
                    await transferService.applySubclassConfiguration(
                        subclassItem,
                        template.subclassConfig,
                        characterId,
                        onProgress
                    );
                } catch (e) {
                    console.warn('[LoadoutLink] Subclass config failed (partial application):', e);
                }
            }
        }

        // 5b. Handle Item Socket Overrides (Weapon/Armor Perks & Mods)
        onProgress('Applying item perks and mods...', 90);
        const socketItems = loadout.equipped.filter(i => i.socketOverrides && Object.keys(i.socketOverrides).length > 0);

        for (let i = 0; i < socketItems.length; i++) {
            const itemRef = socketItems[i];
            const state = useProfileStore.getState();
            const foundItem = [...(state.characterEquipment[characterId] || []), ...(state.characterInventories[characterId] || [])]
                .find(i => i.itemHash === itemRef.hash);

            if (foundItem?.itemInstanceId) {
                const overrides = itemRef.socketOverrides as Record<number, number>;
                const progress = 90 + Math.floor((i / socketItems.length) * 5);
                onProgress(`Applying perks (${i + 1}/${socketItems.length})...`, progress);

                try {
                    await transferService.applyItemSocketOverrides(foundItem.itemInstanceId, overrides, characterId);
                } catch (e) {
                    console.warn(`[LoadoutLink] Socket override failed for item ${itemRef.hash}:`, e);
                }
            }
        }

        // 6. Apply Mods (Parameters)
        if (loadout.parameters?.mods && loadout.parameters.mods.length > 0) {
            onProgress('Applying general mods...', 95);
            try {
                await transferService.applyArmorMods(characterId, loadout.parameters.mods, onProgress);
            } catch (e) {
                console.warn('[LoadoutLink] Armor mods application failed (partial application):', e);
            }
        }

        onProgress('Loadout applied!', 100);

        // Consolidated success notification
        const { addToast } = useToastStore.getState();
        addToast({
            type: 'success',
            message: `Loadout "${loadout.name}" applied successfully!`,
            duration: 5000
        });

        // Crucial: Trigger an immediate sync to verify the new state and provide a clean slate for sequential operations
        // This ensures that the NEXT loadout applied starts with fresh, confirmed item locations.
        // Also includes a delay for Bungie API to settle.
        await syncManager.triggerImmediateSync();

        if (missingItems.length > 0) {
            return {
                success: true,
                error: `Partial success. Missing ${missingItems.length} items: ${missingItems.slice(0, 2).join(', ')}${missingItems.length > 2 ? '...' : ''}`
            };
        }

        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * Converts a shared loadout to a saved build template
 */
/**
 * Converts a shared loadout to a saved build template
 */
export function convertToBuildTemplate(loadout: LoadoutShareData): BuildTemplate {

    // 1. Identify Subclass
    const subclassItem = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        // DIM Standard: Check both itemType (16) and bucket (Subclass)
        return def?.itemType === 16 || def?.inventory?.bucketTypeHash === BUCKET_HASHES.SUBCLASS;
    });

    // Derive element from subclass damage type
    let derivedElement = 'solar';
    if (subclassItem) {
        const subDef = manifestService.getItem(subclassItem.hash) as any;
        const damageType = subDef?.talentGrid?.hudDamageType || subDef?.defaultDamageType || 0;
        const damageTypeMap: Record<number, string> = {
            1: 'kinetic',
            2: 'arc',
            3: 'solar',
            4: 'void',
            5: 'stasis',
            6: 'strand',
            7: 'prismatic'
        };
        derivedElement = damageTypeMap[damageType] || 'solar';
    }

    const exoticWeapon = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        return def?.tierType === 6 && def.itemType === 3;
    });

    const exoticArmor = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        return def?.tierType === 6 && def.itemType === 2;
    });

    // 2. Parse Subclass Config
    const subclassConfig: BuildTemplate['subclassConfig'] = {
        subclassHash: subclassItem?.hash,
        superHash: 0,
        aspects: [],
        fragments: [],
        grenadeHash: 0,
        meleeHash: 0,
        classAbilityHash: 0
    };

    if (subclassItem && subclassItem.socketOverrides) {
        const subDef = manifestService.getItem(subclassItem.hash) as any;
        if (subDef && subDef.sockets) {
            const getSocketCategory = (index: number) => {
                const cats = subDef.sockets.socketCategories || subDef.sockets.categories;
                return cats?.find((c: any) => c.socketIndexes.includes(index))?.socketCategoryHash;
            };

            for (const [indexStr, plugHash] of Object.entries(subclassItem.socketOverrides)) {
                const index = parseInt(indexStr);
                const hash = plugHash as number;
                const catHash = getSocketCategory(index);
                const plugDef = manifestService.getItem(hash);

                if (catHash === SOCKET_CATEGORY_HASHES.SUPER) subclassConfig.superHash = hash;
                else if (catHash === SOCKET_CATEGORY_HASHES.ABILITIES) {
                    if (plugDef) {
                        const id = (plugDef as any).plug?.plugCategoryIdentifier || '';
                        if (id.includes('class_abilities')) subclassConfig.classAbilityHash = hash;
                        else if (id.includes('grenades')) subclassConfig.grenadeHash = hash;
                        else if (id.includes('melee')) subclassConfig.meleeHash = hash;
                        else if (plugDef.itemType === 16) subclassConfig.superHash = hash;
                    }
                }
                else if (catHash === SOCKET_CATEGORY_HASHES.ASPECTS) subclassConfig.aspects?.push(hash);
                else if (catHash === SOCKET_CATEGORY_HASHES.FRAGMENTS) subclassConfig.fragments?.push(hash);
                // Direct plug check fallback
                else if (plugDef) {
                    const id = (plugDef as any).plug?.plugCategoryIdentifier || '';
                    if (id.includes('aspects')) subclassConfig.aspects?.push(hash);
                    else if (id.includes('fragments')) subclassConfig.fragments?.push(hash);
                    else if (id.includes('super')) subclassConfig.superHash = hash;
                }
            }
        }
    }

    // 3. Other Items (Legendaries, etc.)
    const items: BuildTemplate['items'] = [];
    for (const item of loadout.equipped) {
        // Skip Exotics and Subclass as they are explicitly handled
        if (item.hash === exoticWeapon?.hash || item.hash === exoticArmor?.hash || item.hash === subclassItem?.hash) continue;

        const def = manifestService.getItem(item.hash);
        if (def) {
            items.push({ hash: item.hash, name: def.name, socketOverrides: item.socketOverrides });
        } else {
            items.push({ hash: item.hash, name: 'Unknown', socketOverrides: item.socketOverrides });
        }
    }

    return {
        id: loadout.id || `imported-${Date.now()}`,
        name: loadout.name || 'Imported Loadout',
        element: derivedElement as any,
        guardianClass: loadout.classType,
        exoticWeapon: {
            hash: exoticWeapon?.hash || 0,
            name: 'Unknown',
            slot: 1
        },
        exoticArmor: {
            hash: exoticArmor?.hash || 0,
            name: 'Unknown',
            slot: 0
        },
        subclassConfig,
        armorMods: loadout.parameters?.mods || [],
        artifactPerks: loadout.parameters?.artifactPerks || [],
        items, // Full Loadout Fidelity
        playstyle: 'Imported from Loadout Link',
        difficulty: 'intermediate'
    };
}

/**
 * Converts a BuildTemplate back to LoadoutShareData for link sharing
 */
export function convertBuildToLoadoutShareData(build: BuildTemplate): LoadoutShareData {
    const equipped: LoadoutItem[] = [];

    // Subclass Item Hash Lookup by Class (0=Titan, 1=Hunter, 2=Warlock) + Element
    // These are the actual subclass ITEM hashes (not ability hashes)
    const SUBCLASS_ITEM_HASHES: Record<string, number> = {
        // Titan
        '0-Arc': 2932390016,
        '0-Solar': 2550323932,
        '0-Void': 4178525824,
        '0-Stasis': 613647804,
        '0-Strand': 242419065,
        '0-Prismatic': 3450112461,
        // Hunter
        '1-Arc': 2328211300,
        '1-Solar': 2240888816,
        '1-Void': 2453351420,
        '1-Stasis': 873720784,
        '1-Strand': 3785442599,
        '1-Prismatic': 1040198773,
        // Warlock
        '2-Arc': 3168997075,
        '2-Solar': 3941205951,
        '2-Void': 2849050827,
        '2-Stasis': 3291545503,
        '2-Strand': 4204413574,
        '2-Prismatic': 2806388174,
    };

    // Add Exotic Weapon with socketOverrides if available
    if (build.exoticWeapon?.hash && build.exoticWeapon.hash > 0) {
        equipped.push({
            hash: build.exoticWeapon.hash,
            socketOverrides: (build.exoticWeapon as any).socketOverrides || {}
        });
    }

    // Add Exotic Armor with socketOverrides if available
    if (build.exoticArmor?.hash && build.exoticArmor.hash > 0) {
        equipped.push({
            hash: build.exoticArmor.hash,
            socketOverrides: build.exoticArmor.socketOverrides || {}
        });
    }

    // Add Legendaries/Other Items
    if (build.items) {
        build.items.forEach(item => equipped.push({ hash: item.hash, socketOverrides: item.socketOverrides || {} }));
    }

    // Derive subclass item hash from class + element if not explicitly provided
    const elementKey = typeof build.element === 'string'
        ? build.element.charAt(0).toUpperCase() + build.element.slice(1).toLowerCase()
        : String(build.element);
    const subclassLookupKey = `${build.guardianClass}-${elementKey}`;
    const subclassHash = build.subclassConfig?.subclassHash || SUBCLASS_ITEM_HASHES[subclassLookupKey] || 0;

    if (subclassHash) {
        const subclassOverrides: Record<number, number> = {};
        const subDef = manifestService.getItem(subclassHash) as any;

        if (subDef?.sockets?.socketCategories) {
            const findIndices = (categoryHashes: number[]) => {
                return categoryHashes.flatMap(h => {
                    const cat = subDef.sockets.socketCategories.find((c: any) => c.socketCategoryHash === h);
                    return cat ? cat.socketIndexes : [];
                }).sort((a, b) => a - b);
            };

            const aspectIndices = findIndices([
                SOCKET_CATEGORY_HASHES.ASPECTS,
                SOCKET_CATEGORY_HASHES.ASPECTS_IKORA,
                SOCKET_CATEGORY_HASHES.ASPECTS_STRANGER,
                SOCKET_CATEGORY_HASHES.ASPECTS_NEOMUNA
            ]);

            const fragmentIndices = findIndices([
                SOCKET_CATEGORY_HASHES.FRAGMENTS,
                SOCKET_CATEGORY_HASHES.FRAGMENTS_IKORA,
                SOCKET_CATEGORY_HASHES.FRAGMENTS_STRANGER,
                SOCKET_CATEGORY_HASHES.FRAGMENTS_NEOMUNA
            ]);

            const superIndices = findIndices([SOCKET_CATEGORY_HASHES.SUPER]);

            // Assign Super
            if (build.subclassConfig?.superHash && superIndices.length > 0) {
                subclassOverrides[superIndices[0]] = build.subclassConfig.superHash;
            }

            // Assign Aspects
            if (build.subclassConfig?.aspects) {
                build.subclassConfig.aspects.forEach((hash, i) => {
                    if (hash && i < aspectIndices.length) subclassOverrides[aspectIndices[i]] = hash;
                });
            }

            // Assign Fragments
            if (build.subclassConfig?.fragments) {
                build.subclassConfig.fragments.forEach((hash, i) => {
                    if (hash && i < fragmentIndices.length) subclassOverrides[fragmentIndices[i]] = hash;
                });
            }

            // Assign Abilities (Greande, Melee, Class) using strict plug compatibility checking
            // We iterate through available ability sockets and check if the specific ability plug fits
            const abilityIndices = findIndices([
                SOCKET_CATEGORY_HASHES.ABILITIES,
                SOCKET_CATEGORY_HASHES.ABILITIES_IKORA
            ]);

            const abilitiesToSocket = [
                build.subclassConfig?.classAbilityHash,
                build.subclassConfig?.meleeHash,
                build.subclassConfig?.grenadeHash
            ].filter(Boolean) as number[];

            abilitiesToSocket.forEach(abilityHash => {
                const plugDef = manifestService.getItem(abilityHash) as any;
                if (!plugDef) return;

                // Find the first empty ability socket that accepts this plug
                const targetIndex = abilityIndices.find(socketIndex => {
                    // Check if already occupied by our overrides
                    if (subclassOverrides[socketIndex]) return false;

                    // Check if socket accepts this plug category
                    const socketEntry = subDef.sockets.socketEntries[socketIndex];
                    if (!socketEntry) return false;

                    const socketType = manifestService.getRawDefinition('DestinySocketTypeDefinition', socketEntry.socketTypeHash);
                    if (!socketType?.plugWhitelist) return false;

                    return socketType.plugWhitelist.some((w: any) => w.categoryHash === plugDef.plug?.plugCategoryHash);
                });

                if (targetIndex !== undefined) {
                    subclassOverrides[targetIndex] = abilityHash;
                }
            });

        } else {
            // Fallback for missing manifest data (Legacy behavior)
            if (build.subclassConfig?.superHash) subclassOverrides[0] = build.subclassConfig.superHash;

            // Aspects
            if (build.subclassConfig?.aspects?.[0]) subclassOverrides[1] = build.subclassConfig.aspects[0];
            if (build.subclassConfig?.aspects?.[1]) subclassOverrides[2] = build.subclassConfig.aspects[1];

            // Fragments
            build.subclassConfig?.fragments?.forEach((hash, i) => {
                if (hash) subclassOverrides[10 + i] = hash;
            });

            // Abilities
            if (build.subclassConfig?.grenadeHash) subclassOverrides[20] = build.subclassConfig.grenadeHash;
            if (build.subclassConfig?.meleeHash) subclassOverrides[21] = build.subclassConfig.meleeHash;
            if (build.subclassConfig?.classAbilityHash) subclassOverrides[22] = build.subclassConfig.classAbilityHash;
        }

        equipped.push({
            hash: subclassHash,
            socketOverrides: subclassOverrides
        });
    }

    return {
        id: build.id,
        name: build.name,
        classType: build.guardianClass,
        equipped,
        parameters: {
            mods: build.armorMods,
            exoticArmorHash: build.exoticArmor?.hash,
            artifactPerks: build.artifactPerks,
            // Future: Group mods by bucket if needed for 100% DIM parity
        }
    };
}


/**
 * Generate an ExoEngine loadout link from LoadoutShareData
 */
async function generateLoadoutLink(loadout: LoadoutShareData): Promise<string> {
    try {
        // Encode the loadout data
        const jsonString = JSON.stringify(loadout);
        const encoder = new TextEncoder();
        const data = encoder.encode(jsonString);

        // Compress using CompressionStream if available
        if (typeof CompressionStream !== 'undefined') {
            const stream = new Blob([data]).stream();
            const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
            const compressedBlob = await new Response(compressedStream).blob();
            const compressedData = new Uint8Array(await compressedBlob.arrayBuffer());

            // Base64 encode
            const base64 = btoa(String.fromCharCode(...compressedData));
            const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

            return `/loadout/${urlSafe}`;
        } else {
            // Fallback: Just base64 encode without compression
            const base64 = btoa(jsonString);
            const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

            return `/loadout/${urlSafe}`;
        }
    } catch (error) {
        throw new Error('Failed to generate loadout link');
    }
}

/**
 * Generate a DIM-compatible loadout link from LoadoutShareData
 */
async function generateDIMLink(): Promise<string> {
    try {
        // DIM uses their own API to create shareable links
        // For now, we'll generate an ExoEngine link since we can't directly create DIM links
        // without calling DIM's API with authentication

        // Alternative: Return a message that DIM links require DIM's API
        throw new Error('DIM link generation requires DIM API access. Use ExoEngine link instead (S key).');

        // NOTE: Future enhancement if DIM API access is granted:
        // - POST to https://api.destinyitemmanager.com/loadout/share
        // - Return dim.gg share URL
    } catch (error: any) {
        throw error;
    }
}

export const loadoutLinkService = {
    parseLoadoutLink,
    generateExoEngineLink,
    generateDIMCompatibleLink,
    generateLoadoutLink,
    generateDIMLink,
    getLastDebugRaw,
    importDIMJson,
    convertToBuildTemplate,
    convertBuildToLoadoutShareData
};

export function importDIMJson(json: any): LoadoutShareData[] {
    const loadouts: LoadoutShareData[] = [];

    // Format 1: Direct LoadoutShareData object
    if (json.name && json.equipped) {
        loadouts.push(json as LoadoutShareData);
    }
    // Format 2: DIM Backup JSON (e.g. dim-data.json)
    else if (json.loadouts && Array.isArray(json.loadouts)) {
        json.loadouts.forEach((entry: any) => {
            if (entry.loadout) {
                loadouts.push(entry.loadout as LoadoutShareData);
            }
        });
    }

    return loadouts;
}
