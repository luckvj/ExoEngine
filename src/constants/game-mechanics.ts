/**
 * Game Mechanics Knowledge Base
 * Explanations for Destiny 2 terms and concepts
 */

export interface MechanicExplanation {
    term: string;
    aliases: string[];
    shortDescription: string;
    fullExplanation: string;
    examples?: string[];
    relatedTerms?: string[];
}

export const GAME_MECHANICS: { [key: string]: MechanicExplanation } = {

    prismatic: {
        term: 'Prismatic',
        aliases: ['prismatic subclass', 'transcendence'],
        shortDescription: 'The ultimate subclass allowing you to combine Light and Dark abilities',
        fullExplanation: `Prismatic is a unique subclass that lets you mix and match abilities from all elements.

**Transcendence:**
• Deal Light and Dark damage to fill two meters.
• When both are full, press [L3+R3 / B+Plus] to become **Transcendent**.
• While Transcendent, you have massive ability regeneration and a special Transcendent grenade.

**Facets:**
• Instead of normal fragments, Prismatic uses **Facets**.
• Facets provide powerful passive bonuses that bridge different elements (e.g., Facet of Dawn makes you Radiant on melee hits).

**Exotic Class Items:**
• Prismatic allows the use of Exotic Class Items that combine two different exotic perks into one item.`,
        examples: [
            'Combine Bleak Watcher (Stasis) with Hellion (Solar) for dual souls.',
        ],
        relatedTerms: ['subclass', 'facets', 'transcendence', 'exotic class items']
    },

    surges: {
        term: 'Surges',
        aliases: ['surge', 'surge mods', 'elemental surge'],
        shortDescription: 'Armor mods that boost weapon damage after picking up an Orb of Power',
        fullExplanation: `Surge mods increase weapon damage matching the mod's element.

**How They Work:**
• **Solar Surge** = +10% (1 mod), +17% (2 mods), +22% (3 mods) damage.
• **Activation:** Pick up an **Orb of Power** to activate.
• **Duration:** Lasts 10-15 seconds per Orb, depending on Time Dilation mods.

**Where to Slot:**
• Leg Armor (Legs).
• Match your surges to your Heavy weapon element for boss DPS.

**Armor Charge:**
• Surges consume **Armor Charge** stacks over time. 
• Use "Stacks on Stacks" to get more charges per orb.`,
        examples: [
            '3x Void Surge + Edge Transit = Max Void damage.',
            'Solar Surge + Still Hunt = even more burst damage.'
        ],
        relatedTerms: ['armor charge', 'orbs of power', 'elements', 'damage buffs']
    },

    cwl: {
        term: 'Charged with Light',
        aliases: ['charged with light', 'cwl', 'charged', 'charge'],
        shortDescription: 'Mod system that grants stacks consumed for powerful effects',
        fullExplanation: `Charged with Light (CwL) is a mod system where you:
1. **Gain charges** (up to 5 stacks)
2. **Consume charges** for buffs

**Charge Generators:**
• **Taking Charge** - Pick up orbs → +2 charges
• **Shield Break Charge** - Break match-game shields → +1
• **Precision Charge** - Precision kills → +1

**Charge Consumers:**
• **High-Energy Fire** - +20% damage (costs 1 charge per kill)
• **Protective Light** - Damage resist when shields break (costs all charges)
• **Supercharged** - Increase max charges to 5

**Building CwL:**
1. Use 1-2 charge generators
2. Use 1-2 consumers
3. Stack mods like Supercharged for more charges

**Note:** Wells are generally stronger now, but CwL still viable!`,
        examples: [
            'Taking Charge + High-Energy Fire = easy +20% damage',
            'Protective Light was nerfed but still helps survivability'
        ],
        relatedTerms: ['wells', 'orbs', 'armor mods', 'buffs']
    },

    dps: {
        term: 'DPS',
        aliases: ['dps', 'damage per second', 'boss damage'],
        shortDescription: 'Damage Per Second - how much damage you deal over time',
        fullExplanation: `DPS measures sustained damage output, crucial for boss encounters.

**Top DPS Weapons (2024):**
• **Still Hunt** (Hunter only) - 300k+ DPS
• **Whisper of the Worm** - 150k+ DPS
• **Linear Fusion Rifles** - 120k+ DPS
• **Rockets + Bait & Switch** - 100k+ DPS

**DPS Phases:**
1. Apply **Weaken** debuff (30% more damage)
2. Apply **Radiant** buff (25% more damage)
3. Use **Well of Radiance** (25% more damage)
4. Use damage supers or heavy weapons
5. Reload during boss immune

**Stacking Buffs:**
• Well + Radiant + Weaken = ~2x damage
• Add Surge/Font of Might = even more

**Pro Tips:**
• Coordinate with team (one Weaken, one Well)
• Save heavy ammo for DPS
• Linear Fusions are consistent
• Practice reload timing`,
        examples: [
            'Crota: Ghally rockets during sword phase',
            'Atheon: Whisper + Well + Div for max DPS'
        ],
        relatedTerms: ['buffs', 'debuffs', 'weaken', 'radiant', 'well of radiance']
    },

    buffs: {
        term: 'Buffs & Debuffs',
        aliases: ['buff', 'debuff', 'buffs', 'debuffs', 'damage buff'],
        shortDescription: 'Status effects that increase (buff) or decrease (debuff) damage',
        fullExplanation: `Buffs and Debuffs modify damage dealt or received.

**Major Damage Buffs (don't stack):**
• **Radiant** - 25% more damage (Solar ability kills)
• **Well of Radiance** - 25% damage + healing
• **Font of Might** - 25% more damage (from wells)
• **High-Energy Fire** - 20% damage (CwL mod)
• **Surge Mods** - 10-15% damage

**Major Damage Debuffs (don't stack on enemies):**
• **Weaken** - 30% more damage TO enemy (Void)
• **Divinity** - 30% crit bubble (one teammate)
• **Tether** - 30% debuff + orbs

**Buff Rules:**
• Only ONE damage buff active at a time (highest wins)
• Only ONE debuff on enemy at a time
• Surges/Font stack WITH other buffs

**Optimal Setup:**
• You: Radiant buff
• Teammate: Weaken debuff on boss
• = 1.25 × 1.30 = 62.5% more damage!`,
        examples: [
            'Solar Warlock in Well (25% buff) + Div (30% debuff) = huge damage',
            'Void Hunter Tether + team with Radiant = optimal DPS'
        ],
        relatedTerms: ['dps', 'weaken', 'radiant', 'well of radiance']
    },

    exotics: {
        term: 'Exotics',
        aliases: ['exotic', 'exotics', 'exotic weapons', 'exotic armor'],
        shortDescription: 'Unique items with powerful perks - can only equip one weapon + one armor',
        fullExplanation: `Exotics are special items with unique perks.

**The Exotic Rule:**
• ONE exotic weapon
• ONE exotic armor
• Total = 2 exotics max

**Exotic Weapons:**
• Gold/Yellow background
• Unique perks (e.g., Gjallarhorn Wolfpack Rounds)
• Often meta-defining
• Obtained from quests, raids, RNG

**Exotic Armor:**
• Build-defining perks
• Class-specific
• Examples:
  - **Orpheus Rig** (Hunter): Tether refunds super
  - **Phoenix Protocol** (Warlock): Well kills extend duration
  - **Cuirass of the Falling Star** (Titan): Thundercrash does 3x damage

**Farming Exotics:**
• Lost Sectors (daily rotation)
• Xûr (weekends, random rolls)
• Exotic Engrams (world drops)
• Raid exotics (1 chance/week)`,
        examples: [
            'Witherhoard (exotic kinetic) + Contraverse Hold (exotic arms) = valid',
            'Gjallarhorn + Sleeper = INVALID (two exotic weapons)'
        ],
        relatedTerms: ['builds', 'lost sectors', 'xur']
    },

    powerlevel: {
        term: 'Power Level',
        aliases: ['power', 'power level', 'light level', 'level', 'power cap'],
        shortDescription: 'Your overall gear score - now capped at 550 following the Renegades squish',
        fullExplanation: `Power Level determines damage dealt/received and activity access.
        
**Renegades Update (2025):**
• **Soft Cap** - 500
• **Powerful Cap** - 540
• **Pinnacle Cap** - 550
• **Artifact Bonus** - Unlimited (+1 per artifact level)

**How to Level:**
1. **1-500 (Soft):** Play anything, all drops help
2. **500-540 (Powerful):** Complete "Orders", Nightfalls, and Competitive PvP
3. **540-550 (Pinnacle):** Raids, Dungeons, and Trials of Osiris
4. **550+:** Artifact XP only

**Smart Leveling:**
• Unlock **Orders** early for consistent powerful gear
• Don't infuse until 540
• Save pinnacles for the 540+ grind`,
        examples: [
            'Stuck at 539? Check your Unclaimed Orders',
            'You need 540+ for Master Nightfalls now'
        ],
        relatedTerms: ['artifact', 'pinnacle', 'orders', 'portal']
    },

    orders: {
        term: 'Orders',
        aliases: ['order', 'orders', 'unclaimed orders', 'bounty'],
        shortDescription: 'The new reward structure replacing many weekly bounties',
        fullExplanation: `Orders are the primary way to earn Powerful Gear and XP in the Renegades era.

**How They Work:**
• **Acquisition:** Automatically assigned based on activity participation (or picked up from The Curator).
• **Completion:** Track progress across activity "Families" (e.g., Strike Family, Crucible Family).
• **Rewards:** Grant "Order Rewards" directly to your inventory or the new Unclaimed Rewards bucket.
• **Unlock Value:** Some orders require specific "Unlock Values" (keys/reputation) to claim.

**Pro Tip:**
• Check \`unclaimedOrderRewards\` frequently so you don't cap out!`,
        examples: [
            'Complete 5 Crucible Matches to finish the "Shaxx\'s Order"',
            'Use the Agent to check for unclaimed order rewards'
        ],
        relatedTerms: ['power level', 'curator', 'portal']
    },

    portal: {
        term: 'The Portal',
        aliases: ['portal', 'portal activity', 'activity graph', 'curator'],
        shortDescription: 'The new centralized activity hub and graph system',
        fullExplanation: `The Portal is the new Director experience introduced in Late 2025.

**Key Features:**
• **Activity Graph:** Activities are linked in a "Graph" structure. Unlocking one node (Activity) opens paths to connected nodes.
• **Root Nodes:** Major starting points for campaigns or core playlists.
• **The Curator:** A new vendor/system that offers "Curated Blocks" of content with bonus rewards.
• **Bonus Focus:** Specific nodes glow to indicate "Visible Rewards" (Bonus Focus) for the week.

**Navigation:**
• Follow the lines! Connect nodes to reach endgame activities.`,
        examples: [
            'Check the Portal for this week\'s Bonus Focus node',
            'Unlock the root node to access the new dungeon'
        ],
        relatedTerms: ['activities', 'orders', 'director']
    },

    jolt: {
        term: 'Jolt',
        aliases: ['jolting', 'jolt target', 'arc verb'],
        shortDescription: 'Arc verb that chains lightning to nearby enemies when the target takes damage',
        fullExplanation: `Jolt is a powerful Arc debuff that turns enemies into lightning rods.

**Effect:**
• When a Jolted target takes damage, they chain lightning to nearby enemies.
• This lightning damage is significant and can trigger more Arc synergies.

**How to Proc:**
• Voltshot (Weapon Perk)
• Arc Grenades (with Echo of Jolt)
• Prismatic Transcendent Grenades`,
        examples: [
            'Proccing Voltshot on a Sidearm to clear clusters of adds.',
            'Using an Arc grenade to stun an Overload Captain.'
        ],
        relatedTerms: ['arc', 'overload', 'voltshot']
    },

    scorch: {
        term: 'Scorch',
        aliases: ['scorching', 'scorch stacks', 'solar verb'],
        shortDescription: 'Solar verb that applies damage over time. High stacks lead to an Ignition',
        fullExplanation: `Scorch applies stacks of heat to enemies, dealing damage over time.

**Effect:**
• Deals continuous Solar damage.
• **Ignition:** Reaching 100 stacks of Scorch triggers a massive Solar explosion (Ignition).
• More stacks = more damage per tick.

**How to Proc:**
• Incandescent (Weapon Perk)
• Solar Melees and Grenades
• Dragon's Breath exotic`,
        examples: [
            'Getting multiple kills with Incandescent to trigger a room-clearing Ignition.',
            'Applying Scorch with a melee to proc Sunspots.'
        ],
        relatedTerms: ['solar', 'ignition', 'incandescent']
    },

    volatile: {
        term: 'Volatile',
        aliases: ['volatile rounds', 'void verb'],
        shortDescription: 'Void verb that causes enemies to explode after taking additional damage',
        fullExplanation: `Volatile makes enemies unstable and prone to Void explosions.

**Effect:**
• The target is enveloped in Void energy.
• Taking further damage causes the target to detonate in a Void explosion.

**How to Proc:**
• Volatile Rounds (from Orbs or Echoes)
• Void Grenades (with Controlled Demolition)
• Destabilizing Rounds (Weapon Perk)`,
        examples: [
            'Using Volatile Rounds on a machine gun to melt through a Barrier shield.',
            'Causing a chain reaction of explosions in a dense group of Thrall.'
        ],
        relatedTerms: ['void', 'barrier', 'destabilizing rounds']
    },

    freeze: {
        term: 'Freeze',
        aliases: ['frozen', 'stasis verb', 'slow'],
        shortDescription: 'Stasis verb that locks enemies in place. Frozen targets can be Shattered',
        fullExplanation: `Freeze is the ultimate Stasis crowd control, completely halting an enemy.

**Effect:**
• Enemies are encased in Stasis crystals and cannot move or attack.
• **Shatter:** Dealing damage to a frozen enemy or the crystal causes it to shatter for massive AoE damage.

**How to Proc:**
• Coldsnap Grenades
• Headstone (Weapon Perk)
• Shadebinder Supers`,
        examples: [
            'Freezing a charging Ogre to buy time for the team.',
            'Shattering a group of frozen enemies for a massive burst of damage.'
        ],
        relatedTerms: ['stasis', 'shatter', 'slow', 'unstoppable']
    },

    suspend: {
        term: 'Suspend',
        aliases: ['suspended', 'strand verb'],
        shortDescription: 'Strand verb that lifts enemies into the air, disabling them and their abilities',
        fullExplanation: `Suspend is a powerful Strand crowd control that renders enemies helpless.

**Effect:**
• Enemies are lifted off the ground by Strand matter.
• They cannot move, attack, or use abilities.`,
        examples: [
            'Suspending a group of Gladiators to easily pick them off.',
            'Using a Shackle grenade to stun an Unstoppable Incendior.'
        ],
        relatedTerms: ['strand', 'unstoppable', 'tangle']
    },

    slow: {
        term: 'Slow',
        aliases: ['slowed', 'stasis slow'],
        shortDescription: 'Stasis verb that reduces movement speed and ability recharge',
        fullExplanation: `Slow is the initial stage of Stasis freezing.
        
**Effect:**
• Reduces movement speed and weapon handling.
• Slows ability recharge rates.
• Accumulating 100 stacks of Slow results in the target being **Frozen**.`,
        examples: ['Duskfield Grenades are excellent for slowing groups of enemies.'],
        relatedTerms: ['stasis', 'freeze', 'overload']
    },

    shatter: {
        term: 'Shatter',
        aliases: ['shattering'],
        shortDescription: 'Stasis verb that breaks frozen targets or crystals for AoE damage',
        fullExplanation: `Shatter is the explosive payoff of the Stasis element.
        
**Effect:**
• Dealing damage to a **Frozen** enemy or a Stasis Crystal causes it to shatter.
• Shattering deals significant damage to the target and any nearby enemies.`,
        examples: ['Using a glacier grenade and then sliding into it to shatter the crystals.'],
        relatedTerms: ['stasis', 'freeze', 'unstoppable']
    },

    ignite: {
        term: 'Ignite',
        aliases: ['ignition', 'igniting'],
        shortDescription: 'Solar verb that causes a large explosion after stacking Scorch',
        fullExplanation: `Ignition is the peak of Solar damage output.
        
**Effect:**
• Triggers a massive Solar explosion centered on the target.
• Can be triggered by reaching 100 stacks of **Scorch** or by certain high-tier abilities.`,
        examples: ['Continuous fire from Dragon\'s Breath consistently triggers Ignitions.'],
        relatedTerms: ['solar', 'scorch', 'unstoppable']
    },

    blind: {
        term: 'Blind',
        aliases: ['blinding'],
        shortDescription: 'Arc verb that impairs enemy vision and disables their attack',
        fullExplanation: `Blind is a key defensive Arc utility.
        
**Effect:**
• Enemies are disoriented, cannot see, and stop attacking.
• In PvP, it white-outs the enemy's screen and removes their HUD.`,
        examples: ['Flashbang grenades are a reliable way to blind groups of enemies.'],
        relatedTerms: ['arc', 'unstoppable']
    },

    suppress: {
        term: 'Suppress',
        aliases: ['suppression', 'suppressed'],
        shortDescription: 'Void verb that disables all abilities and HUD for a duration',
        fullExplanation: `Suppression is the ultimate shutdown tool of the Void.
        
**Effect:**
• Prevents enemies from using abilities, jumping (Double Jump), or casting Supers.
• Disables the HUD in PvP.`,
        examples: ['Suppressor grenades can knock a Guardian out of their Super.'],
        relatedTerms: ['void', 'overload']
    },

    invisible: {
        term: 'Invisible',
        aliases: ['invisibility', 'invis'],
        shortDescription: 'Void verb that hides you from enemy detection',
        fullExplanation: `Invisibility allows you to move undetected by combatants.
        
**Effect:**
• Enemies will not target or track you while you are invisible.
• Taking most combat actions (shooting, melee, grenades) will break invisibility.
• Attacking from invisibility often grants bonuses with specific exotics or fragments.`,
        examples: ['Vanish in Smoke allows a Hunter to save a teammate in a GM.'],
        relatedTerms: ['void', 'stealth']
    },

    devour: {
        term: 'Devour',
        aliases: ['devouring'],
        shortDescription: 'Void verb that heals you and grants grenade energy on every kill',
        fullExplanation: `Devour is the engine that drives high-end Void survivability.
        
**Effect:**
• Activating Devour instantly heals you to full health.
• Every subsequent kill while Devour is active grants a full heal and a chunk of grenade energy.
• Getting kills also extends the duration of the Devour buff.`,
        examples: ['Using "Feed the Void" on Warlock to maintain constant uptime on grenades.'],
        relatedTerms: ['void', 'healing']
    },

    weaken: {
        term: 'Weaken',
        aliases: ['weakened', 'weakening'],
        shortDescription: 'Void verb that increases damage taken by a target',
        fullExplanation: `Weaken is a fundamental Void debuff for team damage.
        
**Effect:**
• The target takes 15% (standard) to 30% (Tether/Divinity) more damage from all sources.
• Targets have their movement speed reduced slightly.
• Many Void fragments trigger additional benefits when attacking weakened targets.`,
        examples: ['Throwing a Void grenade with "Echo of Undermining" to weaken a boss.'],
        relatedTerms: ['void', 'dps', 'debuffs']
    },

    unravel: {
        term: 'Unravel',
        aliases: ['unraveling', 'unraveling rounds'],
        shortDescription: 'Strand verb that causes targets to burst with tracking projectiles',
        fullExplanation: `Unravel turns enemies into a source of constant Strand damage.
        
**Effect:**
• Damaging an unraveled target causes them to fire out tracking Strand needles at nearby enemies.
• These needles apply Unravel to their targets, creating a chain reaction.`,
        examples: ['Using Unraveling Rounds on a machine gun to spread Strand chaos.'],
        relatedTerms: ['strand', 'barrier']
    },

    sever: {
        term: 'Sever',
        aliases: ['severed', 'severing'],
        shortDescription: 'Strand verb that drastically reduces an enemy\'s damage output',
        fullExplanation: `Sever is a powerful Strand damage mitigation tool.
        
**Effect:**
• The target deals significantly less damage (approx 40% reduction) for the duration.
• Excellent for neutralizing bosses or aggressive enemies in high-tier content.`,
        examples: ['Hitting a boss with a Strand melee to sever their damage output.'],
        relatedTerms: ['strand', 'defense']
    },

    threadlings: {
        term: 'Threadlings',
        aliases: ['threadling'],
        shortDescription: 'Strand verb that creates sentient creatures that hunt and explode on targets',
        fullExplanation: `Threadlings are autonomous Strand minions that seek out and destroy your foes.
        
**Effect:**
• Small creatures woven from Strand that leap toward the nearest enemy and explode.
• If they find no targets, they "perch" (Warlock only) and wait to be released by an attack.`,
        examples: ['Using a Weaver\'s Call rift to release multiple threadlings at once.'],
        relatedTerms: ['strand', 'minions']
    },

    tangles: {
        term: 'Tangles',
        aliases: ['tangle'],
        shortDescription: 'Strand verb that creates an explosive orb of Strand matter',
        fullExplanation: `Tangles are the primary environmental interaction for the Strand subclass.
        
**Effect:**
• Defeating an unraveled, suspended, or severed target can create a Tangle.
• Tangles can be picked up and thrown to cause a large Strand explosion.
• Tangles have a cooldown (~12 seconds) between creation.`,
        examples: ['Throwing a Tangle and shooting it in mid-air to suspend nearby enemies.'],
        relatedTerms: ['strand', 'explosion']
    },

    radiant: {
        term: 'Radiant',
        aliases: ['become radiant', 'radiance'],
        shortDescription: 'Solar verb that increases weapon damage by 25%',
        fullExplanation: `Radiant is the primary Solar damage buff.
        
**Effect:**
• Increases all weapon damage by 25%.
• Makes weapons glow with Solar light.`,
        examples: ['Using a weighted throwing knife to become Radiant instantly on a precision hit.'],
        relatedTerms: ['solar', 'barrier', 'buffs']
    },

    restoration: {
        term: 'Restoration',
        aliases: ['restoring'],
        shortDescription: 'Solar verb that grants continuous health regeneration',
        fullExplanation: `Restoration is the pinnacle of Solar survivability.
        
**Effect:**
• Continuously regenerates health and shields over time.
• This regeneration is NOT interrupted by taking damage.
• Stacks up to Restoration x2 for even faster healing.`,
        examples: ['Using a Healing Grenade to grant yourself Restoration x1 during a tough fight.'],
        relatedTerms: ['solar', 'healing']
    },

    cure: {
        term: 'Cure',
        aliases: ['curing'],
        shortDescription: 'Solar verb that grants an instant burst of health',
        fullExplanation: `Cure provides a quick, one-time burst of healing.
        
**Effect:**
• Instantly restores a portion of health and shields.
• Unlike Restoration, it is not a sustained effect.
• Often triggered by Solar ability kills or specific exotics.`,
        examples: ['"Ember of Benevolence" provides Cure to yourself and allies.'],
        relatedTerms: ['solar', 'healing']
    },

    amplified: {
        term: 'Amplified',
        aliases: ['become amplified'],
        shortDescription: 'Arc verb that increases movement speed and weapon handling',
        fullExplanation: `Amplified is the engine of Arc momentum.
        
**Effect:**
• Increases movement speed and sprint speed.
• Grants a massive boost to weapon handling and reload speed.
• After sprinting for a few seconds, you gain "Speed Booster" for even more speed and damage resistance.`,
        examples: ['Getting quick Arc kills to become Amplified and rush through an encounter.'],
        relatedTerms: ['arc', 'speed']
    },

    'ionic trace': {
        term: 'Ionic Trace',
        aliases: ['ionic traces', 'trace'],
        shortDescription: 'Arc verb that creates a bolt of energy that tracks to you to grant ability energy',
        fullExplanation: `Ionic Traces are the primary energy economy of Arc.
        
**Effect:**
• A bolt of pure Arc energy that travels along the ground toward you.
• Upon retrieval, it grants a significant chunk of energy to all your abilities (Grenade, Melee, and Class).`,
        examples: ['Using "Coldheart" to generate constant Ionic Traces for high ability uptime.'],
        relatedTerms: ['arc', 'energy']
    },

    // Categories (for Tooltips)
    activities: {
        term: 'Activities',
        aliases: ['activity', 'content'],
        shortDescription: 'Playlists and missions like Nightfalls, Raids, and Dungeons',
        fullExplanation: 'Activities encompass all playable content in Destiny 2. The Agent can provide optimal loadout recommendations for specific high-tier activities like Grandmaster Nightfalls and Raids.'
    },
    analysis: {
        term: 'Analysis',
        aliases: ['analyze', 'check'],
        shortDescription: 'Tools to evaluate your current loadout, stats, and synergy',
        fullExplanation: 'Analysis tools help you understand the power of your current build. Use "Analyze my build" for a visual breakdown and synergy score.'
    },
    builds: {
        term: 'Builds',
        aliases: ['build', 'loadout'],
        shortDescription: 'Custom configurations of gear, subclasses, and mods',
        fullExplanation: 'Builds are specific combinations of Exotic gear, subclass aspects, and armor mods designed for maximum efficiency in specific game modes.'
    },
    tools: {
        term: 'Tools',
        aliases: ['tool', 'utility'],
        shortDescription: 'Management utilities like Vault Cleanup and Loadout Export',
        fullExplanation: 'The Agent offers various utilities to manage your Guardian, including inventory cleaning and data sharing tools.'
    },
    help: {
        term: 'Help',
        aliases: ['agent help'],
        shortDescription: 'A guide to all Agent commands and capabilities',
        fullExplanation: 'Access the Full Help menu by typing /help to see all available commands and how to use them effectively.'
    },

    // Slots & Items
    kinetic: {
        term: 'Kinetic Slot',
        aliases: ['kinetic weapon'],
        shortDescription: 'Top weapon slot for Kinetic, Stasis, or Strand weapons',
        fullExplanation: 'The first weapon slot. It houses standard Kinetic firearms as well as Stasis and Strand primary weapons.'
    },
    energy: {
        term: 'Energy Slot',
        aliases: ['energy weapon'],
        shortDescription: 'Middle weapon slot for Solar, Void, or Arc weapons',
        fullExplanation: 'The second weapon slot. It houses weapons with Solar, Void, or Arc elemental damage types.'
    },
    power: {
        term: 'Power Slot',
        aliases: ['heavy weapon', 'heavy slot'],
        shortDescription: 'Bottom weapon slot for high-damage Heavy weapons',
        fullExplanation: 'The third weapon slot. It is reserved for high-impact weapons like Rocket Launchers, Swords, and Linear Fusions.'
    },
    helmet: {
        term: 'Helmet',
        aliases: ['helm', 'head'],
        shortDescription: 'Armor for the head slot, often hosting targeting mods',
        fullExplanation: 'Armor worn on the head. In the current mod system, Helmets typically host Targeting and Siphon mods.'
    },
    gauntlets: {
        term: 'Gauntlets',
        aliases: ['arms', 'hands'],
        shortDescription: 'Armor for the arm slot, often hosting reload mods',
        fullExplanation: 'Armor worn on the arms. Gauntlets commonly host Reload Speed, Dexterity, and Grenade-related mods.'
    },
    chest: {
        term: 'Chest Piece',
        aliases: ['chest', 'torso'],
        shortDescription: 'Armor for the chest slot, often hosting resistance mods',
        fullExplanation: 'Armor worn on the torso. The Chest piece is the primary location for Damage Resistance (Resist) mods.'
    },
    legs: {
        term: 'Leg Armor',
        aliases: ['boots'],
        shortDescription: 'Armor for the leg slot, often hosting surge mods',
        fullExplanation: 'Armor worn on the legs. Leg pieces are critical for damage output, as they host Elemental Surge and Scavenger mods.'
    },
    'class item': {
        term: 'Class Item',
        aliases: ['cloak', 'mark', 'bond'],
        shortDescription: 'Class-specific armor (Cloak/Mark/Bond) hosting utility mods',
        fullExplanation: 'Class-specific accessories (Hunter Cloaks, Titan Marks, Warlock Bonds). These host powerful utility and Artifact-specific mods.'
    },

    // Specific Commands
    'export loadout': {
        term: 'Export Loadout',
        aliases: ['export'],
        shortDescription: 'Generates a shareable URL of your current build',
        fullExplanation: 'Generating an Export Loadout will create a unique ExoEngine URL that you can share with others to view your full gear and subclass details.'
    },


    // Elements
    'solar': {
        term: 'Solar',
        aliases: ['solar element', 'fire', 'thermal'],
        shortDescription: 'Fire element - apply Scorch, Ignite, and become Radiant',
        fullExplanation: 'Solar is the element of fire and regeneration. Key verbs: Scorch (DoT stacks that lead to Ignition), Ignite (AoE explosion), Radiant (damage buff + Anti-Barrier), Restoration (heal over time), Cure (instant heal).',
        relatedTerms: ['scorch', 'ignite', 'radiant', 'restoration', 'cure']
    },
    'arc': {
        term: 'Arc',
        aliases: ['arc element', 'lightning', 'electricity'],
        shortDescription: 'Lightning element - apply Jolt, Blind, and become Amplified',
        fullExplanation: 'Arc is the element of lightning and speed. Key verbs: Jolt (chain lightning on damage), Blind (impairs vision), Amplified (movement speed + weapon handling), Ionic Trace (arc pickup for energy).',
        relatedTerms: ['jolt', 'blind', 'amplified', 'ionic trace']
    },
    'void': {
        term: 'Void',
        aliases: ['void element', 'darkness'],
        shortDescription: 'Void element - apply Volatile, Suppress, and become Invisible',
        fullExplanation: 'Void is the element of nothingness and control. Key verbs: Volatile (explosion on additional damage + Anti-Barrier), Suppress (disable abilities), Weaken (debuff enemies), Devour (heal on kills), Invisible (stealth).',
        relatedTerms: ['volatile', 'suppress', 'weaken', 'devour', 'invisible']
    },
    'stasis': {
        term: 'Stasis',
        aliases: ['stasis element', 'ice', 'freeze'],
        shortDescription: 'Ice element - apply Slow, Freeze, and Shatter enemies',
        fullExplanation: 'Stasis is the element of ice and control. Key verbs: Slow (movement penalty, stacks to Freeze), Freeze (immobilize), Shatter (break frozen targets for damage + Unstoppable stun). Crystals provide cover and can be destroyed for AoE damage.',
        relatedTerms: ['slow', 'freeze', 'shatter', 'crystals']
    },
    'strand': {
        term: 'Strand',
        aliases: ['strand element', 'green', 'threadlings'],
        shortDescription: 'Strand element - create Threadlings, Suspend, and Unravel enemies',
        fullExplanation: 'Strand is the element of weaving and psychic power. Key verbs: Suspend (levitate and disable), Unravel (track targets and deal damage + Anti-Barrier), Sever (reduce damage output), Threadlings (sentient projectiles that hunt enemies), Tangles (explosive strand matter).',
        relatedTerms: ['suspend', 'unravel', 'sever', 'threadlings', 'tangles']
    },

    // Class Abilities
    'dodge': {
        term: 'Dodge',
        aliases: ['hunter dodge', 'class ability', 'marksman dodge', 'gambler dodge'],
        shortDescription: 'Hunter class ability - quick evasive roll that reloads or recharges melee',
        fullExplanation: 'Hunter dodge is a fast evasion that makes you harder to hit. Marksman\'s Dodge reloads your weapon. Gambler\'s Dodge recharges your melee energy when used near enemies.',
        relatedTerms: ['hunter', 'mobility', 'class ability']
    },
    'barricade': {
        term: 'Barricade',
        aliases: ['titan barricade', 'class ability', 'towering barricade', 'rally barricade'],
        shortDescription: 'Titan class ability - deployable cover that blocks damage',
        fullExplanation: 'Titan barricade creates a wall of cover. Towering Barricade is tall and durable. Rally Barricade is shorter but reloads weapons when you crouch behind it.',
        relatedTerms: ['titan', 'resilience', 'class ability']
    },
    'rift': {
        term: 'Rift',
        aliases: ['warlock rift', 'class ability', 'healing rift', 'empowering rift'],
        shortDescription: 'Warlock class ability - area that heals or empowers allies',
        fullExplanation: 'Warlock rift creates a circular zone. Healing Rift continuously heals allies inside. Empowering Rift increases weapon damage for allies standing in it.',
        relatedTerms: ['warlock', 'recovery', 'class ability']
    },

    // Popular Exotics
    'gjallarhorn': {
        term: 'Gjallarhorn',
        aliases: ['gjally', 'ghorn'],
        shortDescription: 'Exotic rocket launcher - fires Wolfpack Rounds that track enemies',
        fullExplanation: 'Gjallarhorn fires rockets that split into powerful tracking cluster missiles. Nearby allies using legendary rocket launchers gain Wolfpack Rounds on their rockets too.',
        relatedTerms: ['exotic', 'power weapon', 'rocket launcher']
    },
    'witherhoard': {
        term: 'Witherhoard',
        aliases: ['wither'],
        shortDescription: 'Exotic grenade launcher - creates damaging blight pools',
        fullExplanation: 'Witherhoard fires blighted projectiles that create pools of damaging blight on impact. Enemies that walk through pools or are directly hit take damage over time.',
        relatedTerms: ['exotic', 'kinetic', 'grenade launcher']
    },

    'vault cleanup': {
        term: 'Vault Cleanup',
        aliases: ['clean vault'],
        shortDescription: 'Identifies junk items to free up space in your vault',
        fullExplanation: 'The Vault Cleanup tool analyzes your inventory to find duplicates, low-stat rolls, and items that are statistically outperformed by gear you already have.'
    },
    'weekly reset': {
        term: 'Weekly Reset',
        aliases: ['reset'],
        shortDescription: 'Updates active burns and rewards every Tuesday',
        fullExplanation: 'Every Tuesday at 10 AM PT, Destiny 2 rotates its active modifiers, Nightfall weapons, and available rewards. This reset also refreshes vendor challenges.'
    },

    // Weapon Types
    'pulse rifle': {
        term: 'Pulse Rifle',
        aliases: ['pulse'],
        shortDescription: 'Burst-fire rifle excellent for mid-to-long range',
        fullExplanation: 'Pulse Rifles fire in bursts. They are reliable workhorses that excel at controlled fire from safe distances.'
    },
    'hand cannon': {
        term: 'Hand Cannon',
        aliases: ['hc'],
        shortDescription: 'Precision sidearms effective at mid range',
        fullExplanation: 'Hand Cannons are iconic Destiny sidearms that reward high individual shot precision and accuracy.'
    },
    'sidearm': {
        term: 'Sidearm',
        aliases: ['pistol'],
        shortDescription: 'Close-range semi-auto firearms',
        fullExplanation: 'Sidearms are quick-handling personal firearms that dominate the close-quarters combat meta.'
    },
    'rocket launcher': {
        term: 'Rocket Launcher',
        aliases: ['rocket'],
        shortDescription: 'Heavy explosive weapons for boss damage',
        fullExplanation: 'Rocket Launchers are the Kings of Burst DPS. They deal massive area damage with a single projectile.'
    },
    'fusion rifle': {
        term: 'Fusion Rifle',
        aliases: ['fusion'],
        shortDescription: 'Charged energy weapons that fire a burst of bolts',
        fullExplanation: 'Fusion Rifles require a short charge time before releasing a high-damage volley of energy bolts.'
    }
};

/**
 * Find mechanic explanation by query
 */
export function findMechanic(query: string): MechanicExplanation | null {
    const lowerQuery = query.toLowerCase();

    // Direct term match
    for (const mechanic of Object.values(GAME_MECHANICS)) {
        if (mechanic.term.toLowerCase() === lowerQuery) {
            return mechanic;
        }

        // Alias match
        if (mechanic.aliases.some(alias => lowerQuery.includes(alias))) {
            return mechanic;
        }
    }

    // Partial match
    for (const mechanic of Object.values(GAME_MECHANICS)) {
        if (lowerQuery.includes(mechanic.term.toLowerCase())) {
            return mechanic;
        }
    }

    return null;
}
