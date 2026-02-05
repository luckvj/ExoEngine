/**
 * Super Detector Service - Clean rebuild
 * Detects which equipped armor/weapons synergize with active subclass super
 */

import { manifestService } from './bungie/manifest.service';
import type { DestinyItem } from '../types';
import { SUBCLASS_HASHES } from '../constants/item-hashes';
import { SYNERGY_DEFINITIONS } from '../constants/synergy-definitions';

/**
 * Get the super ability hash from a subclass item
 * Socket layout for subclasses:
 * - Socket 0: Class Ability (Rift/Barricade/Dodge)
 * - Socket 1: Movement Ability (Jump)
 * - Socket 2: Super
 * - Socket 3: Grenade
 * - Socket 4: Melee
 * - Sockets 5+: Aspects and Fragments
 */
export function getEquippedSuper(subclass: DestinyItem, itemInstance?: any): number | null {
  if (!subclass) return null;

  // If we have instance data with sockets, extract the super from socket 2
  if (itemInstance?.sockets && Array.isArray(itemInstance.sockets)) {
    const superSocket = itemInstance.sockets.find((s: any) => s.socketIndex === 2);
    if (superSocket?.plugHash) {
      return superSocket.plugHash;
    }
  }

  // Fallback: try to get from subclass definition's default super (socket 2)
  const def = manifestService.getItem(subclass.itemHash);
  if (def?.sockets?.socketEntries?.[2]?.singleInitialItemHash) {
    return def.sockets.socketEntries[2].singleInitialItemHash;
  }

  return null;
}

/**
 * Get all super-related socket plugs from a subclass
 * This includes the main super (socket 2) and any aspects/fragments that affect the super
 */
export function getSuperCells(subclass: DestinyItem, itemInstance?: any): Array<{
  socketIndex: number;
  plugHash: number;
  plugName: string;
  element: string | null;
}> {
  if (!subclass || !itemInstance?.sockets) return [];

  const superCells: Array<{
    socketIndex: number;
    plugHash: number;
    plugName: string;
    element: string | null;
  }> = [];

  // Socket 2 is the main super
  const mainSuperSocket = itemInstance.sockets.find((s: any) => s.socketIndex === 2);
  if (mainSuperSocket?.plugHash) {
    const def = manifestService.getItem(mainSuperSocket.plugHash);
    const element = getSuperElement(mainSuperSocket.plugHash);
    
    if (def?.displayProperties?.name) {
      superCells.push({
        socketIndex: 2,
        plugHash: mainSuperSocket.plugHash,
        plugName: def.displayProperties.name,
        element
      });
    }
  }

  // Check sockets 5+ for aspects and fragments that affect the super
  // Skip sockets 0-4 (class ability, jump, super, grenade, melee)
  for (const socket of itemInstance.sockets) {
    if (socket.socketIndex < 5) continue; // Skip ability sockets
    if (!socket.plugHash) continue;

    const def = manifestService.getItem(socket.plugHash);
    if (!def?.displayProperties?.name) continue;

    const name = def.displayProperties.name.toLowerCase();
    const desc = def.displayProperties.description?.toLowerCase() || '';

    // Check if this socket plug is super-related (aspect or fragment that modifies super)
    if (name.includes('super') || desc.includes('super')) {
      const element = getSuperElement(socket.plugHash);
      
      superCells.push({
        socketIndex: socket.socketIndex,
        plugHash: socket.plugHash,
        plugName: def.displayProperties.name,
        element
      });
    }
  }

  return superCells;
}

/**
 * Match detected super and super cells against synergy database
 * Returns titles of synergies that match the player's current super configuration
 */
export function matchSuperSynergies(
  superHash: number | null,
  superCells: Array<{ socketIndex: number; plugHash: number; plugName: string; element: string | null }>,
  characterClass: number
): string[] {
  if (!superHash) return [];

  const matchedSynergies: string[] = [];

  // Search through all synergy definitions
  for (const synergy of SYNERGY_DEFINITIONS) {
    // Check if class matches
    if (synergy.guardianClass !== characterClass) continue;

    // Check if super matches
    if (synergy.subclassNode.superHash === superHash) {
      matchedSynergies.push(synergy.name);
      continue;
    }

    // Check if any of the super cells match aspects in the synergy
    const synergyAspectHashes = synergy.subclassNode.aspectHashes || [];
    const hasMatchingAspect = superCells.some(cell => 
      synergyAspectHashes.includes(cell.plugHash)
    );

    if (hasMatchingAspect && synergy.subclassNode.superHash) {
      // Only add if the main super element matches
      const synergySuper = synergy.subclassNode.superHash;
      const synergyElement = getSuperElement(synergySuper);
      const playerElement = getSuperElement(superHash);
      
      if (synergyElement === playerElement) {
        matchedSynergies.push(synergy.name);
      }
    }
  }

  return matchedSynergies;
}

/**
 * Get the element type of a super ability
 * Note: Prismatic subclasses store the original subclass super hashes in their sockets,
 * not the Prismatic-specific hashes. This function handles both.
 */
export function getSuperElement(superHash: number): string | null {
  if (!superHash) return null;

  const prismatic = SUBCLASS_HASHES.PRISMATIC;
  const solar = SUBCLASS_HASHES.SOLAR;
  const arc = SUBCLASS_HASHES.ARC;
  const void_elem = SUBCLASS_HASHES.VOID;
  const stasis = SUBCLASS_HASHES.STASIS;
  const strand = SUBCLASS_HASHES.STRAND;
  
  // Check Prismatic supers
  if (superHash === prismatic.TITAN.SUPER.TWILIGHT_ARSENAL) return 'void';
  if (superHash === prismatic.TITAN.SUPER.GLACIAL_QUAKE) return 'stasis';
  if (superHash === prismatic.TITAN.SUPER.THUNDERCRASH) return 'arc';
  if (superHash === prismatic.TITAN.SUPER.HAMMER_OF_SOL) return 'solar';
  if (superHash === prismatic.HUNTER.SUPER.SHADOWSHOT_DEADFALL) return 'void';
  if (superHash === prismatic.HUNTER.SUPER.SILENCE_AND_SQUALL) return 'stasis';
  if (superHash === prismatic.HUNTER.SUPER.GOLDEN_GUN_MARKSMAN) return 'solar';
  if (superHash === prismatic.WARLOCK.SUPER.NOVA_BOMB_CATACLYSM) return 'void';
  if (superHash === prismatic.WARLOCK.SUPER.NEEDLESTORM) return 'strand';
  if (superHash === prismatic.WARLOCK.SUPER.WINTERS_WRATH) return 'stasis';
  if (superHash === prismatic.WARLOCK.SUPER.SONG_OF_FLAME) return 'solar';
  if (superHash === prismatic.WARLOCK.SUPER.STORMTRANCE) return 'arc';

  // Check standard subclass supers (these are what Prismatic actually stores in sockets)
  // Solar
  if (superHash === solar.TITAN.SUPER.HAMMER_OF_SOL) return 'solar';
  if (superHash === solar.TITAN.SUPER.BURNING_MAUL) return 'solar';
  if (superHash === solar.HUNTER.SUPER.GOLDEN_GUN_DEADSHOT) return 'solar';
  if (superHash === solar.HUNTER.SUPER.GOLDEN_GUN_MARKSMAN) return 'solar';
  if (superHash === solar.HUNTER.SUPER.BLADE_BARRAGE) return 'solar';
  if (superHash === solar.WARLOCK.SUPER.DAYBREAK) return 'solar';
  if (superHash === solar.WARLOCK.SUPER.WELL_OF_RADIANCE) return 'solar';
  if (superHash === solar.WARLOCK.SUPER.SONG_OF_FLAME) return 'solar';
  
  // Arc
  if (superHash === arc.TITAN.SUPER.FISTS_OF_HAVOC) return 'arc';
  if (superHash === arc.TITAN.SUPER.THUNDERCRASH) return 'arc';
  if (superHash === arc.HUNTER.SUPER.ARC_STAFF) return 'arc';
  if (superHash === arc.HUNTER.SUPER.GATHERING_STORM) return 'arc';
  if (superHash === arc.HUNTER.SUPER.STORMS_EDGE) return 'arc';
  if (superHash === arc.WARLOCK.SUPER.STORMTRANCE) return 'arc';
  if (superHash === arc.WARLOCK.SUPER.CHAOS_REACH) return 'arc';
  
  // Void
  if (superHash === void_elem.TITAN.SUPER.WARD_OF_DAWN) return 'void';
  if (superHash === void_elem.TITAN.SUPER.SENTINEL_SHIELD) return 'void';
  if (superHash === void_elem.TITAN.SUPER.TWILIGHT_ARSENAL) return 'void';
  if (superHash === void_elem.HUNTER.SUPER.SPECTRAL_BLADES) return 'void';
  if (superHash === void_elem.HUNTER.SUPER.SHADOWSHOT_MOEBIUS_QUIVER) return 'void';
  if (superHash === void_elem.HUNTER.SUPER.SHADOWSHOT_DEADFALL) return 'void';
  if (superHash === void_elem.WARLOCK.SUPER.NOVA_BOMB_VORTEX) return 'void';
  if (superHash === void_elem.WARLOCK.SUPER.NOVA_BOMB_CATACLYSM) return 'void';
  if (superHash === void_elem.WARLOCK.SUPER.NOVA_WARP) return 'void';
  
  // Stasis
  if (superHash === stasis.TITAN.SUPER.GLACIAL_QUAKE) return 'stasis';
  if (superHash === stasis.HUNTER.SUPER.SILENCE_AND_SQUALL) return 'stasis';
  if (superHash === stasis.WARLOCK.SUPER.WINTERS_WRATH) return 'stasis';
  
  // Strand
  if (superHash === strand.TITAN.SUPER.BLADEFURY) return 'strand';
  if (superHash === strand.HUNTER.SUPER.SILKSTRIKE) return 'strand';
  if (superHash === strand.WARLOCK.SUPER.NEEDLESTORM) return 'strand';

  // Fallback to manifest (for any supers we might have missed)
  const def = manifestService.getItem(superHash);
  if (!def) return null;

  const damageType = def.talentGrid?.hudDamageType;
  if (damageType === 2) return 'arc';
  if (damageType === 3) return 'solar';
  if (damageType === 4) return 'void';
  if (damageType === 6) return 'stasis';
  if (damageType === 7) return 'strand';

  return null;
}

