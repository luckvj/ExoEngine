import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useProfileStore } from '../store';
import { itemSearchService } from '../services/item-search.service';
import { transferService } from '../services/bungie/transfer.service';
import { profileLoader } from '../services/bungie/profile.service';
import { parseCommand } from '../services/agent-command.service';
import { subclassParserService } from '../services/subclass-parser.service';
import { BUCKET_HASHES } from '../config/bungie.config';
import { ElementType, GuardianClass, ItemSlot, type BuildTemplate } from '../types';
import './AgentWakePage.css';

export function AgentWakePage() {
    const navigate = useNavigate();
    const [input, setInput] = useState('');
    const [response, setResponse] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { selectedCharacterId } = useProfileStore();
    const { isAuthenticated } = useAuthStore();
    const state = useProfileStore.getState();
    const character = state.characters.find(c => c.characterId === selectedCharacterId) || state.characters[0];

    const handleSingleEquip = async (itemIdentifier: string, isHash: boolean) => {
        try {
            if (!isAuthenticated) {
                setResponse('Please log in to Bungie to equip items. Authenticate using the button in the top right.');
                return;
            }

            if (!selectedCharacterId) {
                setResponse('Please select a character first.');
                return;
            }

            // NOTICE: Removed intermediate "Syncing..." and "Searching..." responses to reduce UI flicker
            await profileLoader.loadProfile(true);

            let searchResult;
            if (isHash) {
                const itemHash = parseInt(itemIdentifier, 10);
                searchResult = await itemSearchService.findItemByHash(itemHash);
            } else {
                searchResult = await itemSearchService.findItemByName(itemIdentifier);
            }

            if (!searchResult) {
                // If it's not a physical item, check if it's a subclass component (aspect/fragment)
                const isSubclassComponent = subclassParserService.containsSubclassKeywords(itemIdentifier);
                if (isSubclassComponent) {
                    // It's a subclass component, proceed to subclassConfig parsing
                } else {
                    setResponse(`Could not find "${itemIdentifier}" in your inventory.`);
                    return;
                }
            }

            const definition = searchResult?.definition;
            const item = searchResult?.item;
            const isExotic = item?.tierType === 6;

            const template: any = {
                name: definition ? `Agent: ${definition.displayProperties.name}` : `Agent: Subclass Config`,
                element: ElementType.Solar,
                items: (item && definition && !isExotic) ? [{ hash: item.itemHash, name: definition.displayProperties.name }] : []
            };

            if (item && definition) {
                if (isExotic) {
                    if (definition.itemType === 3) template.exoticWeapon = { hash: item.itemHash, name: definition.displayProperties.name, slot: ItemSlot.Kinetic };
                    if (definition.itemType === 2) template.exoticArmor = { hash: item.itemHash, name: definition.displayProperties.name, slot: ItemSlot.Helmet };
                }
            }

            // Determine current subclass for context
            const currentSubclassItem = (state.characterEquipment?.[selectedCharacterId] || [])
                .find(i => i.bucketHash === BUCKET_HASHES.SUBCLASS);
            const currentSubclassHash = currentSubclassItem?.itemHash;

            // Parse subclass configuration
            const subclassConfig = subclassParserService.parseSubclassConfig(itemIdentifier, character.classType);

            // ENFORCE EXPLICIT SUBCLASS: If abilities were found but no explicit subclass name was mentioned
            if (subclassConfig && !subclassConfig.subclassName) {
                setResponse("Please specify the subclass, e.g. 'equip prismatic subclass with hellion and feed the void'");
                return;
            }

            const currentSubclassName = currentSubclassHash ? subclassParserService.identifySubclassByHash(currentSubclassHash) : undefined;
            let targetElement = subclassConfig?.element || currentSubclassName;

            const config = subclassConfig ? {
                ...subclassConfig,
                aspects: subclassConfig.aspects?.map(a => typeof a === 'string' ? parseInt(a, 10) || 0 : a).filter(a => a !== 0),
                fragments: subclassConfig.fragments?.map(f => typeof f === 'string' ? parseInt(f, 10) || 0 : f).filter(f => f !== 0),
                superHash: typeof subclassConfig.super === 'string' ? parseInt(subclassConfig.super, 10) || 0 : subclassConfig.super,
                grenadeHash: typeof subclassConfig.grenade === 'number' ? subclassConfig.grenade : undefined,
                meleeHash: typeof subclassConfig.melee === 'number' ? subclassConfig.melee : undefined,
                classAbilityHash: typeof subclassConfig.classAbility === 'number' ? subclassConfig.classAbility : undefined,
                jumpHash: typeof (subclassConfig as any).jump === 'number' ? (subclassConfig as any).jump : undefined,
            } : undefined;

            if (subclassConfig && config) {
                template.element = (targetElement as ElementType) || ElementType.Neutral;
                template.subclassConfig = config;
                template.skipSubclassSwap = !!targetElement && targetElement === currentSubclassName;
            } else {
                template.element = ElementType.Neutral;
                template.skipSubclassSwap = true;
            }

            let actionText = config ? (definition ? `Equipping ${definition.displayProperties.name} and configuring subclass...` : `Configuring subclass abilities...`) : `Equipping ${definition?.displayProperties.name} now...`;

            // NOTICE: Inform user about explicit subclass naming if missing
            if (subclassConfig && !subclassConfig.subclassName) {
                actionText = `Note: For best results, specify the subclass (e.g. 'equip prismatic subclass with hellion'). ${actionText}`;
            }

            setResponse(actionText);

            // Navigate early so user can watch transmats
            navigate('/galaxy');

            const result = await transferService.equipBuild(template, selectedCharacterId);

            if (result.success) {
                setResponse(result.error || `${definition?.displayProperties.name || 'Item'} equipped!`);
            } else {
                setResponse(`Failed to equip: ${result.error || 'Unknown error'}`);
            }

        } catch (error) {
            setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    };

    const handleBatchEquip = async (items: Array<{ itemIdentifier: string; isHash: boolean }>) => {
        try {
            if (!isAuthenticated) {
                setResponse('Login required to pull items. Please authenticate with Bungie first.');
                return;
            }

            if (!selectedCharacterId) {
                setResponse('Please select a character.');
                return;
            }

            // NOTICE: Removed intermediate "Syncing..." response
            await profileLoader.loadProfile(true);

            const searchResults = [];
            for (const { itemIdentifier, isHash } of items) {
                let searchResult;
                if (isHash) {
                    searchResult = await itemSearchService.findItemByHash(parseInt(itemIdentifier, 10));
                } else {
                    searchResult = await itemSearchService.findItemByName(itemIdentifier);
                }

                if (!searchResult) {
                    const isSubclassComponent = subclassParserService.containsSubclassKeywords(itemIdentifier);
                    if (!isSubclassComponent) {
                        setResponse(`Could not find "${itemIdentifier}" in your inventory.`);
                        return;
                    }
                    // Skip adding for subclass components in batch (they are handled by subclassConfig later)
                    continue;
                }
                searchResults.push(searchResult);
            }

            if (searchResults.length === 0 && !subclassParserService.containsSubclassKeywords(items.map(i => i.itemIdentifier).join(' '))) {
                setResponse('No items or subclass components found to equip.');
                return;
            }

            const itemNames = searchResults.map(r => r.definition.displayProperties.name).join(', ');
            setResponse(`Pulling items now... (${itemNames})`);

            // Navigate early so user can watch transmats
            navigate('/galaxy');

            const weapons = searchResults.filter(r => r.definition.itemType === 3);
            const armor = searchResults.filter(r => r.definition.itemType === 2);
            const exoticWeapon = weapons.find(r => r.definition.inventory?.tierType === 6);
            const exoticArmor = armor.find(r => r.definition.inventory?.tierType === 6);
            const legendaryItems = searchResults.filter(r => r.definition.inventory?.tierType !== 6);

            const detectElement = (results: any[]) => {
                const exoticW = results.find(r => r.definition.itemType === 3 && r.definition.inventory?.tierType === 6);
                if (exoticW) {
                    const dt = exoticW.definition.defaultDamageType;
                    if (dt === 2) return ElementType.Arc;
                    if (dt === 3) return ElementType.Solar;
                    if (dt === 4) return ElementType.Void;
                    if (dt === 6) return ElementType.Stasis;
                    if (dt === 7) return ElementType.Strand;
                }
                return ElementType.Neutral;
            };

            const buildTemplate: BuildTemplate = {
                id: `agent-batch-${Date.now()}`,
                name: `Agent Batch: ${itemNames}`,
                element: detectElement(searchResults),
                guardianClass: searchResults[0].definition.classType as GuardianClass,
                exoticWeapon: exoticWeapon ? { hash: exoticWeapon.item.itemHash, name: exoticWeapon.definition.displayProperties.name, slot: ItemSlot.Kinetic } : undefined,
                exoticArmor: exoticArmor ? { hash: exoticArmor.item.itemHash, name: exoticArmor.definition.displayProperties.name, slot: ItemSlot.Helmet } : undefined,
                items: legendaryItems.map(r => ({ hash: r.item.itemHash, name: r.definition.displayProperties.name })),
                subclassConfig: undefined,
                playstyle: 'Agent Loadout',
                difficulty: 'intermediate',
                armorMods: [],
                skipSubclassSwap: true // Batch identify should never change subclass
            };

            const result = await transferService.equipBuild(
                buildTemplate,
                selectedCharacterId
            );

            if (result.success) {
                setResponse(result.error || `Successfully equipped ${itemNames}!`);
            } else {
                setResponse(`Failed: ${result.error || 'Check inventory space'}`);
            }
        } catch (error) {
            setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleLoadoutAction = async (items: Array<{ itemIdentifier: string; isHash: boolean }>, resultPayload: any) => {
        try {
            if (!isAuthenticated) {
                setResponse('Login required. Please authenticate first.');
                return;
            }

            if (!selectedCharacterId) {
                setResponse('Character ID not found.');
                return;
            }

            await profileLoader.loadProfile(true);
            const newState = useProfileStore.getState();
            const character = newState.getSelectedCharacter();
            if (!character) {
                setResponse('Could not find character information.');
                return;
            }

            const configRaw = resultPayload.subclassText ? subclassParserService.parseSubclassConfig(resultPayload.subclassText, character.classType) : null;

            let responseText = `Configuring loadout...`;
            if (configRaw && !configRaw.subclassName) {
                responseText = `Note: For best results, specify the subclass (e.g. 'equip prismatic subclass with hellion'). Configuring loadout...`;
            }
            setResponse(responseText);

            const searchResults = [];
            for (const { itemIdentifier, isHash } of items) {
                let searchResult;
                if (isHash) {
                    searchResult = await itemSearchService.findItemByHash(parseInt(itemIdentifier, 10));
                } else {
                    searchResult = await itemSearchService.findItemByName(itemIdentifier);
                }
                if (searchResult) searchResults.push(searchResult);
            }

            const weapons = searchResults.filter(r => r.definition.itemType === 3);
            const armor = searchResults.filter(r => r.definition.itemType === 2);
            const exoticWeapon = weapons.find(r => r.definition.inventory?.tierType === 6);
            const exoticArmor = armor.find(r => r.definition.inventory?.tierType === 6);
            const legendaryItems = searchResults.filter(r => r.definition.inventory?.tierType !== 6);

            // Determine current subclass for context (reused logic)
            const currentSubclassItem = (newState.characterEquipment?.[selectedCharacterId] || [])
                .find(i => i.bucketHash === BUCKET_HASHES.SUBCLASS);
            const currentSubclassHash = currentSubclassItem?.itemHash;
            const currentSubclassName = currentSubclassHash ? subclassParserService.identifySubclassByHash(currentSubclassHash) : undefined;


            // Map SubclassConfig to match BuildTemplate expectations
            const config = configRaw ? {
                ...configRaw,
                aspects: configRaw.aspects?.map(a => typeof a === 'string' ? parseInt(a, 10) || 0 : a).filter(a => a !== 0),
                fragments: configRaw.fragments?.map(f => typeof f === 'string' ? parseInt(f, 10) || 0 : f).filter(f => f !== 0),
                grenadeHash: typeof configRaw.grenade === 'number' ? configRaw.grenade : undefined,
                meleeHash: typeof configRaw.melee === 'number' ? configRaw.melee : undefined,
                classAbilityHash: typeof configRaw.classAbility === 'number' ? configRaw.classAbility : undefined,
                jumpHash: typeof (configRaw as any).jump === 'number' ? (configRaw as any).jump : undefined,
            } : null;

            // Determine target element: Explicit -> Current -> Neutral
            let targetElement = (configRaw?.subclassName as ElementType) ||
                (currentSubclassName as ElementType || ElementType.Neutral);

            // PRISMATIC STICKY LOGIC: If we are on Prismatic, and the abilities are compatible, STAY on Prismatic
            if (currentSubclassName === 'prismatic' && !configRaw?.subclassName) {
                let compatibleWithPrismatic = true;

                // Check if aspects are in Prismatic
                if (configRaw?.aspects) {
                    for (const aspect of configRaw.aspects) {
                        const hash = subclassParserService.resolveAspectHash(aspect, 'prismatic', character.classType);
                        if (!hash) compatibleWithPrismatic = false;
                    }
                }

                // Check if Super is in Prismatic
                if (configRaw?.super) {
                    const hash = subclassParserService.resolveAbilityHash(configRaw.super, 'prismatic', character.classType, 'super' as any);
                    if (!hash) compatibleWithPrismatic = false;
                }

                if (compatibleWithPrismatic) {
                    targetElement = 'prismatic' as ElementType;
                }
            }

            // Only skip swap if NO config, OR if we are targeting current subclass (implicit or explicit match)
            const isSameSubclass = targetElement === currentSubclassName;
            const skipSwap = !config || (isSameSubclass && !configRaw?.subclassName); // Skip if no config, or if we are applying to current (and didn't explicitly ask for it)

            const buildTemplate: BuildTemplate = {
                id: `agent-loadout-${Date.now()}`,
                name: 'Agent Loadout',
                element: targetElement,
                guardianClass: character.classType,
                exoticWeapon: exoticWeapon ? { hash: exoticWeapon.item.itemHash, name: exoticWeapon.definition.displayProperties.name, slot: ItemSlot.Kinetic } : undefined,
                exoticArmor: exoticArmor ? { hash: exoticArmor.item.itemHash, name: exoticArmor.definition.displayProperties.name, slot: ItemSlot.Helmet } : undefined,
                items: legendaryItems.map(r => ({ hash: r.item.itemHash, name: r.definition.displayProperties.name })),
                subclassConfig: config || undefined,
                playstyle: 'Agent Configured',
                difficulty: 'advanced',
                armorMods: [],
                skipSubclassSwap: skipSwap
            };

            setResponse(`Applying loadout now... (${buildTemplate.element} subclass)`);

            // Navigate early so user can watch transmats
            navigate('/galaxy');

            const result = await transferService.equipBuild(
                buildTemplate,
                selectedCharacterId
            );

            if (result.success) {
                setResponse(result.error || `Loadout successfully applied!`);
            } else {
                setResponse(`Failed: ${result.error || 'Unknown error'}`);
            }

        } catch (error) {
            setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isProcessing) return;

        const result = parseCommand(trimmed);
        setResponse(result.message);
        setInput('');

        if (result.success && result.target) {
            setTimeout(() => navigate(result.target!), 800);
            return;
        }

        if (result.success && result.type === 'action') {
            setIsProcessing(true);
            if (result.actionType === 'equip' && result.actionPayload?.items) {
                const items = result.actionPayload.items;
                if (items.length === 1) {
                    await handleSingleEquip(items[0].itemIdentifier, items[0].isHash);
                } else {
                    await handleBatchEquip(items);
                }
            } else if (result.actionType === 'loadout' && result.actionPayload?.items) {
                const resultPayload = result.actionPayload;
                await handleLoadoutAction(resultPayload.items, resultPayload);
            }
            setIsProcessing(false);
        }
    };

    return (
        <div className="agent-wake-page">
            <p className="agent-wake-greeting">What would you like to do today guardian?</p>
            {response && <p className="agent-wake-response">{response}</p>}
            <form className="agent-wake-input" onSubmit={handleSubmit}>
                <div className="agent-input-wrapper">
                    <input
                        id="agent-command-input"
                        name="agent-command-input"
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Enter a command... (e.g., 'equip sunshot')"
                        disabled={isProcessing}
                        autoComplete="off"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="agent-search-icon-btn"
                        disabled={isProcessing || !input.trim()}
                        title="Execute Command"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AgentWakePage;