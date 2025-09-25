/*
 * Cultivation World - Simplified Idle Game
 *
 * This file implements the core game logic for a cultivation‑themed idle game.
 * Players gather Qi manually and passively, purchase upgrades to increase production,
 * learn techniques (skills), conduct research, and unlock new features as they
 * progress through spiritual realms. The code is designed to be readable and
 * easy to extend. It does not attempt to reproduce every feature discussed
 * earlier but serves as a stable foundation.
 */

// Global game state
const game = {
  qi: 0,
  qiPerTap: 1,
  qiPerSec: 0,
  herbs: 0,
    beasts: 0,
  jade: 0,
  spiritStones: 0,
  dantianCap: 1e6,
  // Multiplicative modifier for Qi capacity (dantian).  This starts at 1 and is
  // increased by upgrades such as Dantian Expansion and Nebula Elixir.  The
  // final Qi cap is computed as a function of the player’s current realm/layer
  // cost times this multiplier.  See recalcProduction() for calculation.
  dantianMult: 1,
  forgingBuffMult: 1,

  // Multiplier for Qi gained per tap.  Used for testing purposes to drastically
  // increase manual Qi gathering when enabled via a toggle in Settings.  The
  // default value is 1 (no multiplier); when set to 100, each manual
  // meditation yields 100× the usual Qi.  See gatherQi() and updateStatsUI().
  qiPerTapMult: 1,

  // Multiplier for passive Qi gained per second.  This mirrors the tap
  // multiplier and is exposed as a testing toggle in the Settings screen.
  // When enabled it multiplies the final Qi/s by 100.  Defaults to 1.
  qiPerSecMult: 1,

  // Additional forging property: overall reduction to expedition failure risk.
  // Each "Fortune Charm" forged multiplies this factor by (1 - buffValue).
  // Defaults to 1 (no effect).  When less than 1, expedition risks are reduced
  // multiplicatively.  This value is persisted across saves.
  forgingRiskMult: 1,
  // Alchemy system state
  elixirQueue: [],
  elixirInventory: {},
  activeElixirs: [],
  // Expedition party selection (indices into disciples array)
  selectedPartyIdxs: [],

  // New forging system: allow separate multipliers for each resource type and a queue of
  // artifacts being forged.  Each artifact can boost Qi, herbs, spiritStones or beasts
  // independently.  The forgingMults object stores cumulative multipliers applied
  // to each resource.  forgingQueue holds active forge tasks with their
  // completion time and target artifact id.
  forgingMults: {
    qi: 1,
    herbs: 1,
    spiritStones: 1,
    beasts: 1
  },
  forgingQueue: [],
  stage: 0, // realm index: 0=Qi Gathering, 1=Foundation, 2=Core Formation, etc.
  subLayer: 0, // 0-8 minor layers
  upgrades: {}, // {upgradeId: level}
  research: {}, // {researchId: level}
  // runtime multipliers
  multQi: 1,
  multHerbs: 1,
  multSpiritStones: 1,
  multBeasts: 1,
  multJade: 1,
  // Save version indicates the schema version for persisted game data.  Incrementing this
  // number signals that a save migration may need to run to seed new fields or adjust
  // existing ones.  The sprint B/C builds increased this to 3.
  saveVersion: 3,
  totalBreakthroughs: 0,

  // additional runtime state
  layerMult: 1,
  lastTick: Date.now(),
  autoSend: false,
  lastExpeditionType: null,
  // support multiple simultaneous expeditions.  Previously a single activeExpedition
  // tracked only one ongoing expedition.  We now use activeExpeditions keyed by
  // expedition id ('herb','stone','beast') with values containing endTime and reward.
  activeExpeditions: {}
  ,afterglowExpires: 0,
  // collapsed UI states
  achCollapsed: false,
  loreCollapsed: false,
  // quest reset timestamp (ms)
  questTimestamp: 0,
  // pity counters for expeditions
  expeditionPity: { herb: 0, stone: 0, beast: 0, beastLair: 0 }
  ,buildings: {},
  ascensionPoints: 0,
  ascensionPerks: {}
  ,settings: {
    colorBlind: false,
    largeFont: false,
    reduceMotion: false,
    theme: 'dark',
    // Index of selected background image (0-4).  Added for dynamic backgrounds
    backgroundIndex: 0
    ,
    // Whether to hide locked research and techniques by default.  Persisted across sessions.
    hideLocked: true,
    // Opacity (0-0.3) for a dimming overlay on the background image.  Higher values darken the background for better contrast.
    bgDimmer: 0
    ,
    // Per‑expedition auto‑send flags keyed by expedition id.  When the global auto‑send toggle
    // is enabled, only expedition types with a true flag here will auto‑start.  Defining this
    // property up front prevents undefined property errors when the auto‑send logic attempts
    // to read or write game.settings.autoSendTypes.
    autoSendTypes: {}
  }
  ,
  // Collapse state for cultivation sections.  When true, the corresponding list is hidden.
  skillsCollapsed: false,
  researchCollapsed: false
  ,
  // Story progress tracks choices made for each realm-based chapter.  Each key
  // corresponds to the stage index (0=Qi Gathering, 1=Foundation, etc.) and
  // stores the choice id selected.  If a stage key is absent, the player has
  // not yet made a decision for that chapter.  The story system unlocks
  // chapters automatically based on your current stage.
  story: { choices: {} }
  ,
  // Additional counters used by later achievements.  These values persist
  // across sessions and are updated whenever their associated actions occur.
  // 'expeditionsCompleted' counts the total number of expeditions finished
  // (of any type).  'bountiesClaimed' counts how many bounty rewards you have
  // collected.  'artifactsForged' counts how many times you have forged an
  // artifact.  These counters allow new achievements to be defined without
  // retroactively modifying existing structures.
  expeditionsCompleted: 0,
  bountiesClaimed: 0,
  artifactsForged: 0,
  // Last time a random event occurred (ms).  Used to throttle the frequency
  // of random events that occur during the tick() loop.  Initially set to 0.
  lastRandomEvent: 0

  ,
  // Track which UI features have been unlocked but not yet visited.  When a
  // new screen becomes available (e.g. after ascending to a new realm), a
  // small exclamation mark will appear next to its navigation button.  When
  // the player leaves that screen for the first time, the indicator is
  // cleared.  Keys are screen IDs (e.g. 'sect', 'sect-management',
  // 'sect-forging', 'dao', etc.).  Booleans indicate whether the feature
  // should currently display a notification.
  newFeatures: {},
  // Record which screens the player has visited.  A screen is considered
  // visited once the player navigates away from it.  Used in tandem with
  // `newFeatures` to determine when to show or hide notification badges.
  featuresSeen: {},
  // Track which active expeditions have their details expanded.  Keys are
  // expedition IDs, values are booleans.  When true, the expedition’s
  // duration/risk/EV details are shown even while it is in progress.  When
  // false, only the remaining time is displayed.
  expandedExpeditions: {},
  // Properties introduced by later sprints (e.g. forging upgrades, disciples assignments,
  // enhanced alchemy, bounties, etc.).  By defining them here with sensible defaults,
  // we prevent reference errors when optional systems attempt to read or write these fields
  // before a save migration has created them.
  // Parallel forging slots available (1 by default).  Increased by certain perks.
  forgingSlots: 1,
  // Global forging time multiplier (1 = normal speed).  Perks can reduce this below 1.
  forgingTimeMult: 1,
  // Track overdose cooldowns for each elixir recipe (recipe id -> timestamp).  Used by the
  // alchemy 2.0 system to prevent consuming the same elixir repeatedly in rapid succession.
  elixirOverdose: {},
  // Assign disciples to sect buildings (building id -> disciple index).  Allows buildings
  // to benefit from assigned disciple levels and loyalty.
  discipleAssignments: {},
  // Containers for daily and weekly bounty tasks.  Each element is an object describing
  // the target resource/action and the amount required.  These arrays are empty until
  // rollBounties() populates them on load.  Seeds store the randomization seed used to
  // generate the current set of bounties and change each day/week.
  dailyBounties: [],
  weeklyBounties: [],
  dailySeed: 0,
  weekSeed: 0
};

// Define realm names for display.  If more realms are reached than names defined, the helper
// function `getRealmName()` will fall back to a generic label.  Adding additional names here
// allows the game to keep the sense of progression found in cultivation novels.
const realms = [
  'Qi Gathering',
  'Foundation Establishment',
  'Core Formation',
  'Golden Core',
  'Nascent Soul',
  'Spirit Transformation',
  'Immortal Ascension',
  'Void Refinement',
  'Celestial Tribulation',
  'Divine Ascension',
  'Eternal Godhood'
];

// Helper to return a realm name or a generic label if undefined.  This ensures UI
// messages don\'t display "undefined" when the player reaches realms beyond the
// predefined list.
function getRealmName(index) {
  // Use the i18n helper if available to translate realm names.  The
  // i18n module defines keys such as 'realm.0', 'realm.1', etc.  When the
  // translation is missing (or the helper is undefined) fall back to the
  // original entry in the realms array or to a generic label.
  try {
    if (typeof window.t === 'function') {
      const key = 'realm.' + index;
      const translated = window.t(key);
      // Only use the translated string if the helper returned a non-empty
      // string that isn't just the key itself.  Otherwise fall back.
      if (translated && translated !== key) return translated;
    }
  } catch (e) {
    /* ignore any errors */
  }
  return realms[index] || `Realm ${index + 1}`;
}

// Upgrade definitions
const upgradeDefs = [
  // The Novice Techniques upgrade has been removed.  Early Qi generation now relies on
  // your innate trickle and the Meditation and Breathing Technique upgrades.
  {
    id: 'meditation',
    name: 'Meditation',
    // Meditation now provides a scaling flow of Qi.  Each level begins at
    // 5 Qi/s and the total output doubles with every subsequent level,
    // yielding 5, 10, 20, 40, 80, etc.  The description presented to the
    // player remains simple while the effect implements the exponential
    // increase.
    desc: 'Focus your mind to produce 5 Qi per second per level.',
    // Base cost and scaling remain modest so players can invest in
    // meditation early on without runaway growth.
    baseCost: 40,
    costMult: 1.22,
    effect: (level) => {
      // Starting at 5 Qi/s for level 1, double the total output with each
      // subsequent level.  This results in a geometric progression: 5, 10,
      // 20, 40, 80, etc.  If level is zero or negative (should not happen),
      // contribute nothing.
      if (level > 0) {
        const amount = 5 * Math.pow(2, level - 1);
        game.qiPerSec += amount;
      }
    },
    unlockStage: 0
  },
  {
    id: 'breathing',
    name: 'Breathing Technique',
    // Breathing now profoundly enhances manual Qi gathering.  Each level
    // increases Qi per tap by 10.  Costs remain the same to encourage early
    // investment while keeping later growth manageable.
    desc: 'Improve your breathing to gain 10 Qi per tap per level.',
    baseCost: 30,
    costMult: 1.20,
    effect: (level) => {
      game.qiPerTap += level * 10;
    },
    unlockStage: 0
  },
  {
    id: 'spiritualRoot',
    name: 'Spiritual Root',
    // The Spiritual Root now increases Qi/s by 7% per level and is more
    // expensive.  This helps prevent exponential explosions early in the game.
    desc: 'Enhance your root, increasing Qi/s by 7% per level.',
    // Spiritual Root cost reduced to make this mid‑game upgrade more accessible.
    baseCost: 150,
    costMult: 1.30,
    effect: (level) => {
      game.multQi *= Math.pow(1.07, level);
    },
    unlockStage: 0
  },
  {
    id: 'meridianOpening',
    name: 'Meridian Opening',
    // Meridian Opening now provides a 50% bonus every 5 levels instead of
    // doubling Qi/s.  The cost is higher and scales faster to curb rapid
    // exponential growth.
    desc: 'Open your meridians to increase Qi/s by 50% every 5 levels.',
    // Meridian Opening now costs slightly less to smooth out early progression.
    baseCost: 400,
    costMult: 1.33,
    effect: (level) => {
      const bonusLevels = Math.floor(level / 5);
      game.multQi *= Math.pow(1.5, bonusLevels);
    },
    unlockStage: 0
  },
  // Phase 1 upgrades (unlocked at Foundation Establishment)
  {
    id: 'pillFurnace',
    name: 'Pill Furnace',
    // Increase costs and lower the scaling to prevent excessive herb growth.  Each
    // level now boosts herb production by 30% instead of 50%.
    desc: 'Improves herb production by 20% per level.',
    baseCost: 600,
    costMult: 1.50,
    effect: (level) => {
      game.multHerbs *= Math.pow(1.20, level);
    },
    unlockStage: 1
  },
  {
    id: 'meditationFocus',
    name: 'Meditation Focus',
    // Meditation Focus augments the Breathing Technique, further improving manual
    // Qi gathering.  Each level raises Qi per tap by 15.  This scales
    // proportionally with the increased breathing benefit.
    desc: 'Raises Qi per tap by 15 per level.',
    baseCost: 500,
    costMult: 1.35,
    effect: (level) => {
      game.qiPerTap += level * 15;
    },
    unlockStage: 1
  },
  {
    id: 'dantianExpansion',
    name: 'Dantian Expansion',
    // Dantian Expansion now grants a smaller capacity boost per level and costs
    // more to purchase.  This prevents players from reaching extremely high
    // capacities too early.
    desc: 'Increase Qi capacity by 10% per level.',
    // Increase cost by 10× and set a maximum level of 10 to limit the total capacity multiplier.
    baseCost: 1000 * 10,
    costMult: 1.50,
    maxLevel: 10,
    effect: (level) => {
      game.dantianMult *= Math.pow(1.10, level);
    },
    unlockStage: 1
  },
  // Phase 2 upgrades (Core Formation)
  {
    id: 'elementalAttunement',
    name: 'Elemental Attunement',
    // Elemental Attunement now grants a smaller 3% increase to Qi/s per level and
    // costs more.  This slows mid‑game scaling.
    desc: 'Boost Qi/s by 3% per level.',
    baseCost: 3000,
    costMult: 1.60,
    effect: (level) => {
      game.multQi *= Math.pow(1.03, level);
    },
    unlockStage: 2
  },
  {
    id: 'spiritForge',
    name: 'Spirit Forge',
    // Spirit Forge now boosts stone production by 30% per level and costs more.
    desc: 'Improve stone production by 20% per level.',
    baseCost: 3000,
    costMult: 1.60,
    effect: (level) => {
      game.multSpiritStones *= Math.pow(1.20, level);
    },
    unlockStage: 2
  },
  {
    id: 'beastDen',
    name: 'Beast Den',
    // Beast Den now boosts beast energy generation by 30% per level and costs more.
    desc: 'Increase beast energy generation by 20% per level.',
    baseCost: 3000,
    costMult: 1.60,
    effect: (level) => {
      game.multBeasts *= Math.pow(1.20, level);
    },
    unlockStage: 2
  },
  // Phase 3+ upgrades
  {
    id: 'talismanWorkshop',
    name: 'Talisman Workshop',
    // The workshop reduces forging costs and time by a more modest amount and
    // costs more, reflecting the increasing difficulty of late‑game scaling.
    desc: 'Reduce forging costs and time by 3% per level.',
    baseCost: 6000,
    costMult: 1.65,
    effect: (level) => {
      // handled in forging calculations
    },
    unlockStage: 3
  },
  {
    id: 'spiritWell',
    name: 'Spirit Well',
    // The Spirit Well now increases offline Qi gain by 5% per level and costs more.
    desc: 'Boost offline Qi accumulation by 5% per level.',
    baseCost: 9000,
    costMult: 1.70,
    effect: (level) => {
      // handled in offline progress
    },
    unlockStage: 3
  },
  {
    id: 'daoComprehension',
    name: 'Dao Comprehension',
    // Dao Comprehension now reduces technique costs by 3% per level and has a
    // higher base cost and multiplier.
    desc: 'Reduce technique costs by 3% per level.',
    baseCost: 12000,
    costMult: 1.70,
    effect: (level) => {
      // handled in technique cost calculation
    },
    unlockStage: 3
  }
  ,
  {
    id: 'heavenlyThunder',
    name: 'Heavenly Thunder',
    // Heavenly Thunder now provides a smaller Qi/s increase per level and costs more.
    desc: 'Qi/s increased by 1% per level and forging buffs grow stronger.',
    baseCost: 25000,
    costMult: 1.80,
    effect: (level) => {
      game.multQi *= Math.pow(1.01, level);
    },
    unlockStage: 4
  },
  {
    id: 'daoistInsights',
    name: 'Daoist Insights',
    // Daoist Insights now provides a 2% reduction to research costs per level and
    // costs more.
    desc: 'Reduces research costs by 2% per level.',
    baseCost: 30000,
    costMult: 1.80,
    effect: (level) => {
      // handled in research cost calculation
    },
    unlockStage: 5
  }
  ,
  // Monumental late‑game upgrades to further amplify cultivation. These upgrades unlock beyond
  // Eternal Godhood and provide massive multipliers to various resources. Their descriptions
  // are intentionally long to reflect the epic nature of the feats and to significantly
  // increase the code size as requested.
  {
    id: 'stellarComprehension',
    name: 'Stellar Comprehension',
    desc: 'Attune your consciousness to the movements of the stars across the endless cosmos. Each level exponentially increases Qi production by 10%, reflecting the profound secrets gleaned from celestial bodies and aligning your inner world with the universal rhythm.',
    baseCost: 1e6,
    costMult: 2.0,
    effect: (level) => {
      // Increase Qi/s multiplicatively
      game.multQi *= Math.pow(1.10, level);
    },
    unlockStage: 6
  },
  {
    id: 'cosmicBreath',
    name: 'Cosmic Breath',
    desc: 'Refine your breathing by drawing in cosmic energies. Each level greatly increases Qi per tap by 80, allowing cultivators to harness the breath of the universe itself. This technique echoes the breathing patterns of ancient immortals and brings your mortal shell closer to the Dao.',
    baseCost: 5e5,
    costMult: 2.0,
    effect: (level) => {
      game.qiPerTap += level * 80;
    },
    unlockStage: 6
  },
  {
    id: 'nebulaElixir',
    name: 'Nebula Elixir',
    desc: 'Brew elixirs infused with the essence of nebulae, expanding your dantian and enhancing herb production. Each level multiplies Qi capacity by 20% and herb generation by 10%, symbolising the vastness of the nebula within your sea of consciousness.',
    // Increase cost by 10× and limit the maximum level to 10.  This makes dantian
    // capacity upgrades significantly more expensive and finite.
    baseCost: 8e5 * 10,
    costMult: 2.1,
    maxLevel: 10,
    effect: (level) => {
      // Nebula Elixir expands Qi capacity and boosts herb production.  Adjust the
      // multiplicative factor for dantian capacity rather than the cap directly.
      game.dantianMult *= Math.pow(1.20, level);
      game.multHerbs *= Math.pow(1.10, level);
    },
    unlockStage: 6
  },
  {
    id: 'galacticMining',
    name: 'Galactic Mining',
    desc: 'Establish stone harvesting colonies throughout the galaxy. Each level multiplies stone production by 20%, tapping into the rich ore veins of distant planets and asteroids.',
    baseCost: 1e6,
    costMult: 2.2,
    effect: (level) => {
      game.multSpiritStones *= Math.pow(1.20, level);
    },
    unlockStage: 7
  },
  {
    id: 'beastRealm',
    name: 'Beast Realm',
    desc: 'Journey to the Beast Realm to tame legendary spirit beasts. Each level increases beast energy generation by 20%, reflecting the aid of mythical companions such as dragons, phoenixes and qilins.',
    baseCost: 1e6,
    costMult: 2.2,
    effect: (level) => {
      game.multBeasts *= Math.pow(1.20, level);
    },
    unlockStage: 7
  },
  {
    id: 'manaPool',
    name: 'Mana Pool',
    // Adjusted to match the new meditation baseline.  Mana Pool now grants +50
    // Qi per second per level while retaining its +100 Qi per tap bonus.  This
    // positions the upgrade as a powerful late‑game source of both passive and
    // active Qi generation.
    desc: 'Cultivate a vast mana pool within your dantian. Each level grants +50 Qi per second and +100 Qi per tap, representing the inexhaustible flow of primal energy into your cultivation base.',
    baseCost: 7e5,
    costMult: 2.0,
    effect: (level) => {
      game.qiPerSec += level * 50;
      game.qiPerTap += level * 100;
    },
    unlockStage: 6
  },
  {
    id: 'spiritArrayAmplification',
    name: 'Spirit Array Amplification',
    desc: 'Deploy massive spirit arrays around your sect to channel cosmic energies. Each level multiplies Qi, herb, spirit stone and beast generation by 15%. These arrays reflect the ancient art of formation masters and turn your sect into a beacon of cultivation.',
    baseCost: 2e6,
    costMult: 2.3,
    effect: (level) => {
      game.multQi *= Math.pow(1.15, level);
      game.multHerbs *= Math.pow(1.15, level);
      game.multSpiritStones *= Math.pow(1.15, level);
      game.multBeasts *= Math.pow(1.15, level);
    },
    unlockStage: 7
  },
  {
    id: 'voidPierce',
    name: 'Void Pierce',
    desc: 'Pierce through the void to harvest resources from alternate dimensions. Each level boosts herb, spirit stone and beast production by 10%, reflecting the spoils of other realms bleeding into yours.',
    baseCost: 1.2e6,
    costMult: 2.2,
    effect: (level) => {
      game.multHerbs *= Math.pow(1.10, level);
      game.multSpiritStones *= Math.pow(1.10, level);
      game.multBeasts *= Math.pow(1.10, level);
    },
    unlockStage: 8
  },
  {
    id: 'originTalisman',
    name: 'Origin Talisman',
    desc: 'Craft talismans that resonate with the origin of Qi, subtly reducing all costs and enhancing cultivation speed. Each level increases Qi/s by 5% and reduces upgrade costs by 2% (handled elsewhere).',
    baseCost: 1.5e6,
    costMult: 2.5,
    effect: (level) => {
      game.multQi *= Math.pow(1.05, level);
      // cost reduction handled in purchase calculations
    },
    unlockStage: 8
  },
  {
    id: 'eternalFlame',
    name: 'Eternal Flame',
    // With the new scale of Qi per second, Eternal Flame now adds 100 Qi per
    // second per level, maintaining its role as a capstone upgrade.  The 5%
    // Spirit Stone bonus remains unchanged.
    desc: 'Ignite the eternal flame within your dantian. Each level adds 100 Qi per second and 5% more Spirit Stones on ascension, symbolising the rebirth of your cultivation base and the endless cycle of rising flame.',
    baseCost: 2e6,
    costMult: 2.5,
    effect: (level) => {
      game.qiPerSec += level * 100;
      // spirit stone bonus applied during ascension calculations
    },
    unlockStage: 9
  }
];

// Research definitions
const researchDefs = [
  {
    id: 'qiResearch',
    name: 'Qi Research',
    // Qi Research now provides a modest 1% boost per level, slowing late growth.
    desc: 'Increase Qi per second by 1% per level.',
    baseCost: 500,
    costMult: 2.0,
    effect: (level) => {
      game.multQi *= Math.pow(1.01, level);
    },
    unlockStage: 1
  },
  {
    id: 'herbResearch',
    name: 'Herb Research',
    // Herb Research now increases herb generation by 4% per level.
    desc: 'Increase herb generation by 4% per level.',
    baseCost: 500,
    costMult: 2.2,
    effect: (level) => {
      game.multHerbs *= Math.pow(1.04, level);
    },
    unlockStage: 1
  },
  {
    id: 'stoneResearch',
    name: 'Spirit Stone Research',
    // Spirit Stone Research now increases spirit stone generation by 4% per level.
    desc: 'Increase spirit stone generation by 4% per level.',
    baseCost: 500,
    costMult: 2.2,
    effect: (level) => {
      game.multSpiritStones *= Math.pow(1.04, level);
    },
    unlockStage: 2
  },
  {
    id: 'beastResearch',
    name: 'Beast Research',
    // Beast Research now increases beast energy generation by 4% per level.
    desc: 'Increase beast energy generation by 4% per level.',
    baseCost: 500,
    costMult: 2.2,
    effect: (level) => {
      game.multBeasts *= Math.pow(1.04, level);
    },
    unlockStage: 2
  },
  {
    id: 'jadeResearch',
    name: 'Jade Research',
    desc: 'Reduce technique costs by 2% per level.',
    baseCost: 1000,
    costMult: 2.5,
    effect: (level) => {
      // handled in technique cost
    },
    unlockStage: 3
  },
  {
    id: 'logistics',
    name: 'Logistics',
    // Logistics research now provides a smaller bonus per level to prevent
    // expeditions from becoming too short or too lucrative.  The descriptive
    // text reflects this reduced effect.
    desc: 'Reduce expedition durations and increase rewards by 0.5% per level.',
    baseCost: 2000,
    costMult: 3.0,
    effect: (level) => {
      // handled in expedition calculations
    },
    unlockStage: 2,
    prereq: { id: 'qiResearch', level: 5 }
  }
  ,
  // Additional late‑game research topics
  {
    id: 'alchemyResearch',
    name: 'Alchemy Research',
    // Alchemy research now yields only a 1% increase per level to Qi/s and elixir
    // potency, slowing endgame scaling.
    desc: 'Increases elixir potency and Qi/s by 1% per level.',
    baseCost: 5000,
    costMult: 3.5,
    effect: (level) => {
      game.multQi *= Math.pow(1.01, level);
    },
    unlockStage: 3
  },
  {
    id: 'sectResearch',
    name: 'Sect Research',
    // Sect research now increases disciple output by 0.5% per level, tempering
    // the scaling from disciples.
    desc: 'Increases disciple output by 0.5% per level.',
    baseCost: 5000,
    costMult: 3.5,
    effect: (level) => {
      // Handled in disciple production calculations during tick
    },
    unlockStage: 4
  }
  ,
  // Monumental research projects unlocked late in the game. These topics explore the
  // deeper mysteries of the Dao and provide enormous boosts to your cultivation. Their
  // descriptions are deliberately verbose to augment the source file size while
  // emphasising the epic journey beyond immortality.
  {
    id: 'cosmicAlignment',
    name: 'Cosmic Alignment',
    desc: 'Align your internal energies with the cosmic ley lines. Each level increases both Qi per second and Qi per tap by 2%. As your cultivation resonates with the universe, every breath draws in stardust and every heartbeat echoes the pulse of galaxies.',
    baseCost: 2e4,
    costMult: 3.0,
    effect: (level) => {
      game.multQi *= Math.pow(1.02, level);
      game.qiPerTap *= Math.pow(1.02, level);
    },
    unlockStage: 5
  },
  {
    id: 'universalResonance',
    name: 'Universal Resonance',
    desc: 'Harmonise with the vibrations of the entire universe. Each level amplifies all resource production (herbs, spiritStones, beasts, and jade) by 5%. This research reflects the subtle interplay between all forms of energy and matter.',
    baseCost: 3e4,
    costMult: 3.2,
    effect: (level) => {
      game.multHerbs *= Math.pow(1.05, level);
      game.multSpiritStones *= Math.pow(1.05, level);
      game.multBeasts *= Math.pow(1.05, level);
      game.multJade *= Math.pow(1.05, level);
    },
    unlockStage: 6
  },
  {
    id: 'soulSearch',
    name: 'Soul Search',
    desc: 'Dive deep into the sea of your soul to uncover hidden potentials. Each level increases Spirit Stone rewards from ascension by 5%. The greater your insight, the richer the rewards drawn from your inner world.',
    baseCost: 5e4,
    costMult: 3.5,
    effect: (level) => {
      // applied during ascension calculations
    },
    unlockStage: 6
  },
  {
    id: 'ascensionTheory',
    name: 'Ascension Theory',
    desc: 'Study the mechanics of ascension itself. Each level reduces the Qi requirement for each layer and realm breakthrough by 2%, easing the path toward greater heights. Theoretical insights translate into practical breakthroughs.',
    baseCost: 4e4,
    costMult: 3.5,
    effect: (level) => {
      // applied in getLayerCost via global multiplier
    },
    unlockStage: 7
  },
  {
    id: 'temporalRift',
    name: 'Temporal Rift',
    desc: 'Tear open rifts in time to extend how long you can cultivate offline. Each level adds one hour to the offline progress cap, allowing your cultivation to continue even when you step away from the mortal world.',
    baseCost: 6e4,
    costMult: 3.8,
    effect: (level) => {
      // applied in offline progress calculations
    },
    unlockStage: 7
  }
];

// Story definitions describe narrative chapters that unlock at specific realms.
// Each chapter contains a title, an array of paragraph strings, and an array of
// choice objects.  Choices provide a description and a reward.  The player can
// select only one choice per chapter; the reward is applied immediately and
// permanently.  Rewards use additive fields for flat increases (qiPerTap,
// qiPerSec, qi) and multiplicative fields for percentage boosts (multQi,
// multHerbs, multSpiritStones, multBeasts, dantianMult).  See applyStoryReward().
const storyDefs = [
  {
    stage: 0,
    title: 'Awakening',
    content: [
      'Your consciousness stirs in an unfamiliar void.  The last memories of your past life fade as a voice echoes: "Welcome, chosen soul.  I grant you a mystical artifact to guide your cultivation."',
      'Warm currents of Qi begin to seep into your body.  You slowly sense a core forming within your lower abdomen – your dantian.  A faint pressure builds as the ambient energy of the world rushes in.'
    ],
    choices: [
      {
        id: 'focusMeditation',
        desc: 'Focus on meditation to strengthen your mind (+10 Qi per tap)',
        reward: { qiPerTap: 10 }
      },
      {
        id: 'studyHerbs',
        desc: 'Study herbs and basic alchemy (herb production ×1.03)',
        reward: { multHerbs: 1.03 }
      },
      {
        id: 'widenMeridians',
        desc: 'Explore your meridians to widen them (Qi capacity ×1.05)',
        reward: { dantianMult: 1.05 }
      }
    ]
  },
  {
    stage: 1,
    title: 'Laying a Strong Foundation',
    content: [
      'Having mastered the basics of Qi manipulation, you begin to construct a stable foundation.  The voice encourages you to solidify your core and explore the wider world.',
      'Fellow cultivators offer guidance: some teach martial techniques, others alchemy, and yet others leadership.  You must decide how to focus your efforts as your sect grows.'
    ],
    choices: [
      {
        id: 'trainDisciples',
        // Disciples now provide a much greater passive yield.  Each disciple
        // trained here grants an additional 10 Qi per second to your sect.
        desc: 'Recruit and train disciples (+10 Qi per second)',
        reward: { qiPerSec: 10 }
      },
      {
        id: 'studyAlchemyFurther',
        desc: 'Pursue deeper alchemical studies (herb production ×1.05)',
        reward: { multHerbs: 1.05 }
      },
      {
        id: 'practiceSword',
        desc: 'Practice swordplay rigorously (+15 Qi per tap)',
        reward: { qiPerTap: 15 }
      }
    ]
  },
  {
    stage: 2,
    title: 'Forging the Core',
    content: [
      'Your cultivation advances, condensing loose Qi into a nascent core.  To break through, you must refine your energy and discipline.',
      'The world now recognises your sect.  Merchants offer rare spiritStones, beasts roam your territories, and your decisions will shape the sect\'s destiny.'
    ],
    choices: [
      {
        id: 'forgeArtifactsEarly',
        desc: 'Start forging simple artifacts (stone production ×1.05)',
        reward: { multSpiritStones: 1.05 }
      },
      {
        id: 'beastHunt',
        desc: 'Organise a beast hunt (beast energy production ×1.05)',
        reward: { multBeasts: 1.05 }
      },
      {
        id: 'sectLeadership',
        desc: 'Invest in sect leadership and administration (Qi production ×1.02)',
        reward: { multQi: 1.02 }
      }
    ]
  }
  ,
  {
    // Stage 3 corresponds to the Golden Core realm.  At this point the
    // cultivator crystallises their core into a golden elixir.  Choices
    // provide moderate percentage boosts to various systems to avoid
    // overpowering the player.
    stage: 3,
    title: 'Crystallising the Core',
    content: [
      'The swirling energy within your body suddenly condenses into a brilliant golden elixir.  A surge of power floods your meridians as your core crystallises, illuminating your dantian.',
      'With this newfound strength you can temper your core with heavenly thunder, hone your alchemical arts or focus on training the disciples who now look up to you as a true master.'
    ],
    choices: [
      {
        id: 'temperThunder',
        desc: 'Temper your core with heavenly thunder (Qi production ×1.06)',
        reward: { multQi: 1.06 }
      },
      {
        id: 'elixirArt',
        desc: 'Refine elixirs to nourish your sect (herb and stone production ×1.05)',
        reward: { multHerbs: 1.05, multSpiritStones: 1.05 }
      },
      {
        id: 'trainSect',
        // Scaling: this choice now grants +5 Qi per second instead of +0.5 to
        // align with the new meditation baseline.  The disciple output
        // multiplier remains at 1.05.
        desc: 'Focus on disciplining your sect (disciple Qi output ×1.05 and +5 Qi per second)',
        reward: { multQi: 1.05, qiPerSec: 5 }
      }
    ]
  },
  {
    // Stage 4 corresponds to the Nascent Soul realm.  At this stage the
    // cultivator births a nascent soul, separating mind and body.  Choices
    // emphasise research, capacity and further Qi production.  Rewards are
    // slightly higher than earlier chapters but still balanced.
    stage: 4,
    title: 'Birth of the Nascent Soul',
    content: [
      'As your golden core shatters, your consciousness coalesces into a radiant nascent soul.  You feel your mind detach from your physical shell, capable of roaming through the spiritual planes.',
      'The nascent soul brings clarity and vision.  Will you use this insight to expand your dantian, delve into esoteric research or commune with the cosmos to draw in more Qi?' 
    ],
    choices: [
      {
        id: 'expandSea',
        desc: 'Expand the boundless sea within (Qi capacity ×1.10)',
        reward: { dantianMult: 1.10 }
      },
      {
        id: 'esotericResearch',
        desc: 'Delve into esoteric research (all research effects ×1.05)',
        reward: { multHerbs: 1.05, multSpiritStones: 1.05, multBeasts: 1.05, multQi: 1.05 }
      },
      {
        id: 'cosmicCommunion',
        desc: 'Commune with the cosmos (Qi production ×1.05 and Qi per tap +25)',
        reward: { multQi: 1.05, qiPerTap: 25 }
      }
    ]
  }
  ,
  {
    // Stage 5 corresponds to the Spirit Transformation realm.  Here the nascent
    // soul evolves, fusing mind and spirit into a unified essence.  Rewards
    // focus on enhancing Qi production and refining beast and resource flows.
    stage: 5,
    title: 'Transcending the Spirit',
    content: [
      'Your nascent soul stretches outward, merging with the spiritual currents of the world.  Mortality fades as your essence transforms into a boundless spirit form.',
      'In this realm of pure spirit, you can choose to deepen your link to Qi, attune to the beasts that roam your domain, or widen the channels that feed your sect.  Each path will shape your cultivation forever.'
    ],
    choices: [
      {
        id: 'spiritQiHarmony',
        desc: 'Harmonise your spirit with Qi (Qi production ×1.08)',
        reward: { multQi: 1.08 }
      },
      {
        id: 'beastSymbiosis',
        desc: 'Forge a symbiosis with spirit beasts (beast energy ×1.08)',
        reward: { multBeasts: 1.08 }
      },
      {
        id: 'channelExpansion',
        desc: 'Expand channels for herbs and spiritStones (herb and stone production ×1.05)',
        reward: { multHerbs: 1.05, multSpiritStones: 1.05 }
      }
    ]
  },
  {
    // Stage 6 corresponds to the Immortal Ascension realm.  The cultivator
    // breaks free of mortal cycles, ascending to an immortal body.  Choices
    // provide modest but broad upgrades to core stats or resource multipliers.
    stage: 6,
    title: 'Immortal Awakening',
    content: [
      'Lightning arcs across your meridians as your spirit form condenses into an immortal body.  Mortal flesh is shed; your lifespan stretches into the eons.',
      'As an immortal, you may refine your Qi to flow like a river, cultivate the raw materials of the world, or stretch your dantian to house the boundless energies you will command.'
    ],
    choices: [
      {
        id: 'immortalQiRiver',
        // With meditation yielding much more Qi, this choice now bestows a
        // significantly larger flat bonus of 20 Qi per second.  The
        // multiplicative bonus to Qi production remains unchanged.
        desc: 'Let your Qi flow endlessly (+20 Qi per second and Qi production ×1.03)',
        reward: { qiPerSec: 20, multQi: 1.03 }
      },
      {
        id: 'immortalResourceMastery',
        desc: 'Master worldly resources (herb, spirit stone and beast production ×1.05)',
        reward: { multHerbs: 1.05, multSpiritStones: 1.05, multBeasts: 1.05 }
      },
      {
        id: 'immortalSea',
        desc: 'Expand your dantian into a sea (Qi capacity ×1.10)',
        reward: { dantianMult: 1.10 }
      }
    ]
  },
  {
    // Stage 7 corresponds to the Void Refinement realm.  You refine your
    // existence using the emptiness of the void, bending space and time.  Choices
    // improve expedition efficiency, forging and overall resource multipliers.
    stage: 7,
    title: 'Refining the Void',
    content: [
      'You gaze into the abyss and see not darkness but infinite potential.  The void welcomes you as you refine your being, untethered by space and matter.',
      'Choose to harness the void to shorten journeys, imbue spiritStones with null energy for forging, or equilibrate the flows of all resources in harmony.'
    ],
    choices: [
      {
        id: 'voidLogistics',
        desc: 'Fold space to quicken expeditions (expedition time −10%)',
        reward: { expeditionTimeMult: 0.90 }
      },
      {
        id: 'voidForging',
        desc: 'Imbue ores with void essence (stone production ×1.05 and forging costs −5%)',
        reward: { multSpiritStones: 1.05, forgeCostMult: 0.95 }
      },
      {
        id: 'voidEquilibrium',
        desc: 'Embrace void equilibrium (all resource production ×1.04)',
        reward: { multHerbs: 1.04, multSpiritStones: 1.04, multBeasts: 1.04, multQi: 1.04 }
      }
    ]
  },
  {
    // Stage 8 corresponds to the Celestial Tribulation realm.  Facing
    // heavens-shaking tribulations tempers your soul.  Choices focus on
    // amplifying Qi, forging, or disciple power as rewards for surviving
    // cosmic lightning.
    stage: 8,
    title: 'Enduring Tribulation',
    content: [
      'Thunder roars and celestial bolts crash down upon you.  The heavens test your conviction as you weather tribulations that would shatter lesser cultivators.',
      'Will you channel this lightning to temper your Qi and strikes, redirect it to your forging furnace, or share the tempering with the disciples under your wing?' 
    ],
    choices: [
      {
        id: 'tribulationChannel',
        desc: 'Channel lightning through your meridians (Qi production ×1.06 and +25 Qi per tap)',
        reward: { multQi: 1.06, qiPerTap: 25 }
      },
      {
        id: 'tribulationForge',
        desc: 'Power your forge with heavenly fire (stone production ×1.05 and forging costs −10%)',
        reward: { multSpiritStones: 1.05, forgeCostMult: 0.90 }
      },
      {
        id: 'tribulationDisciples',
        desc: 'Share tribulation insights with disciples (disciple Qi output ×1.06)',
        reward: { discipleMult: 1.06 }
      }
    ]
  },
  {
    // Stage 9 corresponds to the Divine Ascension realm.  Ascending to a
    // divine plane grants dominion over aspects of existence.  Choices allow
    // players to become patrons of life, earth or spirit, bestowing focused
    // boosts.
    stage: 9,
    title: 'Assuming Divinity',
    content: [
      'You step into the halls of divinity.  Essence coalesces around you as reality itself bends at your will.  You are called to champion a domain.',
      'Choose to steward life, shape the earth, or command the endless tides of Qi.  Each role confers blessings upon your sect and your cultivation.'
    ],
    choices: [
      {
        id: 'divineLife',
        desc: 'Become a patron of life (herb and beast production ×1.08)',
        reward: { multHerbs: 1.08, multBeasts: 1.08 }
      },
      {
        id: 'divineEarth',
        desc: 'Shape the earth (stone production ×1.08 and forging costs −10%)',
        reward: { multSpiritStones: 1.08, forgeCostMult: 0.90 }
      },
      {
        id: 'divineSpirit',
        desc: 'Command the tides of Qi (Qi production ×1.08)',
        reward: { multQi: 1.08 }
      }
    ]
  },
  {
    // Stage 10 corresponds to the Eternal Godhood realm.  This is the
    // culmination of the cultivation journey.  Choices are significant but
    // remain balanced.  The narrative emphasises transcendence and cyclical
    // rebirth, offering paths that benefit multiple systems.
    stage: 10,
    title: 'Transcending Eternity',
    content: [
      'Time and space bow before you.  Your consciousness spans galaxies and aeons.  You have reached Eternal Godhood, the apex of cultivation and the cusp of boundless possibilities.',
      'At this highest peak, will you weave the cosmos together, forge artifacts of myth, or embrace the cycle and share your accumulation with future generations?'
    ],
    choices: [
      {
        id: 'eternalWeave',
        desc: 'Weave the cosmos into a tapestry (all production ×1.05)',
        reward: { multQi: 1.05, multHerbs: 1.05, multSpiritStones: 1.05, multBeasts: 1.05 }
      },
      {
        id: 'eternalForge',
        desc: 'Craft artifacts of myth (Qi capacity ×1.15 and forging costs −10%)',
        reward: { dantianMult: 1.15, forgeCostMult: 0.90 }
      },
      {
        id: 'eternalCycle',
        desc: 'Embrace the eternal cycle (Ascension Spirit Stone rewards ×1.10)',
        reward: { ascensionRewardMult: 1.10 }
      }
    ]
  }
  // Future chapters can be added here for realms beyond Eternal Godhood if necessary.
];

// Relic definitions for late‑game depth.  When the player forges a certain
// number of artifacts, they unlock powerful relics that grant permanent
// bonuses.  These relics provide meaningful goals beyond the early
// ascension stages and reward dedication to forging.
const relicDefs = [
  {
    id: 'relicTenacity',
    name: 'Relic of Tenacity',
    threshold: 5,
    reward: { multQi: 1.05 }
  },
  {
    id: 'relicAbundance',
    name: 'Relic of Abundance',
    threshold: 10,
    reward: { multHerbs: 1.05, multSpiritStones: 1.05, multBeasts: 1.05 }
  },
  {
    id: 'relicVoid',
    name: 'Relic of the Void',
    threshold: 20,
    reward: { expeditionTimeMult: 0.90, forgeCostMult: 0.90 }
  },
  {
    id: 'relicEternity',
    name: 'Relic of Eternity',
    threshold: 50,
    reward: { dantianMult: 1.25 }
  }
];

// Check if any relic milestones have been reached.  Called after each
// forging.  If the player has forged enough artifacts and the relic has
// not yet been claimed, apply its rewards and mark it as collected.
function checkRelics() {
  if (!game.relics) game.relics = {};
  relicDefs.forEach(rel => {
    const forged = game.artifactsForged || 0;
    if (forged >= rel.threshold && !game.relics[rel.id]) {
      game.relics[rel.id] = true;
      // Reuse the story reward handler to apply multiplicative/additive bonuses
      applyStoryReward(rel.reward);
      showToast(`You have discovered the ${rel.name}! Its essence empowers your cultivation.`);
      saveGame();
    }
  });
}

// Tutorials have been removed.  Provide empty stubs to preserve backward
// compatibility in case any residual calls remain.  These functions now do
// nothing and allow the game to operate without a tutorial system.
function updateTutorialUI() {
  // no‑op: tutorial overlay has been removed
}

function advanceTutorial() {
  // no‑op: tutorial progression disabled
}

// Apply story rewards.  For additive rewards (qi, qiPerTap, qiPerSec) we add
// the value.  For multiplicative rewards (mult* and dantianMult) we multiply.
function applyStoryReward(reward) {
  for (const key in reward) {
    const value = reward[key];
    if (key === 'qi') {
      game.qi += value;
    } else if (key === 'qiPerTap') {
      game.qiPerTap += value;
    } else if (key === 'qiPerSec') {
      game.qiPerSec += value;
    } else if (key === 'dantianMult') {
      game.dantianMult *= value;
    } else if (key === 'multQi') {
      game.multQi *= value;
    } else if (key === 'multHerbs') {
      game.multHerbs *= value;
    } else if (key === 'multSpiritStones') {
      game.multSpiritStones *= value;
    } else if (key === 'multBeasts') {
      game.multBeasts *= value;
    } else if (key === 'multJade') {
      game.multJade *= value;
    } else if (key === 'forgeCostMult') {
      // Reduce forging costs by multiplying a separate multiplier.  The multiplier
      // starts at 1, so values below 1 reduce costs (e.g. 0.90 → 10% reduction).
      if (typeof game.forgeCostMult === 'undefined') game.forgeCostMult = 1;
      game.forgeCostMult *= value;
    } else if (key === 'expeditionTimeMult') {
      // Reduce expedition duration.  The multiplier multiplies with other
      // logistics modifiers.  Lower than 1 results in shorter expeditions.
      if (typeof game.expeditionTimeMult === 'undefined') game.expeditionTimeMult = 1;
      game.expeditionTimeMult *= value;
    } else if (key === 'discipleMult') {
      // Boost disciple output across all resources.  Default is 1.
      if (typeof game.discipleMult === 'undefined') game.discipleMult = 1;
      game.discipleMult *= value;
    } else if (key === 'ascensionRewardMult') {
      // Increase Spirit Stone rewards from ascension.  Default is 1.
      if (typeof game.ascensionRewardMult === 'undefined') game.ascensionRewardMult = 1;
      game.ascensionRewardMult *= value;
    }
    // Unknown keys are ignored.
  }
  // Recalculate production and refresh stats after applying rewards
  recalcProduction();
  updateStatsUI();
}

// Handle selecting a story choice for a given stage.  If a choice has already
// been selected, it does nothing.  Rewards are applied immediately.
function selectStoryChoice(stage, index) {
  const chapter = storyDefs.find(ch => ch.stage === stage);
  if (!chapter) return;
  if (!game.story) game.story = { choices: {} };
  if (!game.story.choices) game.story.choices = {};
  if (game.story.choices[stage]) {
    showToast('You have already chosen a path for this chapter.');
    return;
  }
  const choice = chapter.choices && chapter.choices[index];
  if (!choice) return;
  game.story.choices[stage] = choice.id;
  applyStoryReward(choice.reward);
  showToast('Your decision echoes along your cultivation path.');
  updateStoryUI();
  saveGame();
}

// Update the Story page UI.  This function regenerates the chapter list
// according to the player\'s current stage and previous choices.  Locked
// chapters display a message indicating the required realm.
function updateStoryUI() {
  const container = document.getElementById('story-chapters');
  if (!container) return;
  // Clear existing content
  container.innerHTML = '';
  storyDefs.forEach(chapter => {
    // Skip chapters that are more than one realm ahead of the player
    if (chapter.stage > game.stage + 1) {
      return;
    }
    // Build card HTML for this chapter
    let html = '<div class="card">';
    html += '<div class="card-header"><span>' + chapter.title + '</span></div>';
    html += '<div class="card-body">';
    if (game.stage < chapter.stage) {
      // Chapter is locked but within one stage ahead (so show requirement)
      html += '<p><em>Ascend to ' + getRealmName(chapter.stage) + ' to unlock this chapter.</em></p>';
    } else {
      // Unlocked: add narrative paragraphs
      chapter.content.forEach(par => {
        html += '<p>' + par + '</p>';
      });
      // Add choices if available
      if (chapter.choices && chapter.choices.length > 0) {
        const chosenId = game.story && game.story.choices && game.story.choices[chapter.stage];
        if (!chosenId) {
          html += '<div class="story-choices">';
          chapter.choices.forEach((choice, idx) => {
            html += '<button class="story-choice-btn" data-stage="' + chapter.stage + '" data-choice-index="' + idx + '">' + choice.desc + '</button>';
          });
          html += '</div>';
        } else {
          const chosen = chapter.choices.find(c => c.id === chosenId);
          if (chosen) {
            html += '<p><em>You chose: ' + chosen.desc + '</em></p>';
          }
        }
      }
    }
    html += '</div></div>';
    container.innerHTML += html;
  });
  // Attach listeners to new buttons
  container.querySelectorAll('.story-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const stage = parseInt(btn.dataset.stage, 10);
      const index = parseInt(btn.dataset.choiceIndex, 10);
      selectStoryChoice(stage, index);
    });
  });
}

// Techniques definitions (simplified)
const skillDefs = [
  {
    id: 'alchemy',
    name: 'Alchemy',
    desc: 'Brew elixirs to temporarily boost Qi production.',
    baseCost: 100,
    costMult: 2.0,
    effect: (level) => {
      // each level unlocks more potent elixirs; simplified placeholder
    },
    currency: 'spiritStones'
  },
  {
    id: 'swordplay',
    name: 'Swordplay',
    desc: 'Master sword techniques to increase Qi per tap by 50 per level.',
    baseCost: 200,
    costMult: 2.0,
    effect: (level) => {
      game.qiPerTap += level * 50;
    },
    currency: 'spiritStones'
  },
  {
    id: 'bodyCultivation',
    name: 'Body Cultivation',
    desc: 'Strengthen your body to increase Qi per second by 5% per level.',
    baseCost: 200,
    costMult: 2.0,
    effect: (level) => {
      game.multQi *= Math.pow(1.05, level);
    },
    currency: 'spiritStones'
  },
  {
    id: 'beastTaming',
    name: 'Beast Taming',
    desc: 'Learn to tame spirit beasts, increasing beast energy by 5% per level (multiplicative).',
    baseCost: 200,
    costMult: 2.0,
    effect: (level) => {
      game.multBeasts *= Math.pow(1.05, level);
    },
    currency: 'spiritStones'
  }
  ,
  // Additional late‑game techniques
  {
    id: 'sectLeadership',
    name: 'Sect Leadership',
    desc: 'Increases disciple Qi output by 50% per level.',
    baseCost: 1000,
    costMult: 2.5,
    effect: (level) => {
      // disciple output scaling handled in tick
    },
    currency: 'spiritStones'
  },
  {
    id: 'soulRefinement',
    name: 'Soul Refinement',
    desc: 'Increase Spirit Stone rewards from ascension by 10% per level.',
    baseCost: 1000,
    costMult: 2.5,
    effect: (level) => {
      // handled during realm ascension
    },
    currency: 'spiritStones'
  }
];

// Helper to format numbers with suffixes and decimals
function formatNumber(n) {
  if (n < 1000) {
    return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
  }
  // Extend suffixes beyond trillions.  After T (trillion) come the
  // common incremental game abbreviations: Qa (quadrillion), Qi (quintillion),
  // Sx (sextillion), Sp (septillion), Oc (octillion), No (nonillion),
  // De (decillion).  If numbers grow beyond these ranges the last
  // suffix will continue to be used.
  const suffixes = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'De'];
  let i = -1;
  while (n >= 1000 && i < suffixes.length - 1) {
    n /= 1000;
    i++;
  }
  return n.toFixed(2) + suffixes[i];
}

// Convert internal resource keys to human‑readable display names.  This helper
// ensures that expedition EV values label “beasts” as “Beast Energy” and
// maintains consistent capitalisation for other resources.  When a new
// resource is introduced, extend the switch statement accordingly.
function getResourceDisplayName(res) {
  switch (res) {
    case 'herbs':
      return 'Herbs';
    case 'spiritStones':
      return 'Spirit Stones';
    case 'beasts':
      return 'Beast Energy';
    case 'jade':
      return 'Jade';
    case 'qi':
      return 'Qi';
    default:
      // Capitalise the first letter as a fallback
      return res.charAt(0).toUpperCase() + res.slice(1);
  }
}

// Generate a simple unique identifier for queued tasks.  We use base36 to
// shorten the string and Math.random plus current timestamp for entropy.
// This function is used to assign IDs to forging queue entries and does
// not need to be cryptographically secure.
function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// Load game from localStorage
function loadGame() {
  try {
    const data = JSON.parse(localStorage.getItem('cultivationGame'));
    if (data) {
      Object.assign(game, data);
      // Ensure new fields for older saves
      // Ensure legacy forgingBuffMult exists.  Convert to new forgingMults if
      // forgingMults is missing.  forgingBuffMult represented Qi boosts only.
      game.forgingBuffMult = (typeof game.forgingBuffMult === 'number' && game.forgingBuffMult > 0) ? game.forgingBuffMult : 1;
      // Initialise forgingMults and forgingQueue if not present.  If this save
      // predates the new forging system, use forgingBuffMult as the Qi multiplier.
      if (!game.forgingMults || typeof game.forgingMults !== 'object') {
        game.forgingMults = { qi: game.forgingBuffMult || 1, herbs: 1, spiritStones: 1, beasts: 1 };
      }
      if (!Array.isArray(game.forgingQueue)) {
        game.forgingQueue = [];
      }
      // Ensure forgingRiskMult exists on older saves.  Defaults to 1 (no risk reduction).
      if (typeof game.forgingRiskMult !== 'number') {
        game.forgingRiskMult = 1;
      }
      game.disciples = Array.isArray(game.disciples) ? game.disciples : [];
      // Attach the module‑scoped disciples array to the saved game state.  This
      // mirrors the behaviour for quests and bounties below and ensures that
      // any mutation to the `disciples` array updates the `game.disciples`
      // property directly.  Without this, saving and loading could break the
      // link between the two variables.
      disciples = game.disciples;
      // Ensure alchemy state exists
      if (!Array.isArray(game.elixirQueue)) game.elixirQueue = [];
      if (!game.elixirInventory) game.elixirInventory = {};
      if (!Array.isArray(game.activeElixirs)) game.activeElixirs = [];
      if (!Array.isArray(game.selectedPartyIdxs)) game.selectedPartyIdxs = [];
      // Attach quests and bounties from the save data.  If the save does not
      // include these properties (old saves), fall back to any existing
      // in‑memory objects or create new empty objects.  Reassign the
      // module‑scoped variables to point at the objects on the game state so
      // that subsequent mutations persist.  This fixes a persistent bug
      // where quest and bounty progress would reset on page reload.
      game.quests = (data.quests && typeof data.quests === 'object') ? data.quests : (game.quests || {});
      quests = game.quests;
      game.bounties = (data.bounties && typeof data.bounties === 'object') ? data.bounties : (game.bounties || {});
      bounties = game.bounties;
      // Ensure Qi per tap multiplier exists on older saves; default to 1 (no multiplier).
      if (typeof game.qiPerTapMult !== 'number' || game.qiPerTapMult <= 0) {
        game.qiPerTapMult = 1;
      }

      // Ensure Qi per second multiplier exists on older saves; default to 1 (no multiplier).
      // Without this check, legacy saves that predate the passive testing toggle could
      // leave qiPerSecMult undefined, causing the checkbox to appear enabled or NaN
      // multipliers to propagate.  Normalising to 1 ensures consistent behaviour.
      if (typeof game.qiPerSecMult !== 'number' || game.qiPerSecMult <= 0) {
        game.qiPerSecMult = 1;
      }

      // Ensure sectTab exists in settings on older saves.  Default to the
      // buildings (management) view.  This setting tracks which tab
      // (management or forging) the player last viewed on the Sect screen.
      if (!game.settings) {
        game.settings = {};
      }
      if (typeof game.settings.sectTab !== 'string') {
        game.settings.sectTab = 'management';
      }
      // Recompute production multipliers before calculating offline gains so that the
      // dantian cap and Qi per second reflect any changes to the formula or
      // upgrades that affect capacity.  This ensures offline gains are
      // correctly clamped by the dynamic cap.
      recalcProduction();
      // calculate offline progress using updated production and cap
      const now = Date.now();
      const elapsed = Math.max(0, (now - (game.lastTick || now)) / 1000);
      // Determine offline cap: base 8 hours plus one hour per Temporal Rift research level.
      const temporalLv = (game.research && game.research.temporalRift) || 0;
      const offlineCapHours = 8 + temporalLv; // additional hours per level
      const offlineSeconds = Math.min(elapsed, offlineCapHours * 3600);
      if (offlineSeconds > 1) {
        // Spirit Well research increases offline gains by +5% per level
        const spiritLv = (game.research && game.research.spiritWell) || 0;
        const offlineMult = 1 + 0.05 * spiritLv;
        // Calculate gains for each resource using final per‑sec rates and offline multiplier
        const qiGain = game.finalQiPerSec * offlineSeconds * offlineMult;
        const herbGain = (game.finalHerbPerSec || 0) * offlineSeconds * offlineMult;
        const stoneGain = (game.finalSpiritStonePerSec || 0) * offlineSeconds * offlineMult;
        const beastGain = (game.finalBeastPerSec || 0) * offlineSeconds * offlineMult;
        const jadeGain = (game.finalJadePerSec || 0) * offlineSeconds * offlineMult;
        // Apply gains; clamp Qi to dantian capacity
        game.qi = Math.min(game.qi + qiGain, game.dantianCap);
        game.herbs = (game.herbs || 0) + herbGain;
        game.spiritStones = (game.spiritStones || 0) + stoneGain;
        game.beasts = (game.beasts || 0) + beastGain;
        game.jade = (game.jade || 0) + jadeGain;
        // Afterglow buff: +20% Qi/s for 5 minutes
        game.afterglowExpires = now + 5 * 60 * 1000;
        // Compose a brief summary message.  Show only the resources that gained a meaningful amount.
        const gains = [];
        if (qiGain > 0) gains.push(`${formatNumber(qiGain)} Qi`);
        if (herbGain > 0) gains.push(`${formatNumber(herbGain)} herbs`);
        if (stoneGain > 0) gains.push(`${formatNumber(stoneGain)} Spirit Stones`);
        if (beastGain > 0) gains.push(`${formatNumber(beastGain)} Beast Energy`);
        if (jadeGain > 0) gains.push(`${formatNumber(jadeGain)} jade`);
        const msg = gains.length ? `Offline gains: ${gains.join(', ')}.` : 'Welcome back!';
        showToast(msg);
      }
      game.lastTick = now;
      // ensure new fields exist
      game.achCollapsed = game.achCollapsed || false;
      game.loreCollapsed = game.loreCollapsed || false;
      game.questTimestamp = game.questTimestamp || 0;
      game.expeditionPity = game.expeditionPity || { herb: 0, stone: 0, beast: 0, beastLair: 0 };
      game.buildings = game.buildings || {};
      game.ascensionPoints = game.ascensionPoints || 0;
      game.ascensionPerks = game.ascensionPerks || {};
      game.bountyTimestamp = game.bountyTimestamp || 0;
      game.bounties = game.bounties || {};
      // ensure collapse state fields exist for cultivation sections
      game.skillsCollapsed = game.skillsCollapsed || false;
      game.researchCollapsed = game.researchCollapsed || false;
      // ensure story reward multipliers exist.  These default to 1 if undefined
      game.forgeCostMult = game.forgeCostMult || 1;
      game.expeditionTimeMult = game.expeditionTimeMult || 1;
      game.discipleMult = game.discipleMult || 1;
      game.ascensionRewardMult = game.ascensionRewardMult || 1;
      // tutorial state removed; no tutorial initialisation necessary
      // ensure relic collection exists
      if (!game.relics) {
        game.relics = {};
      }
      // Ensure dantian multiplier exists for new Qi cap calculations.
      if (typeof game.dantianMult === 'undefined') {
        // Approximate a multiplier based on existing cap.  If the saved
        // dantianCap differs from the default, estimate the multiplier by
        // comparing to the base capacity at the current layer.  Otherwise,
        // initialize to 1.  This prevents sudden shrinkage of the cap on load.
        // When estimating a saved game's dantian multiplier, use the new 10× base cap
        // (previously 50× or 100×).  This keeps existing dantian capacities consistent
        // with the reduced Qi cap.
        const estimatedBase = getLayerCost() * 10;
        if (game.dantianCap && estimatedBase > 0) {
          game.dantianMult = game.dantianCap / estimatedBase;
        } else {
          game.dantianMult = 1;
        }
      }
      // Convert legacy activeExpedition to the new activeExpeditions format
      if (!game.activeExpeditions) {
        game.activeExpeditions = {};
      }
      if (game.activeExpedition) {
        try {
          // Ensure we have a type on the legacy expedition; use its id if present
          const legacy = game.activeExpedition;
          if (legacy.type) {
            game.activeExpeditions[legacy.type] = legacy;
          }
        } catch (e) {
          // ignore any malformed legacy expedition
        }
        game.activeExpedition = null;
      }
      // ensure settings exist
      if (!data.settings) {
        // Initialise settings with all defaults including new backgroundIndex
        game.settings = { colorBlind: false, largeFont: false, reduceMotion: false, theme: 'dark', backgroundIndex: 0, hideLocked: true, bgDimmer: 0 };
      } else {
        // merge saved settings with defaults to ensure new fields are present
        game.settings = Object.assign({ colorBlind: false, largeFont: false, reduceMotion: false, theme: 'dark', backgroundIndex: 0, hideLocked: true, bgDimmer: 0 }, data.settings);
      }

      // Ensure new feature tracking objects exist on older saves.
      if (!game.featuresSeen || typeof game.featuresSeen !== 'object') {
        game.featuresSeen = {};
      }
      if (!game.newFeatures || typeof game.newFeatures !== 'object') {
        game.newFeatures = {};
      }
      if (!game.expandedExpeditions || typeof game.expandedExpeditions !== 'object') {
        game.expandedExpeditions = {};
      }
      // ensure story state exists and has a choices object.  This allows
      // backwards compatibility with older saves that did not include the
      // story property.
      if (!game.story) {
        game.story = { choices: {} };
      } else if (!game.story.choices) {
        game.story.choices = {};
      }
    }
  } catch (e) {
    console.warn('Failed to load save:', e);
  }
}

// Save game to localStorage
function saveGame() {
  // update last save timestamp for display
  game.lastSaveTime = Date.now();
  localStorage.setItem('cultivationGame', JSON.stringify(game));
  // update settings icon tooltip if it exists
  const settingsIcon = document.getElementById('settings-icon');
  if (settingsIcon) {
    const date = new Date(game.lastSaveTime);
    settingsIcon.title = 'Last saved: ' + date.toLocaleTimeString();
  }
}

// Calculate total cost for n levels using geometric series
function getUpgradeTotalCost(def, currentLevel, n) {
  const r = def.costMult;
  const a = def.baseCost * Math.pow(r, currentLevel);
  if (r === 1) {
    return a * n;
  }
  return a * (Math.pow(r, n) - 1) / (r - 1);
}

// Purchase an upgrade
function buyUpgrade(id, amount) {
  const def = upgradeDefs.find(u => u.id === id);
  const level = game.upgrades[id] || 0;
  // Respect maximum levels for certain upgrades.  If a maxLevel is defined and
  // the player has already reached or exceeded it, prevent further purchases.
  if (typeof def.maxLevel === 'number') {
    const max = def.maxLevel;
    if (level >= max) {
      showToast('Max level reached');
      return;
    }
    // Adjust purchase amount so that it does not exceed the maximum level
    if (level + amount > max) {
      amount = max - level;
    }
  }
  if (def.unlockStage > game.stage) {
    showToast(`Unlocks at ${getRealmName(def.unlockStage)}`);
    return;
  }
  // compute total cost using geometric series
  let totalCost = getUpgradeTotalCost(def, level, amount);
  // apply discount from Upgrade Efficiency perk and Origin Talisman upgrade
  const effLv = game.ascensionPerks.upgradeEfficiency || 0;
  const talismanLv = game.upgrades.originTalisman || 0;
  let effFactor = 1 - 0.02 * effLv - 0.02 * talismanLv;
  if (effFactor < 0.3) effFactor = 0.3;
  totalCost *= effFactor;
  if (game.qi < totalCost) {
    showToast('Not enough Qi');
    return;
  }
  game.qi -= totalCost;
  game.upgrades[id] = level + amount;
  // reapply effects: reset multipliers and recalc
  recalcProduction();
  updateUpgradeUI();
  updateStatsUI();
  // Tutorial: after purchasing your first upgrade, advance to the next step
  if (game.tutorial && game.tutorial.active && game.tutorial.step === 1) {
    advanceTutorial();
  }
  saveGame();
}

// Purchase a skill
function buySkill(id) {
  const def = skillDefs.find(s => s.id === id);
  const level = game[`${id}Level`] || 0;
  // apply cost discounts from Dao Comprehension and Jade Research
  let costFactor = 1;
  const daoLv = game.upgrades.daoComprehension || 0;
  const jadeLv = game.research.jadeResearch || 0;
  costFactor -= 0.05 * daoLv;
  costFactor -= 0.02 * jadeLv;
  if (costFactor < 0.2) costFactor = 0.2;
  const cost = def.baseCost * Math.pow(def.costMult, level) * costFactor;
  const currency = def.currency || 'spiritStones';
  if (game[currency] < cost) {
    showToast('Not enough currency');
    return;
  }
  game[currency] -= cost;
  game[`${id}Level`] = level + 1;
  def.effect(1);
  recalcProduction();
  updateSkillUI();
  updateStatsUI();
  saveGame();
}

// Purchase research
function buyResearch(id) {
  const def = researchDefs.find(r => r.id === id);
  const level = game.research[id] || 0;
  if (def.unlockStage > game.stage) {
    showToast(`Unlocks at ${getRealmName(def.unlockStage)}`);
    return;
  }
  if (def.prereq) {
    const cur = game.research[def.prereq.id] || 0;
    if (cur < def.prereq.level) {
      showToast(`Requires ${def.prereq.id} Lv${def.prereq.level}`);
      return;
    }
  }
  // apply cost discount from Daoist Insights
  let researchFactor = 1;
  const insightsLv = game.upgrades.daoistInsights || 0;
  researchFactor -= 0.03 * insightsLv;
  if (researchFactor < 0.1) researchFactor = 0.1;
  const cost = def.baseCost * Math.pow(def.costMult, level) * researchFactor;
  if (game.spiritStones < cost) {
    showToast('Not enough Spirit Stones');
    return;
  }
  game.spiritStones -= cost;
  game.research[id] = level + 1;
  def.effect(1);
  recalcProduction();
  updateResearchUI();
  updateStatsUI();
  saveGame();
}

// Recalculate production multipliers from upgrades and research
function recalcProduction() {
  // reset base values
  // Start with a small passive Qi trickle before applying upgrades.  This
  // baseline helps early progress when no upgrades are purchased yet.
  game.qiPerSec = 0.05;
  game.qiPerTap = 1;
  game.multQi = 1;
  game.multHerbs = 1;
  game.multSpiritStones = 1;
  game.multBeasts = 1;
  // apply upgrade effects
  for (const def of upgradeDefs) {

    const level = game.upgrades[def.id] || 0;
    if (level > 0) {
      def.effect(level);
    }
  }
  // apply research effects
  for (const def of researchDefs) {
    const level = game.research[def.id] || 0;
    if (level > 0) {
      def.effect(level);
    }
  }
  // apply skills
  for (const def of skillDefs) {
    const level = game[`${def.id}Level`] || 0;
    if (level > 0 && def.effect) {
      // The effect function uses level increments; multiply increments to be safe
      def.effect(level);
    }
  }
  // final multipliers
  // apply synergy between body cultivation and swordplay
  const bodyLvl = game['bodyCultivationLevel'] || 0;
  const swordLvl = game['swordplayLevel'] || 0;
  let synergyMult = 1;
  if (bodyLvl > 0 && swordLvl > 0) {
    synergyMult = 1.05;
  }
  // apply ascension perks multipliers
  const qiMasteryLv = game.ascensionPerks.qiMastery || 0;
  const resourceProfLv = game.ascensionPerks.resourceProficiency || 0;

  // contributions from disciples (named classes)
  let discipleQi = 0;
  let discipleHerb = 0;
  let discipleStone = 0;
  let discipleBeast = 0;
  disciples.forEach(d => {
    const cls = discipleClasses.find(c => c.id === d.classId);
    if (cls) {
      // Base contributions
      let qi = cls.qi * (d.level || 1);
      let herb = (cls.herbs || 0) * (d.level || 1);
      let stone = (cls.spiritStones || 0) * (d.level || 1);
      let beast = (cls.beasts || 0) * (d.level || 1);
      // Apply trait modifiers to this disciple’s own output
      if (d.traits && d.traits.includes('diligent')) {
        const mult = 1 + 0.05 * (d.level || 1);
        qi *= mult;
        herb *= mult;
        stone *= mult;
        beast *= mult;
      }
      // Accumulate totals
      discipleQi += qi;
      discipleHerb += herb;
      discipleStone += stone;
      discipleBeast += beast;
    }
  });
  // Apply leadership and sect research multipliers to disciple Qi output
  const leadershipLv = game['sectLeadershipLevel'] || 0;
  const sectResLv = game.research['sectResearch'] || 0;
  const discipleMult = (1 + 0.5 * leadershipLv) * (1 + 0.01 * sectResLv);
  // Apply any global disciple multiplier from story rewards (e.g. tribulation insights)
  const globalDiscMult = (typeof game.discipleMult !== 'undefined' ? game.discipleMult : 1);
  discipleQi *= discipleMult * globalDiscMult;
  discipleHerb *= globalDiscMult;
  discipleStone *= globalDiscMult;
  discipleBeast *= globalDiscMult;
  // add disciple contributions to base qi per second before multipliers
  game.qiPerSec += discipleQi;
  // compute base resource production from buildings and disciples
  let baseHerb = 0, baseStone = 0, baseBeast = 0, baseJade = 0;
  baseHerb += (game.buildings.herbGarden || 0) * 1;
  baseStone += (game.buildings.spiritMine || 0) * 1;
  baseBeast += (game.buildings.beastPen || 0) * 0.5;
  baseJade += (game.buildings.jadeTreasury || 0) * 0.1;
  // add disciples resource contributions
  baseHerb += discipleHerb;
  baseStone += discipleStone;
  baseBeast += discipleBeast;
  // final multipliers
  // Apply forging bonuses per resource type.  legacy forgingBuffMult is replaced by
  // forgingMults.qi; default to 1 when undefined.
  const forgeQiMult = (game.forgingMults && typeof game.forgingMults.qi === 'number') ? game.forgingMults.qi : 1;
  game.finalQiPerSec = game.qiPerSec * game.multQi * forgeQiMult * game.layerMult * synergyMult * (1 + 0.02 * qiMasteryLv);
  // Apply the passive Qi per second multiplier for testing.  When the
  // multiplier is >1, it dramatically increases the final Qi/s.  Do not
  // mutate qiPerSec itself to avoid affecting other calculations.
  const psMult = (typeof game.qiPerSecMult === 'number' && game.qiPerSecMult > 0) ? game.qiPerSecMult : 1;
  game.finalQiPerSec *= psMult;
  const herbUp = (game.upgrades.pillFurnace || 0);
  const stoneUp = (game.upgrades.spiritForge || 0);
  const beastUp = (game.upgrades.beastDen || 0);
  // synergies between buildings and upgrades
  const herbSynergy = herbUp * 0.05; // each Pill Furnace level adds 0.05 herbs/sec
  const stoneSynergy = stoneUp * 0.1; // each Spirit Forge level adds 0.1 spiritStones/sec
  const beastSynergyMult = 1 + 0.05 * beastUp; // Beast Den levels multiply beast output by 5% each
  // Jade synergy from Jade Research (reseach) increases base jade per sec by 0.05 per level
  const jadeSynergy = (game.research.jadeResearch || 0) * 0.05;
  const forgeHerbMult = (game.forgingMults && typeof game.forgingMults.herbs === 'number') ? game.forgingMults.herbs : 1;
  const forgeStoneMult = (game.forgingMults && typeof game.forgingMults.spiritStones === 'number') ? game.forgingMults.spiritStones : 1;
  const forgeBeastMult = (game.forgingMults && typeof game.forgingMults.beasts === 'number') ? game.forgingMults.beasts : 1;
  game.finalHerbPerSec = (baseHerb + herbUp + herbSynergy) * game.multHerbs * forgeHerbMult * (1 + 0.02 * resourceProfLv);
  game.finalSpiritStonePerSec = (baseStone + stoneUp + stoneSynergy) * game.multSpiritStones * forgeStoneMult * (1 + 0.02 * resourceProfLv);
  game.finalBeastPerSec = (baseBeast + beastUp) * beastSynergyMult * game.multBeasts * forgeBeastMult * (1 + 0.02 * resourceProfLv);
  // Jade production with synergy: apply jade multiplier and ascension perk
  game.finalJadePerSec = (baseJade + jadeSynergy) * game.multJade * (1 + 0.02 * resourceProfLv);

  // Recompute Qi capacity (dantian).  Base capacity scales with the cost of the
  // next breakthrough.  We take the cost returned by getLayerCost() and
  // multiply it by a factor (currently 100) to provide a reasonable buffer
  // above the breakthrough requirement.  This base capacity is then
  // multiplied by the dantian multiplier accumulated from upgrades like
  // Dantian Expansion and Nebula Elixir.  This ensures capacity grows with
  // both realm/layer progression and relevant upgrades.
  // Reduce Qi capacity further: base capacity scales with the cost of the next breakthrough
  // multiplied by 10 (down from 50).  This results in a dantian that fills more quickly.
  const baseCap = getBaseLayerCostNoDiscount() * 10;
  game.dantianCap = baseCap * (game.dantianMult || 1);
  // Clamp the maximum Qi capacity to twice the cost of the final layer of the final realm.
  // The final realm is the last entry in the realms array (index realms.length‑1).  The
  // Qi requirement for the final layer of that realm is 100 × 2^(8 + 9 × (realms.length‑1)).
  // Doubling this cost sets a hard upper limit on dantian capacity.  This ensures
  // capacity cannot exceed two times the final breakthrough requirement.
  const finalExponent = 8 + 9 * (realms.length - 1);
  const finalLayerCost = 100 * Math.pow(2, finalExponent);
  const maxCap = finalLayerCost * 2;
  if (game.dantianCap > maxCap) {
    game.dantianCap = maxCap;
  }
}

// Update stats display
function updateStatsUI() {
  // Build stats object.  We adjust Qi/s and other resource lines to include a
  // percentage boost indicator when active buffs (elixirs, afterglow) are in effect.
  const buffs = getActiveElixirBuffs();
  // Compute effective Qi/s with all multipliers
  let qiMult = buffs.qiMult || 1;
  if (game.afterglowExpires && Date.now() < game.afterglowExpires) {
    qiMult *= 1.20;
  }
  const qiPerSec = game.finalQiPerSec * qiMult;
  const qiBonus = qiMult > 1 ? ` (+${((qiMult - 1) * 100).toFixed(0)}%)` : '';
  // Herbs
  const herbMult = buffs.herbsMult || 1;
  const herbPerSec = game.finalHerbPerSec * herbMult;
  const herbBonus = herbMult > 1 ? ` (+${((herbMult - 1) * 100).toFixed(0)}%)` : '';
  // Spirit Stones
  const spiritStonesMult = buffs.spiritStonesMult || 1;
  const spiritStonePerSec = game.finalSpiritStonePerSec * spiritStonesMult;
  const spiritStoneBonus = spiritStonesMult > 1 ? ` (+${((spiritStonesMult - 1) * 100).toFixed(0)}%)` : '';
  // Beasts
  const beastMult = buffs.beastsMult || 1;
  const beastPerSec = game.finalBeastPerSec * beastMult;
  const beastBonus = beastMult > 1 ? ` (+${((beastMult - 1) * 100).toFixed(0)}%)` : '';
  // Jade
  const jadeMult = buffs.jadeMult || 1;
  const jadePerSec = (game.finalJadePerSec || 0) * jadeMult;
  const jadeBonus = jadeMult > 1 ? ` (+${((jadeMult - 1) * 100).toFixed(0)}%)` : '';
  // Construct a single entry for Spirit Stones that includes both the current total and per-second gain.
  const spiritStonesTotal = formatNumber(game.spiritStones);
  const spiritStonesRate = spiritStonePerSec > 0 ? ` (+${formatNumber(spiritStonePerSec)}${spiritStoneBonus}/s)` : '';
  // Build the stats object using translated labels.  When the i18n helper is available
  // we fetch a translated string for each stat key; otherwise we fall back to
  // the key itself.  The realm line includes the layer information.
  const tFn = typeof window.t === 'function' ? window.t : (k => k);
  const stats = {};
  stats[tFn('stat.realm')] = `${getRealmName(game.stage)} (Layer ${game.subLayer + 1}/9)`;
  stats[tFn('stat.qi')] = formatNumber(game.qi);
  stats[tFn('stat.qiPerSec')] = `${formatNumber(qiPerSec)}${qiBonus}`;
  stats[tFn('stat.qiPerTap')] = formatNumber(game.qiPerTap * (game.qiPerTapMult && game.qiPerTapMult > 0 ? game.qiPerTapMult : 1));
  stats[tFn('stat.activeElixirs')] = (game.activeElixirs ? game.activeElixirs.filter(e => e.expiresAt > Date.now()).length : 0);
  stats[tFn('stat.spiritStones')] = `${spiritStonesTotal}${spiritStonesRate}`;
  stats[tFn('stat.herbs')] = `${formatNumber(game.herbs)}${herbBonus}`;
  stats[tFn('stat.beastEnergy')] = `${formatNumber(game.beasts)}${beastBonus}`;
  stats[tFn('stat.jade')] = `${formatNumber(game.jade)}${jadeBonus}`;
  // Update Qi progress bar and text
  const progBar = document.getElementById('qi-progress-bar');
  const progText = document.getElementById('qi-progress-text');
  if (progBar && progText) {
    const percent = Math.min(game.qi / game.dantianCap * 100, 100);
    progBar.style.width = percent.toFixed(2) + '%';
    // Build progress text without ETA (ETA removed per user feedback)
    // Use translated Qi label in the progress text if available
    const qiLabel = tFn('stat.qi');
    progText.textContent = `${formatNumber(game.qi)} / ${formatNumber(game.dantianCap)} ${qiLabel} (${percent.toFixed(1)}%)`;
  }

  
  // === Static two-row stats banner (no marquee) ===
  try {
    const host = document.getElementById('stats-banner-text');
    if (host) {
      // Make the stats region keyboard-scrollable and labeled
      try { host.tabIndex = 0; host.setAttribute('role','region'); host.setAttribute('aria-label','Player stats (scroll horizontally)'); } catch(e) {}

      const entries = Object.keys(stats).map(k => ({ label: k, value: String(stats[k]) }));
      host.textContent = '';
      entries.forEach(({label, value}) => {
        const cell = document.createElement('span');
        cell.className = 'stats-banner__cell';
        const lab = document.createElement('span');
        lab.className = 'label';
        lab.textContent = label + ':';
        const val = document.createElement('span');
        val.className = 'value';
        val.textContent = ' ' + value;
        cell.appendChild(lab);
        cell.appendChild(val);
        host.appendChild(cell);
      });
    }
  } catch (e) { /* cosmetic only */ }

  // Expose the stats banner height as a CSS variable.  When the stats banner
  // grows (e.g. when additional rows appear or fonts are enlarged), we update
  // --stats-height so the content below the banner is pushed down and not
  // overlapped.  This call is cheap relative to the game tick and avoids
  // layout thrashing by only reading the bounding box once per stats update.
  try {
    const banner = document.querySelector('.stats-banner');
    if (banner) {
      const h = Math.ceil(banner.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--stats-height', h + 'px');
    }
  } catch (e) {
    // silently ignore errors; missing banner is non-fatal
  }
}

// Build upgrade UI
function updateUpgradeUI() {
  const listElem = document.getElementById('upgrade-list');
  listElem.innerHTML = '';
  // Read the active multiplier selection from the upgrade multiplier UI.  This value
  // can be a number (e.g. "1", "2", "5", "10") or the string "max".  We
  // preserve the original string here to handle the "max" option separately
  // for each upgrade.  Converting it to a number up front would yield NaN
  // for "max" and break cost calculations.
  const multAttr = document.querySelector('#upgrade-multiplier button.active')?.dataset.mult || '1';
  // Locked upgrades are hidden by default.  The hideLocked setting is ignored.
  for (const def of upgradeDefs) {

    // Skip upgrades that are more than one realm above the current stage.  Only
    // display upgrades for the current realm and the next upcoming realm to
    // preserve a sense of discovery as players progress.
    if (def.unlockStage > game.stage + 1) {
      continue;
    }
    // Skip entries that unlock in later realms.  Locked upgrades remain hidden until you reach the required realm.
    if (def.unlockStage > game.stage) {
      continue;
    }
    const entry = document.createElement('div');
    entry.className = 'entry';
    const level = game.upgrades[def.id] || 0;
    // Determine the purchase amount.  If the selected multiplier is the
    // literal string "max", compute the maximum number of levels affordable
    // given the player's current Qi, discounts, and any defined maxLevel for
    // this upgrade.  Otherwise parse the multiplier as an integer.  Invalid
    // values fall back to 1.
    let amount;
    if (multAttr === 'max') {
      // Calculate discounts that reduce upgrade costs.  These mirror the logic
      // in buyUpgrade() so that the displayed cost matches what will be
      // deducted when purchasing.
      const effLv = game.ascensionPerks.upgradeEfficiency || 0;
      const talismanLv = game.upgrades.originTalisman || 0;
      let effFactor = 1 - 0.02 * effLv - 0.02 * talismanLv;
      if (effFactor < 0.3) effFactor = 0.3;
      // Determine the maximum number of levels we can buy without exceeding
      // any defined maxLevel for this upgrade.  Infinity when no limit.
      const maxRemaining = (typeof def.maxLevel === 'number') ? (def.maxLevel - level) : Infinity;
      // If already at or above the max level, no additional purchases are
      // possible.
      if (maxRemaining <= 0) {
        amount = 0;
      } else {
        // Use a binary search to find the largest n (between 1 and
        // maxRemaining) such that the total discounted cost does not
        // exceed the player's current Qi.  We first find an upper bound
        // doubling until the cost exceeds available Qi or hits the limit.
        let lo = 1;
        let hi = 1;
        // Find an initial hi bound.  Double hi until the cost exceeds Qi
        // or hi reaches maxRemaining.  Stop if hi becomes too large.
        while (hi < maxRemaining) {
          const testCost = getUpgradeTotalCost(def, level, hi) * effFactor;
          if (testCost > game.qi) break;
          lo = hi;
          hi *= 2;
        }
        // Clamp hi to maxRemaining to avoid overshooting the defined maxLevel.
        if (hi > maxRemaining) {
          hi = maxRemaining;
        }
        // Perform binary search between lo and hi to find the maximum
        // affordable number of levels.  Note: lo represents a known
        // affordable value, hi may or may not be affordable.
        let best = 0;
        let left = 1;
        let right = hi;
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const costMid = getUpgradeTotalCost(def, level, mid) * effFactor;
          if (costMid <= game.qi) {
            best = mid;
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }
        amount = best;
      }
    } else {
      const parsed = parseInt(multAttr, 10);
      amount = isNaN(parsed) || parsed <= 0 ? 1 : parsed;
    }
    // Calculate the total cost for the selected amount without applying discounts.
    let cost = getUpgradeTotalCost(def, level, amount);
    // Apply the same discount used in buyUpgrade.  This ensures the cost shown
    // in the UI matches the cost paid when buying.
    if (amount > 0) {
      const effLv = game.ascensionPerks.upgradeEfficiency || 0;
      const talismanLv = game.upgrades.originTalisman || 0;
      let effFactor = 1 - 0.02 * effLv - 0.02 * talismanLv;
      if (effFactor < 0.3) effFactor = 0.3;
      cost *= effFactor;
    }
    const locked = def.unlockStage > game.stage;
    // Resolve the translated name via the i18n helper if available.  When
    // translation is unavailable fallback to the original name defined on
    // the upgrade definition.  This ensures that UI reflects the current
    // language for upgrade names.
    let displayName;
    try {
      if (typeof window.t === 'function') {
        const key = 'upgrade.' + def.id + '.name';
        const translated = window.t(key);
        displayName = (translated && translated !== key) ? translated : def.name;
      } else {
        displayName = def.name;
      }
    } catch (e) {
      displayName = def.name;
    }
    if (locked) {
      // Build the locked entry: name and realm requirement.  We keep
      // the "Unlocks at" phrase in English as a secondary hint; realm
      // names themselves will be translated via getRealmName().
      entry.innerHTML = `<div class="entry-icon"><img src="assets/icons/${def.id}.svg" alt="${displayName}"/></div><div><strong>${displayName}</strong><br><small>Unlocks at ${getRealmName(def.unlockStage)}</small></div>`;
      const btn = document.createElement('button');
      // Translate the Locked label
      try {
        btn.textContent = (typeof window.t === 'function') ? window.t('locked') : 'Locked';
      } catch (e) {
        btn.textContent = 'Locked';
      }
      btn.disabled = true;
      entry.appendChild(btn);
      // When locked, no info icon is needed for upgrades. The description already explains the unlock realm.
    } else {
      // Show full details when unlocked
    // Translate upgrade description if available.  We look up a key of the form
    // "upgrade.{id}.desc" and fall back to the original English description
    // when no translation is defined.  This allows upgrade descriptions to
    // appear in the player’s chosen language.
    let upgradeDesc;
    try {
      if (typeof window.t === 'function') {
        const dKey = 'upgrade.' + def.id + '.desc';
        const translated = window.t(dKey);
        upgradeDesc = (translated && translated !== dKey) ? translated : def.desc;
      } else {
        upgradeDesc = def.desc;
      }
    } catch (e) {
      upgradeDesc = def.desc;
    }
    entry.innerHTML = `<div class="entry-icon"><img src="assets/icons/${def.id}.svg" alt="${displayName}"/></div><div><strong>${displayName}</strong> (Lv ${level})<br><small>${upgradeDesc}</small></div>`;
      const btn = document.createElement('button');
      // Disable the button if no levels can be purchased or the cost exceeds current Qi
      const affordable = (amount > 0) && (cost <= game.qi);
      btn.disabled = !affordable;
      // Use a fallback display amount of 1 when amount is 0 to avoid showing
      // "×0" on the button.  Cost is formatted using the helper.
      const displayAmount = amount > 0 ? amount : 1;
      const displayCost = formatNumber(cost);
      // Build the button label with translation for the "Buy" verb.  We
      // interpolate the amount and cost manually to avoid placing numbers
      // inside the translation file.  Qi remains untranslated as it is a
      // unique resource name in the game.
      let buyLabel;
      try {
        buyLabel = (typeof window.t === 'function') ? window.t('btn.buy') : 'Buy';
      } catch (e) {
        buyLabel = 'Buy';
      }
      btn.textContent = `${buyLabel} ×${displayAmount} (${displayCost} Qi)`;
      btn.addEventListener('click', () => buyUpgrade(def.id, amount));
      entry.appendChild(btn);
      // Upgrades have full descriptions displayed, so we omit additional info icons.
    }
    listElem.appendChild(entry);
  }
}

// Build skills UI
function updateSkillUI() {
  const listElem = document.getElementById('skill-list');
  listElem.innerHTML = '';
  for (const def of skillDefs) {
    const level = game[`${def.id}Level`] || 0;
    const cost = def.baseCost * Math.pow(def.costMult, level);
    const entry = document.createElement('div');
    entry.className = 'entry';
    // Translate skill name if available
    let skillName;
    try {
      if (typeof window.t === 'function') {
        const key = 'skill.' + def.id + '.name';
        const translated = window.t(key);
        skillName = (translated && translated !== key) ? translated : def.name;
      } else {
        skillName = def.name;
      }
    } catch (e) {
      skillName = def.name;
    }
    // Translate skill description.  Keys follow the pattern "skill.{id}.desc".
    let skillDesc;
    try {
      if (typeof window.t === 'function') {
        const dKey = 'skill.' + def.id + '.desc';
        const translated = window.t(dKey);
        skillDesc = (translated && translated !== dKey) ? translated : def.desc;
      } else {
        skillDesc = def.desc;
      }
    } catch (e) {
      skillDesc = def.desc;
    }
    entry.innerHTML = `<div class="entry-icon"><img src="assets/icons/${def.id}.svg" alt="${skillName}"/></div><div><strong>${skillName}</strong> (Lv ${level})<br><small>${skillDesc}</small></div>`;
    const btn = document.createElement('button');
    // Translate the Buy verb for skills and insert cost.  SS stands for Spirit Stones and is left untranslated.
    let buyVerb;
    try {
      buyVerb = (typeof window.t === 'function') ? window.t('btn.buy') : 'Buy';
    } catch (e) {
      buyVerb = 'Buy';
    }
    btn.textContent = `${buyVerb} (${formatNumber(cost)} ${def.currency || 'SS'})`;
    btn.addEventListener('click', () => buySkill(def.id));
    entry.appendChild(btn);
    // Tooltip summarising technique effect
    entry.title = skillDesc;
    // Add mobile-friendly info icon to display technique description
    const infoIcon = document.createElement('span');
    infoIcon.className = 'info-icon';
    infoIcon.textContent = 'ℹ️';
    infoIcon.title = skillDesc;
    infoIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast(skillDesc);
    });
    // Append the icon to the text container (2nd child)
    entry.querySelector('div:nth-child(2)').appendChild(infoIcon);
    listElem.appendChild(entry);
  }
}

// Build research UI
function updateResearchUI() {
  const listElem = document.getElementById('research-list');
  listElem.innerHTML = '';
  // Locked research projects are hidden by default.  The hideLocked setting is ignored.
  for (const def of researchDefs) {
    const level = game.research[def.id] || 0;
    const cost = def.baseCost * Math.pow(def.costMult, level);
    const locked = def.unlockStage > game.stage;
    const prereq = def.prereq;
    let prereqMsg = '';
    if (prereq) {
      const cur = game.research[prereq.id] || 0;
      if (cur < prereq.level) {
        prereqMsg = `Requires ${prereq.id} Lv${prereq.level}`;
      }
    }
    // Skip entries that are locked by realm or missing prerequisites.  Hidden until unlocked.
    if (locked || prereqMsg) {
      continue;
    }
    const entry = document.createElement('div');
    entry.className = 'entry';
    // Hide description when locked or prerequisites not met to simulate lack of knowledge
    // Determine the research description.  When the research is locked or prerequisites
    // are unmet we hide the description by replacing it with question marks.  Otherwise
    // we attempt to translate the description using a key of the form
    // "research.{id}.desc", falling back to the original English text if no
    // translation is defined.
    let descText;
    if (locked || prereqMsg) {
      descText = '???';
    } else {
      try {
        if (typeof window.t === 'function') {
          const dKey = 'research.' + def.id + '.desc';
          const translated = window.t(dKey);
          descText = (translated && translated !== dKey) ? translated : def.desc;
        } else {
          descText = def.desc;
        }
      } catch (e) {
        descText = def.desc;
      }
    }
    // Translate research name if available
    let researchName;
    try {
      if (typeof window.t === 'function') {
        const key = 'research.' + def.id + '.name';
        const translated = window.t(key);
        researchName = (translated && translated !== key) ? translated : def.name;
      } else {
        researchName = def.name;
      }
    } catch (e) {
      researchName = def.name;
    }
    entry.innerHTML = `<div class="entry-icon"><img src="assets/icons/${def.id}.svg" alt="${researchName}"/></div><div><strong>${researchName}</strong> (Lv ${level})<br><small>${descText}</small></div>`;
    const btn = document.createElement('button');
    if (locked) {
      // Translate Locked label
      try {
        btn.textContent = (typeof window.t === 'function') ? window.t('locked') : 'Locked';
      } catch (e) {
        btn.textContent = 'Locked';
      }
      btn.disabled = true;
      // Tooltip for locked research
      entry.title = `Unlocks at ${getRealmName(def.unlockStage)}`;
      // Add info icon to inform mobile users about lock condition
      const infoIcon = document.createElement('span');
      infoIcon.className = 'info-icon';
      infoIcon.textContent = 'ℹ️';
      infoIcon.title = `Unlocks at ${getRealmName(def.unlockStage)}`;
      infoIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        showToast(`Unlocks at ${getRealmName(def.unlockStage)}`);
      });
      entry.querySelector('div:nth-child(2)').appendChild(infoIcon);
    } else if (prereqMsg) {
      // Build prerequisite message with translation for "Requires" and the referenced research name
      let reqPrefix;
      try {
        reqPrefix = (typeof window.t === 'function') ? window.t('requires') : 'Requires';
      } catch (e) {
        reqPrefix = 'Requires';
      }
      // Translate the prerequisite research name
      let prereqName;
      try {
        if (typeof window.t === 'function') {
          const key = 'research.' + prereq.id + '.name';
          const translated = window.t(key);
          prereqName = (translated && translated !== key) ? translated : prereq.id;
        } else {
          prereqName = prereq.id;
        }
      } catch (e) {
        prereqName = prereq.id;
      }
      const prereqLabel = `${reqPrefix} ${prereqName} Lv${prereq.level}`;
      btn.textContent = prereqLabel;
      btn.disabled = true;
      // Tooltip for unmet prerequisite
      entry.title = prereqLabel;
      // Info icon for prerequisite message
      const infoIcon = document.createElement('span');
      infoIcon.className = 'info-icon';
      infoIcon.textContent = 'ℹ️';
      infoIcon.title = prereqLabel;
      infoIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        showToast(prereqLabel);
      });
      entry.querySelector('div:nth-child(2)').appendChild(infoIcon);
    } else {
      // Translate Research verb
      let researchVerb;
      try {
        researchVerb = (typeof window.t === 'function') ? window.t('btn.research') : 'Research';
      } catch (e) {
        researchVerb = 'Research';
      }
      btn.textContent = `${researchVerb} (${formatNumber(cost)} SS)`;
      btn.addEventListener('click', () => buyResearch(def.id));
      // Tooltip summarising research effect.  Use the translated description.
      entry.title = descText;
      // Info icon for research description
      const infoIcon = document.createElement('span');
      infoIcon.className = 'info-icon';
      infoIcon.textContent = 'ℹ️';
      infoIcon.title = descText;
      infoIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        showToast(descText);
      });
      entry.querySelector('div:nth-child(2)').appendChild(infoIcon);
    }
    entry.appendChild(btn);
    listElem.appendChild(entry);
  }
}

// Basic quests (simplified).  These define the starting amount and reward for
// each quest.  Quests dynamically scale as the player completes them: each time
// a quest is completed the amount required for the next completion doubles and
// the reward increases by roughly 50%.  The dynamic state (current amount,
// reward and tier) is stored on the quest object rather than mutating these
// definitions directly.
const questDefs = [
  { id: 'gatherQi', desc: 'Gather Qi', type: 'qi', amount: 100, reward: 10 },
  { id: 'buyUpgrades', desc: 'Buy upgrades', type: 'upgrade', amount: 5, reward: 20 },
  { id: 'reachLayer', desc: 'Reach Layers', type: 'layer', amount: 3, reward: 30 }
];
// Track progress and scaling for quests.  Each quest entry will have
// {progress, amount, rewardVal, tier}.  The tier counts how many times the
// quest has been completed; amount and rewardVal scale from the questDefs
// base amount/reward multiplied by 2^tier and 1.5^tier respectively.
//
// Persist quest progress in the save file by storing the object on the
// global `game` state.  On initial load we attach the in‑memory
// reference to `game.quests` so that modifying `quests` also mutates the
// saved game object.  This change fixes a bug where quest progress
// would reset after a page refresh because the data lived only in a
// module‑scoped variable.  See loadGame() for re‑binding on save load.
let quests = game.quests || (game.quests = {});

// Bounty definitions (weekly tasks)
const bountyDefs = [
  { id: 'gather10000Qi', desc: 'Gather 10K Qi', type: 'qi', amount: 10000, reward: { spiritStones: 100, jade: 5 } },
  { id: 'buy20Upgrades', desc: 'Buy 20 upgrade levels', type: 'upgrade', amount: 20, reward: { spiritStones: 200, jade: 10 } },
  { id: 'reachLayer9', desc: 'Reach Layer 9', type: 'layer', amount: 9, reward: { spiritStones: 300, jade: 15 } }
];
// track bounty progress and claim state
//
// Similar to quests, bounty progress needs to persist across sessions.
// Store the bounties object on the `game` state and assign our local
// reference to point to it.  Without this, the weekly bounty progress
// would be lost when reloading the page.
let bounties = game.bounties || (game.bounties = {});

// Achievements definitions
const achievementDefs = [
  { id: 'firstTap', name: 'First Steps', desc: 'Gather Qi manually for the first time.', condition: () => game.qi >= 1 },
  { id: 'collector', name: 'Qi Adept', desc: 'Accumulate 1K Qi.', condition: () => game.qi >= 1000 },
  { id: 'upgradeBuyer', name: 'Seasoned Cultivator', desc: 'Purchase 10 upgrade levels.', condition: () => Object.values(game.upgrades).reduce((a,b) => a + b, 0) >= 10 },
  { id: 'ascendRealm', name: 'Foundation Layer', desc: 'Reach Foundation Establishment.', condition: () => game.stage >= 1 }
  ,
  // New achievements provide long‑term goals beyond the early game.  These
  // include tracking expedition completions, technique mastery, bounty claims,
  // research progress, forging, sect expansion and story progression.
  { id: 'expeditionMaster', name: 'Expedition Master', desc: 'Complete 50 expeditions.', condition: () => (game.expeditionsCompleted || 0) >= 50 },
  { id: 'techniqueMaster', name: 'Technique Mastery', desc: 'Reach Level 5 in any technique.', condition: () => skillDefs.some(def => (game[`${def.id}Level`] || 0) >= 5) },
  { id: 'bountyHunter', name: 'Bounty Hunter', desc: 'Claim 10 bounty rewards.', condition: () => (game.bountiesClaimed || 0) >= 10 },
  { id: 'researchScholar', name: 'Research Scholar', desc: 'Accumulate 10 research levels.', condition: () => Object.values(game.research).reduce((a,b) => a + b, 0) >= 10 },
  { id: 'artifactCrafter', name: 'Artifact Crafter', desc: 'Forge 10 artifacts.', condition: () => (game.artifactsForged || 0) >= 10 },
  { id: 'sectLeader', name: 'Sect Leader', desc: 'Recruit 5 disciples.', condition: () => disciples.length >= 5 },
  { id: 'storyTeller', name: 'Story Teller', desc: 'Unlock 3 story chapters.', condition: () => Object.keys(game.story.choices || {}).length >= 3 },
  { id: 'perkCollector', name: 'Perk Collector', desc: 'Unlock 5 ascension perks.', condition: () => Object.keys(game.ascensionPerks).reduce((a,k) => a + (game.ascensionPerks[k] > 0 ? 1 : 0), 0) >= 5 }
];

// Lore definitions
const loreDefs = [
  { stage: 0, title: 'Qi Gathering', text: 'At the beginning of your cultivation journey you gather ambient Qi from the environment.' },
  { stage: 1, title: 'Foundation Establishment', text: 'You solidify your base, strengthening body and spirit for more complex techniques.' },
  { stage: 2, title: 'Core Formation', text: 'You forge your inner core, condensing Qi into a rotating sphere of power.' },
  { stage: 3, title: 'Golden Core', text: 'Your core crystallizes into a golden elixir, vastly amplifying your cultivation.' },
  { stage: 4, title: 'Nascent Soul', text: 'Your consciousness manifests as a nascent soul, granting new insights and abilities.' },
  { stage: 5, title: 'Spirit Transformation', text: 'You begin transcending mortality, merging your essence with the Dao.' },
  { stage: 6, title: 'Immortal Ascension', text: 'You break free of worldly bonds and ascend to immortality.' }
  ,{ stage: 7, title: 'Void Refinement', text: 'You refine the void itself, harnessing the emptiness between realms to strengthen your Dao.' }
  ,{ stage: 8, title: 'Celestial Tribulation', text: 'You face tribulations sent by the heavens, tempering your soul and testing your determination.' }
  ,{ stage: 9, title: 'Divine Ascension', text: 'Your cultivation transcends mortality and immortality, touching upon the divine essence of creation.' }
  ,{ stage: 10, title: 'Eternal Godhood', text: 'At the peak of all existence, you become an eternal deity, your name etched into the fabric of reality.' }
];

// Track unlocked achievements and lore
game.achievementsUnlocked = game.achievementsUnlocked || {};
game.loreUnlocked = game.loreUnlocked || [];

// Expeditions definitions
const expeditionDefs = [
  { id: 'herb', name: 'Herb Gathering', baseDuration: 60, reward: { herbs: 50 }, risk: 0 },
  { id: 'stone', name: 'Spirit Stone Expedition', baseDuration: 90, reward: { spiritStones: 50 }, risk: 0 },
  { id: 'beast', name: 'Beast Hunt', baseDuration: 120, reward: { beasts: 20 }, risk: 0 },
  // New expeditions with higher stakes and potential failure.  Deep Cavern yields
  // a large stone haul but has a 20% chance to fail.  Lush Forest grants a
  // bounty of herbs with a smaller 10% failure chance.
  { id: 'deepCavern', name: 'Deep Cavern Expedition', baseDuration: 180, reward: { spiritStones: 200 }, risk: 0.20 },
  { id: 'lushForest', name: 'Lush Forest Excursion', baseDuration: 150, reward: { herbs: 150 }, risk: 0.10 }
  ,
  // A challenging mission to explore ancient ruins for lost treasures.  High
  // risk and long duration but yields a variety of resources upon success.
  { id: 'ancientRuins', name: 'Ancient Ruins Expedition', baseDuration: 240, reward: { herbs: 100, spiritStones: 100, beasts: 50 }, risk: 0.30 },
  { id: 'beastLair', name: 'Beast Lair Raid', baseDuration: 200, reward: { beasts: 60 }, risk: 0.15 },
];

// Sect building definitions
// Each building produces resources passively. Costs are paid in Spirit Stones.
const buildingDefs = [
  {
    id: 'herbGarden',
    name: 'Herb Garden',
    desc: 'Produces 1 herb per second per level.',
    baseCost: 100,
    costMult: 2,
    resource: 'herbs',
    amountPerSec: 1,
    unlockStage: 1 // unlock at Foundation
  },
  {
    id: 'spiritMine',
    name: 'Spirit Mine',
    desc: 'Produces 1 spirit stone per second per level.',
    baseCost: 150,
    costMult: 2.2,
    resource: 'spiritStones',
    amountPerSec: 1,
    unlockStage: 1
  },
  {
    id: 'beastPen',
    name: 'Beast Pen',
    desc: 'Produces 0.5 beast energy per second per level.',
    baseCost: 200,
    costMult: 2.4,
    resource: 'beasts',
    amountPerSec: 0.5,
    unlockStage: 2 // unlock at Core Formation
  },
  {
    id: 'jadeTreasury',
    name: 'Jade Treasury',
    desc: 'Produces 0.1 jade per second per level.',
    baseCost: 500,
    costMult: 2.8,
    resource: 'jade',
    amountPerSec: 0.1,
    unlockStage: 3 // unlock at Golden Core
  }
];

// Ascension perk definitions
// Players spend Ascension Points (AP) earned upon realm ascension to buy perks.
const ascensionPerkDefs = [
  {
    id: 'qiMastery',
    name: 'Qi Mastery',
    desc: 'Increases all Qi/s by 2% per level.',
    baseCost: 1,
    costMult: 2,
    effect: (level) => {
      // handled in recalcProduction via ascensionPerks
    }
  },
  {
    id: 'upgradeEfficiency',
    name: 'Upgrade Efficiency',
    desc: 'Reduces upgrade costs by 2% per level.',
    baseCost: 1,
    costMult: 2.5,
    effect: (level) => {
      // handled during cost computation
    }
  },
  {
    id: 'resourceProficiency',
    name: 'Resource Proficiency',
    desc: 'Increases herb, spirit stone and beast production by 2% per level.',
    baseCost: 1,
    costMult: 2.5,
    effect: (level) => {
      // handled in recalcProduction
    }
  }
  ,
  {
    id: 'forgeMastery',
    name: 'Forge Mastery',
    desc: 'Reduces forging cost and time by 2% per level.',
    baseCost: 2,
    costMult: 2.5,
    effect: (level) => {
      // handled in updateForgingUI
    }
  }
];



function updateQuestUI() {
  const listElem = document.getElementById('quest-list');
  if (!listElem) return;
  listElem.innerHTML = '';

  const now = Date.now();
  // Daily reset
  if (!game.questTimestamp || now - game.questTimestamp > 24 * 3600 * 1000) {
    game.questTimestamp = now;
    game.quests = {};
  }
  // Ensure quests object exists and local alias points to it
  if (!game.quests) game.quests = {};
  quests = game.quests;

  // Ensure quest state for every definition
  questDefs.forEach(def => {
    if (!quests[def.id]) {
      // Auto‑start all quests: they are considered started immediately when created.
      quests[def.id] = {
        started: true,
        progress: 0,
        completed: false,
        tier: 0,
        amount: def.amount,
        rewardVal: def.reward,
        // For layer‑type quests, use the current total breakthroughs as the baseline
        baseCount: def.type === 'layer' ? (game.totalBreakthroughs || 0) : 0
      };
    } else {
      const q = quests[def.id];
      // Ensure quests remain auto‑started.  If a save from an earlier version had
      // started=false, flip it to true so progress is always tracked.
      if (typeof q.started === 'undefined' || q.started === false) q.started = true;
      if (typeof q.completed === 'undefined') q.completed = false;
      if (typeof q.progress !== 'number') q.progress = 0;
      if (typeof q.tier !== 'number') q.tier = 0;
      if (typeof q.amount !== 'number') q.amount = def.amount * Math.pow(2, q.tier || 0);
      if (typeof q.rewardVal !== 'number') q.rewardVal = Math.ceil(def.reward * Math.pow(1.5, q.tier || 0));
      if (typeof q.baseCount !== 'number' || isNaN(q.baseCount)) q.baseCount = def.type === 'layer' ? (game.totalBreakthroughs || 0) : 0;
    }
  });

  // Update progress for each quest independently (no global pause)
  questDefs.forEach(def => {
    const q = quests[def.id];
    if (q.started && !q.completed) {
      if (def.type === 'qi') {
        q.progress = Math.min(game.qi, q.amount);
      } else if (def.type === 'upgrade') {
        const totalLevels = Object.values(game.upgrades || {}).reduce((a,b) => a + b, 0);
        q.progress = Math.min(totalLevels, q.amount);
      } else if (def.type === 'layer') {
        q.progress = Math.min(Math.max(0, (game.totalBreakthroughs || 0) - (q.baseCount || 0)), q.amount);
      }
      if (q.progress >= q.amount) {
        q.completed = true;
        q.progress = q.amount;
      }
    }
  });

  // Build UI
  questDefs.forEach(def => {
    const q = quests[def.id];
    const entry = document.createElement('div');
    entry.className = 'entry';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = def.desc + (q.tier ? ` (Tier ${q.tier + 1})` : '');
    entry.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = `Reward: ${formatNumber(q.rewardVal)} Spirit Stones`;
    entry.appendChild(sub);

    const progress = document.createElement('div');
    progress.className = 'progress';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.width = (q.amount ? (100 * q.progress / q.amount) : 0) + '%';
    progress.appendChild(bar);
    entry.appendChild(progress);

    const status = document.createElement('div');
    status.className = 'status';

    const btn = document.createElement('button');

    // Quests always track progress automatically.  When completed, a claim button
    // becomes available; otherwise we show progress without an interactive button.
    if (q.completed) {
      status.textContent = 'Completed';
      btn.textContent = 'Claim';
      btn.disabled = false;
      btn.addEventListener('click', () => {
        game.spiritStones = (game.spiritStones || 0) + (q.rewardVal || 0);
        if (game.tutorial && game.tutorial.active && game.tutorial.step === 4) {
          advanceTutorial();
        }
        // Advance to next tier and auto‑start it
        q.tier = (q.tier || 0) + 1;
        q.amount = def.amount * Math.pow(2, q.tier);
        q.rewardVal = Math.ceil(def.reward * Math.pow(1.5, q.tier));
        q.progress = 0;
        q.completed = false;
        q.started = true;
        // For layer‑type quests, update the base count to the current breakthroughs
        if (def.type === 'layer') {
          q.baseCount = (game.totalBreakthroughs || 0);
        }
        updateQuestUI();
        updateStatsUI();
        saveGame();
      });
    } else {
      // Display current progress; disable the button since there is nothing to click
      status.textContent = `Progress: ${formatNumber(q.progress)} / ${formatNumber(q.amount)}`;
      btn.textContent = '';
      btn.disabled = true;
      // Remove any default styling for the disabled claim button
      btn.style.visibility = 'hidden';
    }

    entry.appendChild(status);
    entry.appendChild(btn);
    listElem.appendChild(entry);
  });

  // Add a compact row for bulk claim if any are completed
  (function() {
    const count = Object.values(quests).filter(q => q && q.completed).length;
    const container = document.getElementById('quest-list');
    if (!container) return;
    const prev = container.querySelector('.bulk-claim-row');
    if (prev) prev.remove();
    if (count > 0) {
      const row = document.createElement('div');
      row.className = 'entry bulk-claim-row';
      const icon = document.createElement('div');
      icon.className = 'entry-icon';
      icon.innerHTML = '✓';
      const meta = document.createElement('div');
      meta.innerHTML = '<strong>Completed quests</strong><br><small>Ready to claim: ' + count + '</small>';
      const btn = document.createElement('button');
      btn.className = 'status-btn';
      btn.textContent = 'Claim All Completed';
      btn.addEventListener('click', claimAllCompletedQuests);
      row.appendChild(icon);
      row.appendChild(meta);
      row.appendChild(btn);
      container.appendChild(row);
    }
  })();
}



function updateBountyUI() {
  const listElem = document.getElementById('bounty-list');
  if (!listElem) return;
  listElem.innerHTML = '';

  const now = Date.now();
  // Weekly reset (7 days)
  if (!game.bountyTimestamp || now - game.bountyTimestamp > 7 * 24 * 3600 * 1000) {
    game.bountyTimestamp = now;
    game.bounties = {};
  }
  if (!game.bounties) game.bounties = {};
  bounties = game.bounties;

  // Ensure bounty state for every definition
  bountyDefs.forEach(def => {
    if (!bounties[def.id]) {
      // Auto‑start all bounties upon creation
      bounties[def.id] = {
        started: true,
        progress: 0,
        completed: false,
        tier: 0,
        amount: def.amount,
        reward: Object.assign({}, def.reward),
        baseCount: def.type === 'layer' ? (game.totalBreakthroughs || 0) : 0
      };
    } else {
      const b = bounties[def.id];
      if (typeof b.started === 'undefined' || b.started === false) b.started = true;
      if (typeof b.completed === 'undefined') b.completed = false;
      if (typeof b.progress !== 'number') b.progress = 0;
      if (typeof b.tier !== 'number') b.tier = 0;
      if (typeof b.amount !== 'number') b.amount = def.amount * Math.pow(2, b.tier || 0);
      if (!b.reward) b.reward = Object.assign({}, def.reward);
      if (typeof b.baseCount !== 'number' || isNaN(b.baseCount)) b.baseCount = def.type === 'layer' ? (game.totalBreakthroughs || 0) : 0;
    }
  });

  // Update progress for each bounty independently
  bountyDefs.forEach(def => {
    const b = bounties[def.id];
    if (b.started && !b.completed) {
      if (def.type === 'qi') {
        b.progress = Math.min(game.qi, b.amount);
      } else if (def.type === 'upgrade') {
        const totalLevels = Object.values(game.upgrades || {}).reduce((a,b) => a + b, 0);
        b.progress = Math.min(totalLevels, b.amount);
      } else if (def.type === 'layer') {
        b.progress = Math.min(Math.max(0, (game.totalBreakthroughs || 0) - (b.baseCount || 0)), b.amount);
      }
      if (b.progress >= b.amount) {
        b.completed = true;
        b.progress = b.amount;
      }
    }
  });

  // Build UI
  bountyDefs.forEach(def => {
    const b = bounties[def.id];
    const entry = document.createElement('div');
    entry.className = 'entry';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = def.desc + (b.tier ? ` (Tier ${b.tier + 1})` : '');
    entry.appendChild(title);

    const rewardText = `Reward: ${formatNumber(b.reward.spiritStones)} Spirit Stones, ${formatNumber(b.reward.jade)} Jade`;
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = rewardText;
    entry.appendChild(sub);

    const progress = document.createElement('div');
    progress.className = 'progress';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.width = (b.amount ? (100 * b.progress / b.amount) : 0) + '%';
    progress.appendChild(bar);
    entry.appendChild(progress);

    const status = document.createElement('div');
    status.className = 'status';

    const btn = document.createElement('button');

    // Auto‑started bounties: show claim button when completed; otherwise show progress and hide the button
    if (b.completed) {
      status.textContent = 'Completed';
      btn.textContent = 'Claim';
      btn.disabled = false;
      btn.addEventListener('click', () => {
        game.spiritStones = (game.spiritStones || 0) + (b.reward.spiritStones || 0);
        game.jade = (game.jade || 0) + (b.reward.jade || 0);
        // track bounties claimed
        game.bountiesClaimed = (game.bountiesClaimed || 0) + 1;
        // Advance to next tier and auto‑start it
        b.tier = (b.tier || 0) + 1;
        b.amount = def.amount * Math.pow(2, b.tier);
        b.reward = {
          spiritStones: Math.ceil(def.reward.spiritStones * Math.pow(1.5, b.tier)),
          jade: Math.ceil(def.reward.jade * Math.pow(1.5, b.tier))
        };
        b.progress = 0;
        b.completed = false;
        b.started = true;
        // Update baseCount for layer‑type bounties
        if (def.type === 'layer') {
          b.baseCount = (game.totalBreakthroughs || 0);
        }
        updateBountyUI();
        updateStatsUI();
        saveGame();
      });
    } else {
      status.textContent = `Progress: ${formatNumber(b.progress)} / ${formatNumber(b.amount)}`;
      btn.textContent = '';
      btn.disabled = true;
      btn.style.visibility = 'hidden';
    }

    entry.appendChild(status);
    entry.appendChild(btn);
    listElem.appendChild(entry);
  });

  // Add a compact row for bulk claim if any are completed
  (function() {
    const count = Object.values(bounties).filter(b => b && b.completed).length;
    const container = document.getElementById('bounty-list');
    if (!container) return;
    const prev = container.querySelector('.bulk-claim-row');
    if (prev) prev.remove();
    if (count > 0) {
      const row = document.createElement('div');
      row.className = 'entry bulk-claim-row';
      const icon = document.createElement('div');
      icon.className = 'entry-icon';
      icon.innerHTML = '✓';
      const meta = document.createElement('div');
      meta.innerHTML = '<strong>Completed bounties</strong><br><small>Ready to claim: ' + count + '</small>';
      const btn = document.createElement('button');
      btn.className = 'status-btn';
      btn.textContent = 'Claim All Completed';
      btn.addEventListener('click', claimAllCompletedBounties);
      row.appendChild(icon);
      row.appendChild(meta);
      row.appendChild(btn);
      container.appendChild(row);
    }
  })();
}


function claimAllCompletedQuests() {
  if (!game.quests) return;
  let total = 0;
  questDefs.forEach(def => {
    const q = game.quests[def.id];
    if (!q) return;
    if (q.completed) {
      total += (q.rewardVal || 0);
      // advance chain
      q.tier = (q.tier || 0) + 1;
      q.amount = def.amount * Math.pow(2, q.tier);
      q.rewardVal = Math.ceil(def.reward * Math.pow(1.5, q.tier));
      q.progress = 0;
      q.completed = false;
      q.started = false;
    }
  });
  if (total > 0) {
    game.spiritStones = (game.spiritStones || 0) + total;
    // advance tutorial once at most
    if (game.tutorial && game.tutorial.active && game.tutorial.step === 4) {
      advanceTutorial();
    }
    showToast(`Claimed ${formatNumber(total)} Spirit Stones from completed quests.`);
    updateQuestUI();
    updateStatsUI();
    saveGame();
  } else {
    showToast('No completed quests to claim.');
  }
}

// Claim all completed bounties in one click
function claimAllCompletedBounties() {
  if (!game.bounties) return;
  let totalSS = 0, totalJade = 0;
  bountyDefs.forEach(def => {
    const b = game.bounties[def.id];
    if (!b) return;
    if (b.completed) {
      totalSS += (b.reward.spiritStones || 0);
      totalJade += (b.reward.jade || 0);
      // advance chain
      b.tier = (b.tier || 0) + 1;
      b.amount = def.amount * Math.pow(2, b.tier);
      b.reward = {
        spiritStones: Math.ceil(def.reward.spiritStones * Math.pow(1.5, b.tier)),
        jade: Math.ceil(def.reward.jade * Math.pow(1.5, b.tier))
      };
      b.progress = 0;
      b.completed = false;
      b.started = false;
      game.bountiesClaimed = (game.bountiesClaimed || 0) + 1;
    }
  });
  if (totalSS > 0 || totalJade > 0) {
    game.spiritStones = (game.spiritStones || 0) + totalSS;
    game.jade = (game.jade || 0) + totalJade;
    showToast(`Claimed ${formatNumber(totalSS)} Spirit Stones and ${formatNumber(totalJade)} Jade from completed bounties.`);
    updateBountyUI();
    updateStatsUI();
    saveGame();
  } else {
    showToast('No completed bounties to claim.');
  }
}





// Disciples (simplified)
// Disciple list: each disciple will have a name, classId and level
let disciples = game.disciples || (game.disciples = []);

// Avatar images for disciples.  We provide a small set of chibi faces that
// are assigned to each disciple when they are recruited.  The paths are relative
// to the index.html file.  You can add more avatars to
// assets/icons/disciples and include them here to increase variety.
const discipleAvatars = [
  'assets/icons/disciples/avatar1.png',
  'assets/icons/disciples/avatar2.png',
  'assets/icons/disciples/avatar3.png',
  'assets/icons/disciples/avatar4.png',
  'assets/icons/disciples/avatar5.png',
  'assets/icons/disciples/avatar6.png',
  'assets/icons/disciples/avatar7.png',
  'assets/icons/disciples/avatar8.png',
  'assets/icons/disciples/avatar9.png',
  'assets/icons/disciples/avatar10.png',
  'assets/icons/disciples/avatar11.png',
  'assets/icons/disciples/avatar12.png',
  'assets/icons/disciples/avatar13.png',
  'assets/icons/disciples/avatar14.png'
];

// Index used to assign unique avatars.  Each time a disciple is recruited
// this counter increments to ensure a new avatar and unique hue rotation
// combination.  When the base avatar array is exhausted, hue rotation is
// applied to differentiate subsequent recruits.
let nextAvatarIndex = 0;

// Define possible disciple names and classes for enhanced disciple management
const discipleNames = [
  'Li', 'Zhang', 'Wang', 'Chen', 'Zhao', 'Lin', 'Liu', 'Yang', 'Huang', 'Zhou',
  'Xu', 'Sun', 'Deng', 'Gao', 'Feng', 'Guo', 'Cai', 'Pan', 'Qin', 'Rao'
];
const discipleClasses = [
  { id: 'sword', name: 'Sword Cultivator', qi: 2, herbs: 0, spiritStones: 0, beasts: 0 },
  { id: 'alchemist', name: 'Alchemist', qi: 1, herbs: 0.5, spiritStones: 0, beasts: 0 },
  { id: 'stone', name: 'Spirit Stone Cultivator', qi: 1, herbs: 0, spiritStones: 0.5, beasts: 0 },
  { id: 'beastMaster', name: 'Beast Master', qi: 1, herbs: 0, spiritStones: 0, beasts: 0.5 }
];

// Disciple trait definitions.  Each trait provides a passive bonus that applies
// either to the disciple’s own contributions or to other systems.  Traits are
// assigned randomly when recruiting a new disciple.  The effects are applied
// in various parts of the code (e.g. recalcProduction, expedition and forging).
const discipleTraits = [
  {
    id: 'diligent',
    name: 'Diligent',
    // Adds +5% to all resource output contributed by this disciple
    desc: 'Resource output +5% per level'
  },
  {
    id: 'loyal',
    name: 'Loyal',
    // Reduces expedition duration by 5% per level when this disciple is in the
    // sect.  Stacks additively across disciples.
    desc: 'Expedition duration −5% per level'
  },
  {
    id: 'forgeMaster',
    name: 'Forge Master',
    // Reduces forging duration by 5% per level.  Stacks across disciples.
    desc: 'Forging duration −5% per level'
  }
  ,
  {
    id: 'lucky',
    name: 'Lucky',
    // Each level of Lucky reduces the rare reward threshold on expeditions by 1.
    // This effectively increases the frequency of rare drops by making them
    // occur sooner.  It does not guarantee specific items.
    desc: 'Rare expedition rewards appear more often'
  }
];

// Helper: compute the total levels of disciples possessing a particular trait.
// Some traits stack based on disciple level (e.g. Loyal reduces expedition
// duration by 5% per level of each Loyal disciple).  If no disciple has the
// trait, returns 0.
function getTraitLevelSum(traitId) {
  let sum = 0;
  disciples.forEach(d => {
    if (d.traits && d.traits.includes(traitId)) {
      // sum levels; default level is 1
      sum += d.level || 1;
    }
  });
  return sum;
}

// Party selection UI
function updatePartyUI() {
  // Party system has been removed.  This function is kept as a no‑op to
  // avoid errors from calls elsewhere in the code.  It intentionally does
  // nothing, as there is no longer a party selection UI or associated state.
  return;
}

function updateDiscipleUI() {
  const listElem = document.getElementById('disciple-list');
  listElem.innerHTML = '';
  // Ensure every disciple has a unique avatar.  We base the assignment
  // solely on the disciple's index within the array to avoid duplicates.
  // Each base image cycles through the avatar list, and once exhausted a
  // hue rotation is applied to differentiate appearances.  This ensures
  // that no two disciples look alike, even across old saves.
  disciples.forEach((disciple, i) => {
    const basePath = discipleAvatars[i % discipleAvatars.length];
    const rotationIndex = Math.floor(i / discipleAvatars.length);
    // Multiply by 37 to spread hues evenly around the 360° color wheel.
    const hue = (rotationIndex * 37) % 360;
    disciple.avatar = { path: basePath, hue: hue };
  });
  // Update the disciple count display in the Missions header
  const countElem = document.getElementById('disciple-count');
  if (countElem) {
    countElem.textContent = disciples.length.toString();
  
  // Refresh party selection list
  updatePartyUI();}
  // allow recruit new disciple for spirit stones
  const recruitEntry = document.createElement('div');
  recruitEntry.className = 'entry';
  // Use translation keys for the recruit label and cost.  The cost is fixed at 50 spirit stones.
  recruitEntry.innerHTML = `<div class="entry-icon"><img src="assets/icons/disciples.svg" alt="Recruit Disciple"/></div><div><strong>${typeof t === 'function' ? t('recruit.title') : 'Recruit Disciple'}</strong><br><small>${typeof t === 'function' ? t('recruit.cost', { cost: 50 }) : 'Cost: 50 Spirit Stones'}</small></div>`;
  const recruitBtn = document.createElement('button');
  recruitBtn.textContent = typeof t === 'function' ? t('btn.recruit') : 'Recruit';
  recruitBtn.addEventListener('click', () => {
    if (game.spiritStones < 50) {
      // Show a localized toast if available
      const msg = (typeof t === 'function') ? t('toast.insufficientSS') : 'Not enough Spirit Stones';
      showToast(msg);
      return;
    }
    game.spiritStones -= 50;
    // Assign a random name, class and trait to the new disciple.  Each
    // disciple receives exactly one trait at recruitment to encourage variety.
    const name = discipleNames[Math.floor(Math.random() * discipleNames.length)];
    const cls = discipleClasses[Math.floor(Math.random() * discipleClasses.length)];
    const trait = discipleTraits[Math.floor(Math.random() * discipleTraits.length)];
    // Determine avatar for this disciple.  Use a unique index that
    // increments with each recruitment.  The base avatar cycles through
    // the available images, and once exhausted a hue rotation is applied
    // to ensure uniqueness of appearance.
    const idx = nextAvatarIndex;
    const basePath = discipleAvatars[idx % discipleAvatars.length];
    let hue = 0;
    if (idx >= discipleAvatars.length) {
      // Apply a deterministic hue rotation based on how many times we've
      // wrapped around the avatar list.  Multiplying by 37 spreads out
      // hues across the 360° color circle without obvious repetition.
      hue = ((idx - discipleAvatars.length) * 37) % 360;
    }
    nextAvatarIndex++;
    const avatar = { path: basePath, hue };
    disciples.push({ name, classId: cls.id, level: 1, trainingCost: 20, traits: [trait.id], avatar });
    // Localise recruit toast with variable interpolation if translation function exists
    if (typeof t === 'function') {
      showToast(t('toast.recruited', { name, class: cls.name, trait: trait.name }));
    } else {
      showToast(`Recruited ${name}, a ${cls.name} with the ${trait.name} trait!`);
    }
    updateDiscipleUI();
    updateStatsUI();
    saveGame();
  });
  recruitEntry.appendChild(recruitBtn);
  listElem.appendChild(recruitEntry);
  disciples.forEach((disciple, idx) => {
    const entry = document.createElement('div');
    entry.className = 'entry';
    // Find class info
    const cls = discipleClasses.find(c => c.id === disciple.classId) || { name: 'Cultivator' };
    // Show disciple name, class and level along with their contributions.  The class
    // determines which resources they contribute to each tick (e.g. Sword Cultivators
    // provide Qi, Alchemists provide herbs, Miners provide spiritStones and Beast Masters
    // provide beast energy).  Each level multiplies their contribution.
    let contrib = '';
    if (cls.qi) contrib += `Qi +${cls.qi * disciple.level}/s `;
    if (cls.herbs) contrib += `Herbs +${cls.herbs * disciple.level}/s `;
    if (cls.spiritStones) contrib += `Spirit Stones +${cls.spiritStones * disciple.level}/s `;
    if (cls.beasts) contrib += `Beasts +${cls.beasts * disciple.level}/s `;
    // Determine trait names and descriptions for display.
    let traitNames = '';
    let traitDescs = '';
    if (disciple.traits && disciple.traits.length > 0) {
      // Build a comma‑separated list of trait names and semicolon‑separated descriptions.
      traitNames = disciple.traits.map(tId => {
        const t = discipleTraits.find(dt => dt.id === tId);
        return t ? t.name : tId;
      }).join(', ');
      traitDescs = disciple.traits.map(tId => {
        const t = discipleTraits.find(dt => dt.id === tId);
        return t ? `${t.name}: ${t.desc}` : '';
      }).filter(s => s).join('; ');
    }
    // Construct HTML for trait display.  If traits exist, append a miniscule “?” icon that can be clicked
    // to show a popup explaining the trait.  The question mark inherits the .trait-info style defined in CSS.
    let traitHtml = '';
    if (traitNames) {
      traitHtml = `<br><small>Trait: ${traitNames} <span class="trait-info">?</span></small>`;
    }
    // Ensure the disciple has an avatar assigned.  For old saves where the
    // avatar property is missing or stored as a simple string path, convert
    // it into an object with path and hue rotation.  Assign a default
    // avatar deterministically based on index if still undefined.
    if (!disciple.avatar) {
      const basePath = discipleAvatars[idx % discipleAvatars.length];
      disciple.avatar = { path: basePath, hue: 0 };
    } else if (typeof disciple.avatar === 'string') {
      disciple.avatar = { path: disciple.avatar, hue: 0 };
    }
    const avatarPath = disciple.avatar.path || disciple.avatar;
    const avatarHue = disciple.avatar.hue || 0;
    const styleAttr = avatarHue ? ` style="filter: hue-rotate(${avatarHue}deg)"` : '';
    entry.innerHTML = `<div class="entry-icon"><img src="${avatarPath}" alt="Disciple Avatar" class="disciple-avatar"${styleAttr}/></div><div><strong>${disciple.name}</strong> (${cls.name})<br><small>Level ${disciple.level}</small><br><small>${contrib.trim()}</small>${traitHtml}</div>`;
    // Attach tooltip to show trait descriptions when hovering over the entire entry.
    if (traitDescs) {
      entry.title = traitDescs;
    }
    // Attach click handler to the question mark icon to display an in‑game popup via showToast.
    if (traitNames) {
      const infoEl = entry.querySelector('.trait-info');
      if (infoEl) {
        infoEl.addEventListener('click', (ev) => {
          // Prevent the train button from immediately triggering due to event bubbling.
          ev.stopPropagation();
          // Use showToast to surface the trait descriptions.  This shows a temporary notification.
          if (traitDescs) {
            showToast(traitDescs);
          }
        });
      }
    }
    const btn = document.createElement('button');
    // Use translation key for the train button.  Append cost in SS after the translated label.
    const trainLabel = (typeof t === 'function' ? t('btn.train') : 'Train');
    btn.textContent = `${trainLabel} (${formatNumber(disciple.trainingCost || 20)} SS)`;
    
    btn.addEventListener('click', () => {
      disciple.trainingCost = disciple.trainingCost || 20;
      if (game.spiritStones < disciple.trainingCost) {
        showToast('Not enough Spirit Stones');
        return;
      }
      game.spiritStones -= disciple.trainingCost;
      disciple.level++;
      disciple.trainingCost = Math.max(1, Math.floor(disciple.trainingCost * 2));
      // Use a localized toast for disciple advancement if translation function exists
      if (typeof t === 'function') {
        showToast(t('toast.discipleAdvanced', { name: disciple.name, level: disciple.level, cost: formatNumber(disciple.trainingCost) }));
      } else {
        showToast(`${disciple.name} has advanced to Level ${disciple.level}! Training cost is now ${formatNumber(disciple.trainingCost)} SS.`);
      }
      updateDiscipleUI();
      saveGame();
    });
entry.appendChild(btn);
    listElem.appendChild(entry);
  });
  // update expedition UI
  updateExpeditionUI();
}

// Forging (simplified) - placeholder
// Define forging recipes.  Each artifact specifies its unique id, display name,
// which resource it boosts and by how much, base stone cost, base forging
// time (in seconds) and the minimum realm stage required to unlock it.
// The buffValue acts as a multiplicative factor (e.g. 1.10 = +10%).
const artifactDefs = [
  {
    id: 'qiTalisman',
    name: 'Qi Talisman',
    buffType: 'qi',
    buffValue: 1.10,
    baseCost: 100,
    baseTime: 60,
    unlockStage: 3,
    desc: 'Increases Qi/s by 10%'
  },
  {
    id: 'herbTalisman',
    name: 'Herbal Charm',
    buffType: 'herbs',
    buffValue: 1.15,
    baseCost: 80,
    baseTime: 90,
    unlockStage: 3,
    desc: 'Increases herb production by 15%'
  },
  {
    id: 'stoneTalisman',
    name: 'Stone Sigil',
    buffType: 'spiritStones',
    buffValue: 1.15,
    baseCost: 80,
    baseTime: 90,
    unlockStage: 3,
    desc: 'Increases spirit stone production by 15%'
  },
  {
    id: 'beastTalisman',
    name: 'Beast Totem',
    buffType: 'beasts',
    buffValue: 1.15,
    baseCost: 80,
    baseTime: 90,
    unlockStage: 3,
    desc: 'Increases beast energy production by 15%'
  }
  ,
  // Fortune Charm reduces the chance of expedition failure.  Each charm
  // multiplies the current expedition risk by (1 - buffValue).  Unlike other
  // artifacts, this does not directly increase resource production but
  // improves expedition outcomes.
  {
    id: 'fortuneCharm',
    name: 'Fortune Charm',
    buffType: 'riskReduction',
    buffValue: 0.10,
    baseCost: 120,
    baseTime: 120,
    unlockStage: 3,
    desc: 'Reduces expedition failure chance by 10%'
  }
];

// Alchemy elixir definitions
const elixirDefs = [
  {
    id: 'qiDraft',
    name: 'Qi Draft',
    desc: '+25% Qi/s for 60s',
    baseBrew: 60,
    duration: 60,
    costs: { herbs: 50 },
    effects: { qiMult: 1.25 }
  },
  {
    id: 'focusDraught',
    name: 'Focus Draught',
    desc: '+50 Qi per tap for 60s',
    baseBrew: 75,
    duration: 60,
    costs: { herbs: 80 },
    effects: { tapFlat: 50 }
  },
  {
    id: 'beastBlood',
    name: 'Beast Blood Elixir',
    desc: '+15% Beasts/s for 90s',
    baseBrew: 90,
    duration: 90,
    costs: { herbs: 60, beasts: 40 },
    effects: { beastsMult: 1.15 }
  },
  {
    id: 'spiritSerum',
    name: 'Spirit Serum',
    desc: '+15% Herbs & Spirit Stones/s for 90s',
    baseBrew: 100,
    duration: 90,
    costs: { herbs: 100, spiritStones: 60 },
    effects: { herbsMult: 1.15, spiritStonesMult: 1.15 }
  },
  {
    id: 'celestialAmbrosia',
    name: 'Celestial Ambrosia',
    desc: '+10% all resources for 120s',
    baseBrew: 120,
    duration: 120,
    unlockStage: 4,
    costs: { herbs: 150, spiritStones: 120, beasts: 60, jade: 5 },
    effects: { qiMult: 1.10, herbsMult: 1.10, spiritStonesMult: 1.10, beastsMult: 1.10, jadeMult: 1.10 }
  }
];



// Update the Forging UI to show available artifacts, handle forging actions and
// display the current forging queue.  When forging is locked (stage < 3) the
// buttons are disabled but the list remains visible for transparency.
function updateForgingUI() {
  const listElem = document.getElementById('forging-list');
  const placeholder = document.getElementById('forging-placeholder');
  // clear existing entries
  listElem.innerHTML = '';
  // Ensure forging slots is at least 1 to allow forging.  Some save states
  // may incorrectly set forgingSlots to 0 or undefined, preventing all forging.
  if (typeof game.forgingSlots !== 'number' || game.forgingSlots < 1) {
    game.forgingSlots = 1;
  }
  // compute cost/time reductions from upgrades and perks
  const talismanLv = game.upgrades.talismanWorkshop || 0;
  const attuneLv = game.upgrades.elementalAttunement || 0;
  const logisticLv = game.research.logistics || 0;
  const forgeMasteryLv = game.ascensionPerks.forgeMastery || 0;
  const costReduction = 1 - 0.05 * talismanLv - 0.01 * logisticLv - 0.02 * forgeMasteryLv;
  // Base time reduction from upgrades and perks
  let timeReduction = 1 - 0.05 * talismanLv - 0.02 * attuneLv - 0.01 * logisticLv - 0.02 * forgeMasteryLv;
  // Apply additional reduction from disciples with the Forge Master trait
  const forgeTraitLevels = getTraitLevelSum('forgeMaster');
  if (forgeTraitLevels > 0) {
    timeReduction *= (1 - 0.05 * forgeTraitLevels);
  }
  const costMult = (typeof game.forgeCostMult !== 'undefined' ? game.forgeCostMult : 1);
  // Determine Heavenly Thunder level to apply synergy to Qi artifacts
  const thunderLv = game.upgrades.heavenlyThunder || 0;
  // For each artifact definition, create a UI entry
  artifactDefs.forEach(def => {
    const entry = document.createElement('div');
    entry.className = 'entry';
    // build description with dynamic buff
    let buffMult = def.buffValue;
    if (def.buffType === 'qi' && thunderLv > 0) {
      buffMult *= (1 + 0.02 * thunderLv);
    }
    const bonusPct = (buffMult * 100 - 100).toFixed(0);
    // compute final cost and time after reductions and story multipliers
    const cost = Math.ceil(def.baseCost * costReduction * costMult);
    // Apply the global forging time multiplier (game.forgingTimeMult) on top of
    // upgrade/time reductions. A multiplier <1 speeds up forging while >1 slows it.
    const time = Math.max(5, Math.ceil(def.baseTime * timeReduction * (game.forgingTimeMult || 1)));
    // Determine lock state based on realm stage
    const locked = game.stage < def.unlockStage;
    // Compose HTML using i18n.  Translate the artifact name and description if translations exist.
    const artName = (typeof window.t === 'function' ? t(`artifact.${def.id}.name`) : null) || def.name;
    // Build the description with percentage substituted into the translated template if available.  If no
    // translation is found the original description is used with the percentage replaced.
    let descTpl;
    if (typeof window.t === 'function') {
      try {
        descTpl = t(`artifact.${def.id}.desc`, { percent: `${bonusPct}%` });
      } catch (e) {
        descTpl = null;
      }
    }
    const descText = descTpl && descTpl !== `artifact.${def.id}.desc` ? descTpl : def.desc.replace(/\d+%/, `${bonusPct}%`);
    // Build cost/time strings via i18n; fall back to English labels if missing
    let costLabel;
    let timeLabel;
    if (typeof window.t === 'function') {
      try {
        costLabel = t('forging.cost', { cost: formatNumber(cost) });
      } catch (e) {
        costLabel = `Cost: ${formatNumber(cost)} spiritStones`;
      }
      try {
        timeLabel = t('forging.time', { time: time });
      } catch (e) {
        timeLabel = `Time: ${time}s`;
      }
    } else {
      costLabel = `Cost: ${formatNumber(cost)} spiritStones`;
      timeLabel = `Time: ${time}s`;
    }
    let desc = `${descText}<br>${costLabel}<br>${timeLabel}`;
    if (locked) {
      desc += `<br><em>Unlocks at ${getRealmName(def.unlockStage)} (Stage ${def.unlockStage})</em>`;
    }
    entry.innerHTML = `<div><strong>${artName}</strong><br><small>${desc}</small></div>`;
    const btn = document.createElement('button');
    if (locked) {
      // Translate locked label
      btn.textContent = (typeof window.t === 'function' ? t('btn.locked') : 'Locked');
      btn.disabled = true;
    } else {
      // When all forging slots are occupied, disable the button to prevent queuing
      const slotsInUse = Array.isArray(game.forgingQueue) ? game.forgingQueue.length : 0;
      const maxSlots = (typeof game.forgingSlots === 'number' && game.forgingSlots > 0) ? game.forgingSlots : 1;
      if (slotsInUse >= maxSlots) {
        btn.textContent = (typeof window.t === 'function' ? t('btn.full') : 'Full');
        btn.disabled = true;
      } else {
        btn.textContent = (typeof window.t === 'function' ? t('btn.forge') : 'Forge');
        btn.addEventListener('click', () => {
          // Recalculate cost/time on click in case of dynamic upgrades
          const currentCost = Math.ceil(def.baseCost * (1 - 0.05 * (game.upgrades.talismanWorkshop || 0) - 0.01 * (game.research.logistics || 0) - 0.02 * (game.ascensionPerks.forgeMastery || 0)) * (typeof game.forgeCostMult !== 'undefined' ? game.forgeCostMult : 1));
          let currentTimeMult = 1 - 0.05 * (game.upgrades.talismanWorkshop || 0) - 0.02 * (game.upgrades.elementalAttunement || 0) - 0.01 * (game.research.logistics || 0) - 0.02 * (game.ascensionPerks.forgeMastery || 0);
          // Apply forge master trait reduction to current time
          const forgeTraitLv = getTraitLevelSum('forgeMaster');
          if (forgeTraitLv > 0) {
            currentTimeMult *= (1 - 0.05 * forgeTraitLv);
          }
          // Apply global forging time multiplier; ensure default of 1
          const effectiveTimeMult = currentTimeMult * (game.forgingTimeMult || 1);
          const currentTime = Math.max(5, Math.ceil(def.baseTime * effectiveTimeMult));
          if (game.spiritStones < currentCost) {
            // Show translated toast for insufficient stones
            if (typeof window.t === 'function') {
              showToast(t('toast.notEnoughSpiritStones2'));
            } else {
              showToast('Not enough spiritStones');
            }
            return;
          }
          // Check slots again just before queuing (race condition safety)
          const inUse = Array.isArray(game.forgingQueue) ? game.forgingQueue.length : 0;
          if (inUse >= ((typeof game.forgingSlots === 'number' && game.forgingSlots > 0) ? game.forgingSlots : 1)) {
            if (typeof window.t === 'function') {
              showToast(t('toast.forgingSlotsFull'));
            } else {
              showToast('All forging slots are currently in use');
            }
            updateForgingUI();
            return;
          }
          // deduct cost and queue the artifact
          game.spiritStones -= currentCost;
          const finishTime = Date.now() + currentTime * 1000;
          game.forgingQueue.push({ id: generateId(), artifactId: def.id, endTime: finishTime, duration: currentTime });
          // Use translated artifact name and toast message if available
          const forgeName = (typeof window.t === 'function' ? t(`artifact.${def.id}.name`) : null) || def.name;
          if (typeof window.t === 'function') {
            try {
              showToast(t('toast.startedForging', { name: forgeName }));
            } catch (e) {
              showToast(`${forgeName} started forging!`);
            }
          } else {
            showToast(`${forgeName} started forging!`);
          }
          updateForgingUI();
          updateStatsUI();
          saveGame();
        });
      }
    }
    entry.appendChild(btn);
    // Provide a native tooltip summarising the artifact effect.  The title
    // attribute will show the base description when hovered.
    entry.title = def.desc;
    listElem.appendChild(entry);
  });
  // Now render active forging tasks below available recipes
  if (game.forgingQueue.length > 0) {
    const queueHeader = document.createElement('h4');
    queueHeader.textContent = (typeof window.t === 'function' ? t('forging.queueHeader') : 'Forging Queue');
    listElem.appendChild(queueHeader);
    game.forgingQueue.forEach(task => {
      const def = artifactDefs.find(a => a.id === task.artifactId);
      const taskDiv = document.createElement('div');
      taskDiv.className = 'entry';
      const remaining = Math.max(0, Math.floor((task.endTime - Date.now()) / 1000));
      // compute progress percent
      const progress = Math.max(0, Math.min(1, (task.duration - remaining) / task.duration));
      // Build progress bar
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      const inner = document.createElement('div');
      inner.className = 'progress-inner';
      inner.style.width = `${(progress * 100).toFixed(0)}%`;
      progressBar.appendChild(inner);
      const ptext = document.createElement('div');
      ptext.className = 'progress-text';
      // Translate the remaining time label if available
      if (typeof window.t === 'function') {
        try {
          ptext.textContent = t('forging.remaining', { time: remaining });
        } catch (e) {
          ptext.textContent = `${remaining}s remaining`;
        }
      } else {
        ptext.textContent = `${remaining}s remaining`;
      }
      // Build in-progress header with translation.  If a translation exists use forging.inProgress, otherwise fall back.
      const taskName = def ? ((typeof window.t === 'function' ? t(`artifact.${def.id}.name`) : def.name) || def.name) : task.artifactId;
      let headerText;
      if (typeof window.t === 'function') {
        try {
          headerText = t('forging.inProgress', { name: taskName });
        } catch (e) {
          headerText = `Forging ${taskName}`;
        }
      } else {
        headerText = `Forging ${taskName}`;
      }
      taskDiv.innerHTML = `<div><strong>${headerText}</strong></div>`;
      taskDiv.appendChild(progressBar);
      taskDiv.appendChild(ptext);
      // Attach tooltip to queued task for quick reference
      if (def) {
        taskDiv.title = def.desc;
      }
      listElem.appendChild(taskDiv);
    });
  }
  // hide or show placeholder (legacy); forging is considered always visible
  if (placeholder) {
    placeholder.classList.add('hidden');
  }
}

// Check active forging tasks each tick.  When a task finishes, apply its
// multiplier to the appropriate resource, remove it from the queue and
// refresh production and UI.  If multiple tasks finish simultaneously
// they are all processed before updating.
function updateForgingQueue() {
  if (!Array.isArray(game.forgingQueue) || game.forgingQueue.length === 0) {
    return;
  }
  const now = Date.now();
  let changed = false;
  // Process tasks in reverse order so splicing removal does not affect indices
  for (let i = game.forgingQueue.length - 1; i >= 0; i--) {
    const task = game.forgingQueue[i];
    if (now >= task.endTime) {
      const def = artifactDefs.find(a => a.id === task.artifactId);
      if (def) {
        // Apply Heavenly Thunder synergy if Qi artifact
        let buffMult = def.buffValue;
        const thunderLv = game.upgrades.heavenlyThunder || 0;
        if (def.buffType === 'qi' && thunderLv > 0) {
          buffMult *= (1 + 0.02 * thunderLv);
        }
        // Apply forging bonus depending on the artifact type.  For Qi/Herb/
        // Stone/Beast buffs, multiply the appropriate resource multiplier.  For
        // risk reduction charms, multiply the expedition risk multiplier.
        if (def.buffType === 'riskReduction') {
          // Initialize forgingRiskMult if absent
          if (typeof game.forgingRiskMult !== 'number') {
            game.forgingRiskMult = 1;
          }
          // Multiply by (1 - buffValue) to reduce risk
          game.forgingRiskMult *= (1 - def.buffValue);
        } else {
          // multiply forgingMults for the corresponding resource type
          if (!game.forgingMults) {
            game.forgingMults = { qi: 1, herbs: 1, spiritStones: 1, beasts: 1 };
          }
          if (typeof game.forgingMults[def.buffType] !== 'number') {
            game.forgingMults[def.buffType] = 1;
          }
          game.forgingMults[def.buffType] *= buffMult;
        }
        // increment forged artifact counter for achievements
        game.artifactsForged = (game.artifactsForged || 0) + 1;
        showToast(`${def.name} forging complete!`);
        changed = true;
      }
      // Remove task from queue
      game.forgingQueue.splice(i, 1);
    }
  }
  if (changed) {
    recalcProduction();
    updateForgingUI();
    updateStatsUI();
    checkRelics && typeof checkRelics === 'function' && checkRelics();
    saveGame();
  }
}

// Show toast messages
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  // Map certain English messages to translation keys.  This allows
  // toast messages to be fully localised without changing every call site.
  const toastKeyMap = {
    'You have already chosen a path for this chapter.': 'toast.alreadyChosen',
    'Your decision echoes along your cultivation path.': 'toast.decisionEcho',
    'Max level reached': 'toast.maxLevel',
    'Not enough Qi': 'toast.notEnoughQi',
    'Not enough currency': 'toast.notEnoughCurrency',
    'Not enough Spirit Stones': 'toast.notEnoughSpiritStones',
    'No completed quests to claim.': 'toast.noCompletedQuests',
    'No completed bounties to claim.': 'toast.noCompletedBounties',
    'Not enough spiritStones': 'toast.notEnoughSpiritStones2',
    'This expedition is already in progress.': 'toast.expeditionInProgress',
    'You need disciples to go on expeditions.': 'toast.needDisciples',
    'Not enough Ascension Points': 'toast.notEnoughCurrency',
    'This elixir unlocks later.': 'toast.elixirLocked',
    'Not enough resources.': 'toast.notEnoughResources',
    'You do not have that elixir.': 'toast.noElixir',
    'A wandering herbalist shares 50 herbs with you.': 'toast.herbalistGift',
    'You discover a modest stone vein! +50 spiritStones.': 'toast.stoneVein',
    'A small pack of spirit beasts crosses your path. +25 beast energy.': 'toast.beastPack',
    'A tiny jade shard lands nearby! +1 jade.': 'toast.jadeShard',
    'A wandering merchant gifts you 20 Spirit Stones.': 'toast.merchantGift',
    'Breakthrough successful!': 'toast.breakthroughSuccess',
    'Research unlocked! New studies await in the Cultivation hall.': 'toast.researchUnlocked',
    'New buildings have been unlocked within your sect.': 'toast.newBuildings',
    'Forging unlocked! The forge within your sect is now available.': 'toast.forgingUnlocked',
      'All forging slots are currently in use': 'toast.forgingSlotsFull',
    'Save exported to clipboard': 'toast.saveExported',
    'Unable to copy save to clipboard': 'toast.copyFailed',
    'Invalid save data': 'toast.invalidSave',
    'Failed to parse save data': 'toast.parseFailed'
  };
  let translated = null;
  try {
    if (typeof window.t === 'function') {
      const key = toastKeyMap[msg];
      if (key) {
        const tVal = window.t(key);
        if (tVal && tVal !== key) {
          translated = tVal;
        }
      }
    }
  } catch (e) {
    // ignore translation errors
  }
  toast.textContent = translated || msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// Apply game settings (theme, accessibility)
function applySettings() {
  // Theme classes: remove both then add selected
  document.body.classList.remove('theme-dark', 'theme-light');
  const theme = game.settings.theme || 'dark';
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.add('theme-dark');
  }
  // Color blind mode
  document.body.classList.toggle('color-blind', !!game.settings.colorBlind);
  // Large font
  document.body.classList.toggle('large-font', !!game.settings.largeFont);
  // Reduce motion
  document.body.classList.toggle('reduce-motion', !!game.settings.reduceMotion);

  // Set the background image based on selected index.  The --bg-image CSS
  // variable is defined on :root and used by the body element to display the
  // actual image.  If an invalid index is provided, fall back to 0.
  try {
    const backgrounds = [
      'assets/backgrounds/bg1.png',
      'assets/backgrounds/bg2.png',
      'assets/backgrounds/bg3.png',
      'assets/backgrounds/bg4.png',
      'assets/backgrounds/bg5.png'
    ];
    let idx = parseInt(game.settings.backgroundIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= backgrounds.length) {
      idx = 0;
    }
    const url = backgrounds[idx];
    // apply to :root so both dark and light themes pick it up
    document.documentElement.style.setProperty('--bg-image', `url('${url}')`);
    // apply dimmer overlay opacity; ensure a valid number between 0 and 0.3
    let dimmer = parseFloat(game.settings.bgDimmer);
    if (isNaN(dimmer) || dimmer < 0) dimmer = 0;
    if (dimmer > 0.3) dimmer = 0.3;
    document.documentElement.style.setProperty('--bg-dimmer', dimmer);
  } catch (err) {
    console.warn('Failed to apply background:', err);
  }
}

// Update the global hideLocked setting and refresh all UI lists that are
// sensitive to locked state.  This helper ensures that all hide‑locked
// checkboxes remain in sync and that the setting is persisted.  Call
// setHideLocked(true) or setHideLocked(false) when a user toggles any
// hide‑locked checkbox to reflect the new preference across the entire UI.
function setHideLocked(val) {
  // Persist the setting on the game object for backwards compatibility only
  game.settings.hideLocked = !!val;
  // No UI refresh is needed because locked content is always hidden and there are no toggles.
  applySettings();
  saveGame();
}

// Reset game: clear save and reload
function resetGame() {
  // Immediately reset all game data without confirmation
  try {
    // Clear storage to remove any persisted save data
    localStorage.removeItem('cultivationGame');
    localStorage.clear();
  } catch (e) {
    console.warn('Error clearing save:', e);
  }
  // Reset in-memory game state to defaults
  game.qi = 0;
  game.qiPerTap = 1;
  game.qiPerSec = 0;
  game.herbs = 0;
  game.spiritStones = 0;
  game.beasts = 0;
  game.jade = 0;
  game.spiritStones = 0;
  game.dantianCap = 1e6;
  game.dantianMult = 1;
  game.stage = 0;
  game.subLayer = 0;
  game.upgrades = {};
  game.research = {};
  game.multQi = 1;
  game.multHerbs = 1;
  game.multSpiritStones = 1;
  game.multBeasts = 1;
  game.layerMult = 1;
  game.lastTick = Date.now();
  game.autoSend = false;
  game.lastExpeditionType = null;
  // activeExpedition is deprecated; use activeExpeditions map instead.  Do not set this property on reset.
  game.afterglowExpires = 0;
  game.achCollapsed = false;
  game.loreCollapsed = false;
  game.questTimestamp = 0;
  game.expeditionPity = { herb: 0, stone: 0, beast: 0, beastLair: 0 };
  game.buildings = {};
  game.ascensionPoints = 0;
  game.ascensionPerks = {};
  game.bountyTimestamp = 0;
  game.bounties = {};
  // Reset quest and bounty progress stored on the game object.  Without
  // clearing these objects, stale quest and bounty data could leak into
  // a fresh game when the player chooses to reset.  Also update the
  // module‑scoped references so UI functions operate on the cleared
  // objects.
  game.quests = {};
  quests = game.quests;
  game.bounties = {};
  bounties = game.bounties;
  game.forgingBuffMult = 1;
  // Reset new forging system state
  game.forgingMults = { qi: 1, herbs: 1, spiritStones: 1, beasts: 1 };
  game.forgingQueue = [];
  game.forgingRiskMult = 1;
  disciples = [];
  game.disciples = [];
  // Clear alchemy and expedition state
  game.elixirQueue = [];
  game.elixirInventory = {};
  game.activeElixirs = [];
  game.elixirOverdose = {};
  game.selectedPartyIdxs = [];
  game.activeExpeditions = {};
  // Reset forging slots and time multiplier to default values
  game.forgingSlots = 1;
  game.forgingTimeMult = 1;
  // Reset disciple assignments
  game.discipleAssignments = {};
  // Reset bounty and daily/weekly tasks
  game.dailyBounties = [];
  game.weeklyBounties = [];
  game.dailySeed = 0;
  game.weekSeed = 0;
  // Reset the manual Qi per tap multiplier.  The testing toggle should
  // always start disabled after a reset or in a new game.
  game.qiPerTapMult = 1;
  // Reset the passive Qi per second multiplier as well.  When starting a new game
  // or resetting, the "Qi per second ×100" testing toggle should default to
  // disabled (multiplier of 1).  Failing to reset this value would cause the
  // game to remember the last multiplier state across new games.
  game.qiPerSecMult = 1;
  // Initialise story‑related multipliers for forging cost, expedition time,
  // disciple output and ascension rewards.  These default to 1 (no effect)
  // and may be modified by story choices.
  game.forgeCostMult = 1;
  game.expeditionTimeMult = 1;
  game.discipleMult = 1;
  game.ascensionRewardMult = 1;
  // Tutorial state removed; nothing to initialise here
  // Initialise relic collection tracking
  game.relics = {};
  // Reset story progress so players can experience the narrative anew
  game.story = { choices: {} };
  // Reset feature notification state.  When starting a new game, no screens
  // should display the “!” badge until the player unlocks them again.  Clear
  // the newFeatures and featuresSeen maps and collapse any expanded
  // expedition details.
  game.newFeatures = {};
  game.featuresSeen = {};
  game.expandedExpeditions = {};
  // Reset counters and random event timer
  game.expeditionsCompleted = 0;
  game.bountiesClaimed = 0;
  game.artifactsForged = 0;
  game.lastRandomEvent = 0;
  // Reset additional multipliers
  game.multJade = 1;
  // Reset breakthrough tracking
  game.totalBreakthroughs = 0;
  // Reset the current screen tracker so that the first call to showScreen
  // does not mark a previous page as seen.  currentScreen is defined in
  // the broader script scope, so assign to it here explicitly.
  if (typeof currentScreen !== 'undefined') {
    currentScreen = null;
  }
  // reset skill levels
  const skillIds = ['alchemy','swordplay','bodyCultivation','beastTaming','sectLeadership','soulRefinement'];
  for (const id of skillIds) {
    game[`${id}Level`] = 0;
  }
  // Reset settings to defaults
  game.settings = { colorBlind: false, largeFont: false, reduceMotion: false, theme: 'dark', backgroundIndex: 0, sectTab: 'management' };
  // Save and reapply settings
  saveGame();
  applySettings();

  // Ensure the testing multiplier checkbox is unchecked after a reset.  Without
  // this, the visual state might remain enabled even though the multiplier
  // has been reset to its default of 1.
  const tapMultCb = document.getElementById('cb-tap-mult');
  if (tapMultCb) {
    tapMultCb.checked = false;
  }
  // Similarly uncheck the Qi per second multiplier toggle to reflect the
  // reset state.  This prevents the UI from showing the toggle as enabled
  // when the internal multiplier has been reset to 1.
  const psMultCb = document.getElementById('cb-ps-mult');
  if (psMultCb) {
    psMultCb.checked = false;
  }
  // Recalculate production and update all UIs
  recalcProduction();
  updateStatsUI();
  updateUpgradeUI();
  updateSkillUI();
  updateResearchUI();
  updateQuestUI();
  if (typeof updateBountyUI === 'function') updateBountyUI();
  updateDiscipleUI();
  updateForgingUI();
  updateAscensionUI();
  updateAchLoreUI();
  updateSectUI();
  updateAscensionTreeUI();
  // Refresh the story after resetting so that the introductory chapter is rendered
  updateStoryUI();
  // Return to the Story page after resetting the game
  showScreen('story');
}

// Toggle fullscreen mode and optionally lock/unlock screen orientation.  This function will
// request fullscreen on the document element if not already in fullscreen.  When
// entering fullscreen, it attempts to lock the orientation to landscape to
// provide a wider view of the game.  If already in fullscreen, the function
// exits fullscreen and unlocks the orientation if supported.  Errors from
// orientation locking/unlocking are caught silently.
function toggleFullScreen() {
  const doc = document;
  if (!doc.fullscreenElement) {
    // Request fullscreen on the document root
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
      elem.msRequestFullscreen();
    }
    // Try to lock orientation to landscape when entering fullscreen
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } else {
    // Exit fullscreen
    if (doc.exitFullscreen) {
      doc.exitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen();
    }
    // Unlock orientation when leaving fullscreen if supported
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock().catch(() => {});
    }
  }
}

// Check and unlock achievements
function checkAchievements() {
  for (const def of achievementDefs) {
    if (!game.achievementsUnlocked[def.id] && def.condition()) {
      game.achievementsUnlocked[def.id] = true;
      // reward 1 Spirit Stone per achievement unlocked
      game.spiritStones += 1;
      showToast(`Achievement unlocked: ${def.name}!`);
    }
  }
  // unlock lore based on stage
  for (const entry of loreDefs) {
    if (!game.loreUnlocked.includes(entry.stage) && game.stage >= entry.stage) {
      game.loreUnlocked.push(entry.stage);
    }
  }
  updateAchLoreUI();
}

// Build Achievements & Lore UI
function updateAchLoreUI() {
  const achList = document.getElementById('ach-list');
  const loreList = document.getElementById('lore-list');
  // When the codex structure was reorganised, the Achievements and
  // Lore cards were given ids `codex-achievements` and `codex-lore`.
  // Adjust the selector here to match the actual elements in the DOM
  // instead of the old `achievements-card`/`lore-card` ids.  If the
  // elements are not found, bail early to avoid errors.
  const achCard = document.getElementById('codex-achievements');
  const loreCard = document.getElementById('codex-lore');
  if (!achList || !loreList || !achCard || !loreCard) return;
  // update collapsed classes
  achCard.classList.toggle('collapsed', game.achCollapsed);
  loreCard.classList.toggle('collapsed', game.loreCollapsed);
  // update toggle symbols
  const achToggle = document.getElementById('ach-toggle');
  const loreToggle = document.getElementById('lore-toggle');
  if (achToggle) achToggle.textContent = game.achCollapsed ? '+' : '−';
  if (loreToggle) loreToggle.textContent = game.loreCollapsed ? '+' : '−';
  achList.innerHTML = '';
  loreList.innerHTML = '';
  achievementDefs.forEach(def => {
    const li = document.createElement('div');
    li.className = 'entry';
    const unlocked = game.achievementsUnlocked[def.id];
    li.innerHTML = `<div><strong>${def.name}</strong><br><small>${def.desc}</small></div>`;
    const status = document.createElement('button');
    status.classList.add('status-btn');
    status.disabled = true;
    status.textContent = unlocked ? '✓' : '✗';
    li.appendChild(status);
    achList.appendChild(li);
  });
  loreDefs.forEach(def => {
    // Determine how far ahead this lore entry is relative to the current realm.
    const diff = def.stage - game.stage;
    // Skip lore entries more than two realms ahead to avoid spoilers.
    if (diff > 2) return;
    const li = document.createElement('div');
    li.className = 'entry';
    const unlocked = game.loreUnlocked.includes(def.stage) || def.stage <= game.stage;
    let titleText;
    let descText;
    if (unlocked) {
      // Player has reached this realm or unlocked the lore: show full title and text
      titleText = def.title;
      descText = def.text;
    } else if (diff === 1) {
      // One realm above: show the title but hide the description
      titleText = def.title;
      descText = '???';
    } else if (diff === 2) {
      // Two realms above: hide both title and description
      titleText = '???';
      descText = '???';
    } else {
      // Fallback: hide details
      titleText = '???';
      descText = '???';
    }
    li.innerHTML = `<div><strong>${titleText}</strong><br><small>${descText}</small></div>`;
    loreList.appendChild(li);
  });
}

// Start an expedition
function startExpedition(type) {
  // Ensure the activeExpeditions map exists
  if (!game.activeExpeditions) game.activeExpeditions = {};
  // Only one expedition of each type can run at a time
  if (game.activeExpeditions[type]) {
    showToast('This expedition is already in progress.');
    return;
  }
  // Require at least one disciple
  if (disciples.length === 0) {
    showToast('You need disciples to go on expeditions.');
    return;
  }
  const def = expeditionDefs.find(e => e.id === type);
  if (!def) return;

  // Expeditions no longer require a party.  Compute duration and reward
  // solely from logistics research and global expedition modifiers.
  const logisticLv = game.research.logistics || 0;
  const durationMult = 1 - 0.01 * logisticLv;
  const rewardMult = 1 + 0.01 * logisticLv;
  const expMult = (game.expeditionTimeMult !== undefined ? game.expeditionTimeMult : 1);
  // total duration after applying research and global modifiers
  const totalDuration = Math.floor(def.baseDuration * durationMult * expMult);
  const endTime = Date.now() + totalDuration * 1000;
  // reward is based on base amounts scaled by logistics research
  const reward = {
    herbs: (def.reward.herbs || 0) * rewardMult,
    spiritStones: (def.reward.spiritStones || 0) * rewardMult,
    beasts: (def.reward.beasts || 0) * rewardMult
  };
  game.activeExpeditions[type] = {
    type: type,
    endTime: endTime,
    reward: reward,
    // maintain an empty party array for backward compatibility; no longer used
    party: []
  };
  // Track last expedition type for auto send
  game.lastExpeditionType = type;
  showToast(`${def.name} expedition started!`);
  updateExpeditionUI();
  if (game.tutorial && game.tutorial.active && game.tutorial.step === 3) {
    advanceTutorial();
  }
  saveGame();
  return;
}
function updateExpedition() {
  if (!game.activeExpeditions) return;
  const now = Date.now();
  let anyCompleted = false;
  // iterate over active expeditions by type
  for (const type of Object.keys(game.activeExpeditions)) {
    const exp = game.activeExpeditions[type];
    if (!exp) continue;
    if (now >= exp.endTime) {
      // Determine risk of failure for this expedition type.  If an expedition
      // definition includes a risk value, roll a random check to see if it
      // succeeds.  On failure, no rewards are granted.  Pity counter still
      // increases so rare rewards can still be earned on subsequent attempts.
      const eDef = expeditionDefs.find(e => e.id === type);
      let success = true;
      if (eDef && eDef.risk && eDef.risk > 0) {
        // Apply forging risk reduction to the base risk.  Each Fortune Charm multiplies
        // the risk downward.  Ensure risk does not fall below 0.
        const riskMult = (typeof game.forgingRiskMult === 'number' ? game.forgingRiskMult : 1);
        const actualRisk = Math.max(0, eDef.risk * riskMult);
        if (Math.random() < actualRisk) success = false;
      }
      if (success) {
        // grant rewards
        const reward = exp.reward || {};
        if (reward.herbs) game.herbs += reward.herbs;
        if (reward.spiritStones) game.spiritStones += reward.spiritStones;
        if (reward.beasts) game.beasts += reward.beasts;
      }
      // Increase pity counter and check for rare reward for this type
      game.expeditionPity[type] = (game.expeditionPity[type] || 0) + 1;
      let rare = false;
      // Adjust rare reward threshold based on Lucky traits.  Each level of Lucky
      // reduces the number of successful expeditions required before a rare drop.
      const partyIdxs = (exp.party && Array.isArray(exp.party)) ? exp.party : [];
      let luckyLv = 0;
      partyIdxs.forEach(i => { const d = disciples[i]; if (d && d.traits && d.traits.includes('lucky')) luckyLv += d.level || 1; });
      // Default threshold is 3; subtract one per lucky level but not below 1.
      const rareThreshold = Math.max(1, 3 - luckyLv);
      if (game.expeditionPity[type] >= rareThreshold) {
        rare = true;
        if (type === 'herb') game.herbs += 20;
        if (type === 'stone') game.spiritStones += 20;
        if (type === 'beast') game.beasts += 10;
        game.jade += 1;
        game.expeditionPity[type] = 0;
      }
      if (!success) {
        showToast(`${type} expedition failed! Your disciples returned empty-handed.`);
      } else {
        showToast(rare ? `${type} expedition complete! Rare find discovered.` : `${type} expedition complete! Resources gained.`);
      }
      // remove the completed expedition
      delete game.activeExpeditions[type];
      anyCompleted = true;
      // increment global counter for completed expeditions.  This
      // counter is used for achievements such as Expedition Master.  It
      // counts each expedition individually, regardless of type or
      // simultaneous completion.
      game.expeditionsCompleted = (game.expeditionsCompleted || 0) + 1;
    }
  }
  if (anyCompleted) {
    updateExpeditionUI();
    updateStatsUI();
    saveGame();
  }

  // Auto‑send idle expeditions according to per‑type settings.  When the global autoSend
  // toggle is enabled, loop through each defined expedition and check whether the player
  // has opted into auto sending for that type.  If so, and there is no active expedition
  // of that type, immediately queue a new one.  This logic runs each tick regardless of
  // whether any expeditions completed in this iteration.
  try {
    if (game.autoSend && game.settings && game.settings.autoSendTypes) {
      // Track whether any expedition types are explicitly flagged for auto send.
      let anyFlagSet = false;
      expeditionDefs.forEach(def => {
        const flagged = !!game.settings.autoSendTypes[def.id];
        if (flagged) anyFlagSet = true;
        // If this type is flagged and not currently active, start it immediately.
        if (!game.activeExpeditions[def.id] && flagged) {
          startExpedition(def.id);
        }
      });
      // If no expedition types have been flagged for auto‑send, fall back to the
      // last expedition type used.  This provides a sensible default so that
      // enabling the global toggle immediately requeues the most recently
      // selected expedition without requiring per‑type toggles.  Only start
      // the fallback if there is no active expedition of that type.
      if (!anyFlagSet && game.lastExpeditionType) {
        const t = game.lastExpeditionType;
        if (!game.activeExpeditions[t]) {
          startExpedition(t);
        }
      }
    }
  } catch (e) {
    console.error('Auto‑send error:', e);
  }
}

// Build expedition UI
function updateExpeditionUI() {
  const listElem = document.getElementById('expedition-list');
  if (!listElem) return;
  listElem.innerHTML = '';
  // For each defined expedition type, either show an active progress or a send button
  expeditionDefs.forEach(def => {
    const entry = document.createElement('div');
    entry.className = 'entry';
    const active = game.activeExpeditions && game.activeExpeditions[def.id];
    if (active) {
      // Active expedition: show time left with a collapse/expand toggle and optional
      // details (duration, failure chance and EV).  Use game.expandedExpeditions
      // to persist expansion state per expedition type.
      const remaining = Math.max(0, (active.endTime - Date.now()) / 1000);
      const expanded = !!game.expandedExpeditions[def.id];
      // Compute details: duration, failure chance and EV using the same logic as the idle state.
      const riskMult = (typeof game.forgingRiskMult === 'number' ? game.forgingRiskMult : 1);
      const displayRisk = def.risk && def.risk > 0 ? Math.max(0, def.risk * riskMult) : 0;
      const failureText = displayRisk > 0 ? `Failure: ${(displayRisk * 100).toFixed(0)}%` : 'Failure: 0%';
      const logisticLv = (game.research && game.research.logistics) || 0;
      const rewardMult = 1 + 0.01 * logisticLv;
      const successProb = 1 - displayRisk;
      const evParts = [];
      if (def.reward) {
        Object.keys(def.reward).forEach(res => {
          const base = def.reward[res] || 0;
          const evVal = base * rewardMult * successProb;
          if (evVal > 0) evParts.push(`${formatNumber(evVal)} ${getResourceDisplayName(res)}`);
        });
      }
      const evText = evParts.length ? `EV: ${evParts.join(', ')}` : '';
      // Use base duration rather than adjusted because players generally expect
      // the listed duration to match the idle description.  Adjustments from
      // research only affect the actual timer, not the tooltip.
      const durationText = `Duration: ${def.baseDuration}s`;
      const detailsString = `${durationText} | ${failureText}${evText ? ' | ' + evText : ''}`;
      // Build the active expedition entry using DOM nodes to attach event handlers.
      entry.innerHTML = '';
      const headerDiv = document.createElement('div');
      headerDiv.style.display = 'flex';
      headerDiv.style.justifyContent = 'space-between';
      headerDiv.style.alignItems = 'center';
      // Left side: name and time remaining
      const leftWrap = document.createElement('div');
      leftWrap.innerHTML = `<strong>${def.name}</strong><br><small>Time left: ${Math.ceil(remaining)}s</small>`;
      headerDiv.appendChild(leftWrap);
      // Right side: toggle button
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'exp-toggle';
      toggleBtn.textContent = expanded ? '−' : '+';
      toggleBtn.addEventListener('click', () => {
        game.expandedExpeditions[def.id] = !expanded;
        saveGame();
        updateExpeditionUI();
      });
      headerDiv.appendChild(toggleBtn);
      entry.appendChild(headerDiv);
      // Details container
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'exp-details';
      detailsDiv.style.display = expanded ? 'block' : 'none';
      detailsDiv.innerHTML = `<small>${detailsString}</small>`;
      entry.appendChild(detailsDiv);
    } else {
      // show send button with duration info
      // Display duration, risk and expected value (EV) for each expedition when idle.
      // Risk: percentage chance that the expedition will fail and yield no reward.
      // Reward multiplier from Logistics research: +1% reward per level.
      const riskMult = (typeof game.forgingRiskMult === 'number' ? game.forgingRiskMult : 1);
      const displayRisk = def.risk && def.risk > 0 ? Math.max(0, def.risk * riskMult) : 0;
      const failureText = displayRisk > 0 ? `Failure: ${(displayRisk * 100).toFixed(0)}%` : 'Failure: 0%';
      const logisticLv = (game.research && game.research.logistics) || 0;
      const rewardMult = 1 + 0.01 * logisticLv;
      const successProb = 1 - displayRisk;
      // Compute expected value per resource (no party/trait bonuses)
      const evParts = [];
      if (def.reward) {
        Object.keys(def.reward).forEach(res => {
          const base = def.reward[res] || 0;
          const evVal = base * rewardMult * successProb;
          if (evVal > 0) evParts.push(`${formatNumber(evVal)} ${getResourceDisplayName(res)}`);
        });
      }
      const evText = evParts.length ? `EV: ${evParts.join(', ')}` : '';
      entry.innerHTML = `<div><strong>${def.name}</strong><br><small>Duration: ${def.baseDuration}s | ${failureText}${evText ? ' | ' + evText : ''}</small></div>`;
      const btn = document.createElement('button');
      btn.textContent = 'Send';
      btn.addEventListener('click', () => startExpedition(def.id));
      entry.appendChild(btn);
      // Add per‑type auto‑send toggle.  When the global autoSend toggle is enabled,
      // only expedition types with this checkbox checked will auto‑start.  Persist
      // the flag in game.settings.autoSendTypes.
      if (!game.settings) game.settings = {};
      if (!game.settings.autoSendTypes) game.settings.autoSendTypes = {};
      const autoWrap = document.createElement('label');
      autoWrap.style.display = 'inline-flex';
      autoWrap.style.alignItems = 'center';
      autoWrap.style.marginLeft = '8px';
      const autoToggle = document.createElement('input');
      autoToggle.type = 'checkbox';
      autoToggle.style.marginRight = '4px';
      autoToggle.checked = !!game.settings.autoSendTypes[def.id];
      autoToggle.addEventListener('change', () => {
        game.settings.autoSendTypes[def.id] = autoToggle.checked;
        // Save immediately when auto flag changes to persist across reloads
        saveGame();
      });
      autoWrap.appendChild(autoToggle);
      const autoText = document.createElement('span');
      autoText.textContent = 'Auto';
      autoWrap.appendChild(autoText);
      entry.appendChild(autoWrap);
    }
    listElem.appendChild(entry);
  });
}

// Build sect management UI
function updateSectUI() {
  const listElem = document.getElementById('sect-list');
  if (!listElem) return;
  listElem.innerHTML = '';
  for (const def of buildingDefs) {
    // Skip sect buildings that unlock in later realms.  Locked buildings remain hidden until unlocked.
    if (def.unlockStage > game.stage) {
      continue;
    }
    const entry = document.createElement('div');
    entry.className = 'entry';
    const level = game.buildings[def.id] || 0;
    const locked = def.unlockStage > game.stage;
    if (locked) {
      entry.innerHTML = `<div><strong>${def.name}</strong><br><small>Unlocks at ${getRealmName(def.unlockStage)}</small></div>`;
      const btn = document.createElement('button');
      btn.textContent = 'Locked';
      btn.disabled = true;
      entry.appendChild(btn);
    } else {
      const cost = def.baseCost * Math.pow(def.costMult, level);
      entry.innerHTML = `<div><strong>${def.name}</strong> (Lv ${level})<br><small>${def.desc}</small></div>`;
      const btn = document.createElement('button');
      btn.textContent = `Upgrade (${formatNumber(cost)} SS)`;
      btn.addEventListener('click', () => buyBuilding(def.id));
      entry.appendChild(btn);
    }
    listElem.appendChild(entry);
  }
  // Also update forging UI as forging now resides within the sect page
  updateForgingUI();

  // After refreshing the lists, update which view (management or forging) is visible
  if (typeof updateSectTab === 'function') {
    updateSectTab();
  }
}

// Purchase sect building level
function buyBuilding(id) {
  const def = buildingDefs.find(b => b.id === id);
  if (!def) return;
  const level = game.buildings[id] || 0;
  if (def.unlockStage > game.stage) {
    showToast(`Unlocks at ${getRealmName(def.unlockStage)}`);
    return;
  }
  const cost = def.baseCost * Math.pow(def.costMult, level);
  if (game.spiritStones < cost) {
    showToast('Not enough Spirit Stones');
    return;
  }
  game.spiritStones -= cost;
  game.buildings[id] = level + 1;
  showToast(`${def.name} upgraded!`);
  recalcProduction();
  updateSectUI();
  updateStatsUI();
  saveGame();
}

// Build ascension tree UI
function updateAscensionTreeUI() {
  const pointsElem = document.getElementById('asc-points');
  const listElem = document.getElementById('asc-perks-list');
  if (!pointsElem || !listElem) return;
  // Display the current Ascension Points using a translated label.  The key
  // "label.ascensionPoints" provides the label including any punctuation.  If
  // a translation is unavailable it falls back to the English phrase.
  let ascLabel;
  try {
    if (typeof window.t === 'function') {
      ascLabel = window.t('label.ascensionPoints');
    }
  } catch (e) {
    // ignore
  }
  if (!ascLabel || ascLabel === 'label.ascensionPoints') ascLabel = 'Ascension Points:';
  pointsElem.textContent = `${ascLabel} ${formatNumber(game.ascensionPoints)}`;
  listElem.innerHTML = '';
  for (const def of ascensionPerkDefs) {
    const entry = document.createElement('div');
    entry.className = 'entry';
    const level = game.ascensionPerks[def.id] || 0;
    const cost = def.baseCost * Math.pow(def.costMult, level);
    // Translate perk name and description via keys "perk.{id}.name" and
    // "perk.{id}.desc".  Fallback to the definition when no translation is found.
    let perkName = def.name;
    let perkDesc = def.desc;
    try {
      if (typeof window.t === 'function') {
        const nameKey = 'perk.' + def.id + '.name';
        const descKey = 'perk.' + def.id + '.desc';
        const nameTrans = window.t(nameKey);
        const descTrans = window.t(descKey);
        if (nameTrans && nameTrans !== nameKey) perkName = nameTrans;
        if (descTrans && descTrans !== descKey) perkDesc = descTrans;
      }
    } catch (e) {
      // ignore
    }
    entry.innerHTML = `<div><strong>${perkName}</strong> (Lv ${level})<br><small>${perkDesc}</small></div>`;
    const btn = document.createElement('button');
    // Translate the Buy verb and append the AP cost.  AP is left as is.
    let buyVerb;
    try {
      if (typeof window.t === 'function') buyVerb = window.t('btn.buy');
    } catch (e) {}
    if (!buyVerb || buyVerb === 'btn.buy') buyVerb = 'Buy';
    btn.textContent = `${buyVerb} (${formatNumber(cost)} AP)`;
    btn.addEventListener('click', () => buyAscensionPerk(def.id));
    if (game.ascensionPoints < cost) {
      btn.disabled = true;
    }
    entry.appendChild(btn);
    listElem.appendChild(entry);
  }
}

// Purchase an ascension perk
function buyAscensionPerk(id) {
  const def = ascensionPerkDefs.find(p => p.id === id);
  if (!def) return;
  const level = game.ascensionPerks[id] || 0;
  const cost = def.baseCost * Math.pow(def.costMult, level);
  if (game.ascensionPoints < cost) {
    showToast('Not enough Ascension Points');
    return;
  }
  game.ascensionPoints -= cost;
  game.ascensionPerks[id] = level + 1;
  showToast(`${def.name} upgraded!`);
  recalcProduction();
  updateAscensionTreeUI();
  updateStatsUI();
  saveGame();
}

// Toggle between the Sect Management (buildings) view and the Forging view.
// The current tab is stored on game.settings.sectTab.  When switching
// tabs, show or hide the appropriate lists and header and update the
// active class on the buttons.
function updateSectTab() {
  const managementList = document.getElementById('sect-list');
  const forgingList = document.getElementById('forging-list');
  const forgingPlaceholder = document.getElementById('forging-placeholder');
  // The forging header is the first h3 inside the sect card
  const forgingHeader = document.querySelector('#screen-sect h3');
  // Hall buttons live outside the card; update active class on these instead of the old sect-switcher
  const managementBtn = document.getElementById('hall-management-btn');
  const forgingBtn = document.getElementById('hall-forging-btn');
  const currentTab = (game.settings && game.settings.sectTab) || 'management';
  // Determine if forging is unlocked
  const forgingUnlocked = game.stage >= 3;
  if (currentTab === 'management') {
    // Show buildings; hide forging content entirely
    if (managementList) managementList.style.display = '';
    if (forgingList) forgingList.style.display = 'none';
    if (forgingPlaceholder) forgingPlaceholder.style.display = 'none';
    if (forgingHeader) forgingHeader.style.display = 'none';
    // Set active state
    if (managementBtn) managementBtn.classList.add('active');
    if (forgingBtn) forgingBtn.classList.remove('active');
  } else {
    // Player selected forging view
    if (managementList) managementList.style.display = 'none';
    // Always show the forging header when in forging view
    if (forgingHeader) forgingHeader.style.display = '';
    if (forgingUnlocked) {
      // Show forging list and hide placeholder
      if (forgingList) forgingList.style.display = '';
      if (forgingPlaceholder) forgingPlaceholder.style.display = 'none';
    } else {
      // Show placeholder and hide list if forging is locked
      if (forgingList) forgingList.style.display = 'none';
      if (forgingPlaceholder) forgingPlaceholder.style.display = 'block';
    }
    // Set active state
    if (managementBtn) managementBtn.classList.remove('active');
    if (forgingBtn) forgingBtn.classList.add('active');
  }
}

// Tick function - runs every second

// Compute aggregate active elixir buffs and prune expired ones
function getActiveElixirBuffs() {
  const now = Date.now();
  const buffs = { qiMult: 1, herbsMult: 1, spiritStonesMult: 1, beastsMult: 1, jadeMult: 1, tapMult: 1, tapFlat: 0 };
  // remove expired
  game.activeElixirs = (game.activeElixirs || []).filter(e => e.expiresAt > now);
  const alchLv = game['alchemyLevel'] || 0;
  const resLv = game.research['alchemyResearch'] || 0;
  const potency = 1 + 0.05 * alchLv + 0.01 * resLv;
  for (const e of game.activeElixirs) {
    const def = elixirDefs.find(d => d.id === e.id);
    if (!def) continue;
    const eff = def.effects || {};
    if (eff.qiMult) buffs.qiMult *= 1 + (eff.qiMult - 1) * potency;
    if (eff.herbsMult) buffs.herbsMult *= 1 + (eff.herbsMult - 1) * potency;
    if (eff.spiritStonesMult) buffs.spiritStonesMult *= 1 + (eff.spiritStonesMult - 1) * potency;
    if (eff.beastsMult) buffs.beastsMult *= 1 + (eff.beastsMult - 1) * potency;
    if (eff.jadeMult) buffs.jadeMult *= 1 + (eff.jadeMult - 1) * potency;
    if (eff.tapMult) buffs.tapMult *= 1 + (eff.tapMult - 1) * potency;
    if (eff.tapFlat) buffs.tapFlat += eff.tapFlat * potency;
  }
  return buffs;
}

// Process brewing queue and move finished elixirs into inventory
function updateAlchemyQueue() {
  game.elixirQueue = Array.isArray(game.elixirQueue) ? game.elixirQueue : [];
  game.elixirInventory = game.elixirInventory || {};
  const now = Date.now();
  let changed = false;
  for (const task of game.elixirQueue) {
    if (!task.done && now >= task.endTime) {
      // Mark the task as done and move the brewed elixir into the inventory.
      task.done = true;
      game.elixirInventory[task.id] = (game.elixirInventory[task.id] || 0) + 1;
      changed = true;
    }
  }
  // Remove completed tasks from the brewing queue.  Leaving them in place
  // results in entries with "0s remaining" cluttering the UI.  Filtering
  // here ensures the queue only contains active brews.
  const beforeLen = game.elixirQueue.length;
  game.elixirQueue = game.elixirQueue.filter(task => !task.done);
  if (game.elixirQueue.length !== beforeLen) {
    changed = true;
  }
  if (changed) saveGame();
}

// Start brewing an elixir
function craftElixir(id) {
  const def = elixirDefs.find(d => d.id === id);
  if (!def) return;
  if (def.unlockStage && game.stage < def.unlockStage) {
    showToast('This elixir unlocks later.');
    return;
  }
  const costs = def.costs || {};
  for (const k of Object.keys(costs)) {
    if ((game[k] || 0) < costs[k]) {
      showToast('Not enough resources.');
      return;
    }
  }
  // pay costs
  for (const k of Object.keys(costs)) {
    game[k] -= costs[k];
  }
  // brew time reduced by Alchemy level (5% per level, min 50%) and Logistics (1% per level)
  const alchLv = game['alchemyLevel'] || 0;
  const logisticLv = game.research['logistics'] || 0;
  const mult = Math.max(0.5, 1 - 0.05 * alchLv) * (1 - 0.01 * logisticLv);
  const brewMs = Math.floor((def.baseBrew || 60) * mult * 1000);
  const task = { id: def.id, endTime: Date.now() + brewMs, done: false };
  game.elixirQueue.push(task);
  showToast(`Brewing ${def.name}...`);
  updateAlchemyUI();
  saveGame();
}

// Consume an elixir from inventory
function useElixir(id) {
  game.elixirInventory = game.elixirInventory || {};
  const count = game.elixirInventory[id] || 0;
  if (count <= 0) {
    showToast('You do not have that elixir.');
    return;
  }
  const def = elixirDefs.find(d => d.id === id);
  if (!def) return;
  game.elixirInventory[id] = count - 1;
  const durMs = (def.duration || 60) * 1000;
  game.activeElixirs = Array.isArray(game.activeElixirs) ? game.activeElixirs : [];
  game.activeElixirs.push({ id: id, expiresAt: Date.now() + durMs });
  showToast(`${def.name} consumed!`);
  updateAlchemyUI();
  saveGame();
}

// Build Alchemy UI
function updateAlchemyUI() {
  const recipeList = document.getElementById('alchemy-recipes');
  const queueList = document.getElementById('alchemy-queue');
  const invList = document.getElementById('alchemy-inventory');
  if (!recipeList || !queueList || !invList) return;
  recipeList.innerHTML = '';
  queueList.innerHTML = '';
  invList.innerHTML = '';

  const alchLv = game['alchemyLevel'] || 0;
  // Recipes
  elixirDefs.forEach(def => {
    if (def.unlockStage && game.stage < def.unlockStage) return;
    const entry = document.createElement('div');
    entry.className = 'entry';
    const costs = Object.entries(def.costs || {}).map(([k,v]) => `${formatNumber(v)} ${k}`).join(', ');
    entry.innerHTML = `<div class="entry-icon"><img src="assets/icons/alchemyResearch.svg" alt="Alchemy"/></div>
      <div><strong>${def.name}</strong><br><small>${def.desc}</small><br><small>Costs: ${costs} • Brew: ${def.baseBrew}s</small></div>`;
    const btn = document.createElement('button');
    btn.textContent = 'Craft';
    btn.addEventListener('click', () => craftElixir(def.id));
    entry.appendChild(btn);
    recipeList.appendChild(entry);
  });

  // Queue
  (game.elixirQueue || []).forEach(task => {
    const def = elixirDefs.find(d => d.id === task.id);
    if (!def) return;
    const entry = document.createElement('div');
    entry.className = 'entry';
    const remain = Math.max(0, task.endTime - Date.now());
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    const total = def.baseBrew * Math.max(0.5, 1 - 0.05 * alchLv) * (1 - 0.01 * (game.research.logistics || 0));
    const pct = Math.min(100, 100 * (1 - remain/ (total*1000)));
    bar.style.width = pct.toFixed(2) + '%';
    entry.innerHTML = `<div><strong>Brewing ${def.name}</strong><br><small>${Math.ceil(remain/1000)}s remaining</small></div>`;
    entry.appendChild(bar);
    queueList.appendChild(entry);
  });

  // Inventory
  const inv = game.elixirInventory || {};
  elixirDefs.forEach(def => {
    const count = inv[def.id] || 0;
    if (count <= 0) return;
    const entry = document.createElement('div');
    entry.className = 'entry';
    entry.innerHTML = `<div class="entry-icon"><img src="assets/icons/alchemyResearch.svg" alt="Elixir"/></div>
      <div><strong>${def.name}</strong><br><small>${def.desc}</small><br><small>In bag: ${count}</small></div>`;
    const btn = document.createElement('button');
    btn.textContent = 'Use';
    btn.addEventListener('click', () => useElixir(def.id));
    entry.appendChild(btn);
    invList.appendChild(entry);
  });
}

function tick() {
  // Process any completed forging tasks before adding resources
  updateForgingQueue();
  // Process any completed alchemy brews
  updateAlchemyQueue();
  // add resources per second
  // apply afterglow buff if active
  const buffs = getActiveElixirBuffs();
  let qiPerSec = game.finalQiPerSec * buffs.qiMult;
  if (game.afterglowExpires && Date.now() < game.afterglowExpires) {
    qiPerSec *= 1.20;
  }
  game.qi += qiPerSec;
  if (game.qi > game.dantianCap) game.qi = game.dantianCap;
  game.herbs += game.finalHerbPerSec * buffs.herbsMult;
  game.spiritStones += game.finalSpiritStonePerSec * buffs.spiritStonesMult;
  game.beasts += game.finalBeastPerSec * buffs.beastsMult;
  game.jade += (game.finalJadePerSec || 0) * buffs.jadeMult;
  // disciple contributions are handled in recalcProduction; no need to add separately here
  // update expedition progress
  updateExpedition();
  updateStatsUI();
  updateQuestUI();
  updateBountyUI();
  // Update ascension UI each second so the time‑to‑next estimate ticks down in real time
  updateAscensionUI();

  // Refresh forging progress bars each tick.  Without this, the progress bars
  // would not update until a task completes.  This call is lightweight as it
  // simply updates DOM elements to reflect remaining time and progress.
  updateForgingUI();
  updateAlchemyUI();

  // Random Events: occasionally award small bonuses.  To avoid overwhelming
  // the player, random events can only occur if at least five minutes have
  // passed since the last event.  Once that cooldown elapses, there is a 5%
  // chance each second that a random event will occur.  When an event
  // triggers, one of several bonuses is selected at random and granted.
  const now = Date.now();
  // 5 minute cooldown: 5 * 60 * 1000 = 300000 ms
  if (now - (game.lastRandomEvent || 0) > 300000) {
    if (Math.random() < 0.05) {
      const roll = Math.random();
      if (roll < 0.2) {
        // Moderate random event rewards to provide small boosts
        game.herbs += 50;
        showToast('A wandering herbalist shares 50 herbs with you.');
      } else if (roll < 0.4) {
        game.spiritStones += 50;
        showToast('You discover a modest stone vein! +50 spiritStones.');
      } else if (roll < 0.6) {
        game.beasts += 25;
        showToast('A small pack of spirit beasts crosses your path. +25 beast energy.');
      } else if (roll < 0.8) {
        game.jade += 1;
        showToast('A tiny jade shard lands nearby! +1 jade.');
      } else {
        game.spiritStones += 20;
        showToast('A wandering merchant gifts you 20 Spirit Stones.');
      }
      game.lastRandomEvent = now;
    }
  }
  // check achievements and lore unlocks
  checkAchievements();
  saveGame();
  game.lastTick = Date.now();
}

// Calculate Qi cost to break through the next layer

// Base layer cost without any discounts (used for cap calculations)
function getBaseLayerCostNoDiscount() {
  const base = 100;
  const exponent = game.subLayer + 9 * game.stage;
  return base * Math.pow(2, exponent);
}

function getLayerCost() {
  // Base cost increases exponentially per layer and scales by realm.  We multiply the
  // base cost by 5^stage so each realm starts at 5x the previous realm\'s base cost.
  // Within a realm, each minor layer doubles the cost.  This yields ever-increasing
  // breakthrough costs that carry over between realms instead of resetting.
  // Lower the base breakthrough cost further to improve early progression pacing.
  // Increase the base breakthrough cost to make realm progression more challenging.
  // Originally the base was 70; subsequent revisions increased this to 90.  Further
  // raising the base to 100 pushes breakthrough requirements slightly higher across
  // all realms and layers (about a 43% increase from 70), resulting in a more
  // deliberate pace without making progress feel impossible.
  const base = 100;
  // New cost formula: each minor layer doubles the cost (2^subLayer) and each
  // new realm multiplies the cost by 10 (10^stage).  This prevents cost resets
  // between realms and enforces a steep increase for ascension.
  let cost = base * Math.pow(2, game.subLayer) * Math.pow(10, game.stage);
  // Apply Ascension Theory research discount: each level reduces layer and realm cost by 2%,
  // up to a minimum factor of 0.2 to prevent the cost from becoming trivial.
  const theoryLv = game.research.ascensionTheory || 0;
  if (theoryLv > 0) {
    const factor = Math.max(0.2, 1 - 0.02 * theoryLv);
    cost *= factor;
  }
  return cost;
}

// Update ascension UI
function updateAscensionUI() {
  const info = document.getElementById('ascension-info');
  if (!info) return;
  const cost = getLayerCost();
  const isFinalLayer = game.subLayer >= 8;
  const atFinalRealm = game.stage >= realms.length - 1;
  // Use translation helper where available
  const tFn = typeof window.t === 'function' ? window.t : (k, vars) => {
    // simple fallback: return key for unknown
    if (!vars) return k;
    let str = k;
    Object.keys(vars).forEach(key => {
      str = str.replace(new RegExp(`{${key}}`, 'g'), vars[key]);
    });
    return str;
  };
  let timeToNext = '';
  if (game.finalQiPerSec > 0) {
    const qiNeeded = Math.max(0, cost - game.qi);
    const seconds = qiNeeded / game.finalQiPerSec;
    if (seconds > 0) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const timeStr = tFn('ascension.timeToTarget', { mins: mins, secs: secs });
      timeToNext = `<br><small>${timeStr}</small>`;
    }
  }
  const ascendBtn = document.getElementById('ascend-btn');
  // Handle display when at the final realm and final layer.  Show a custom
  // message and disable the ascend button entirely to indicate there is
  // nowhere left to progress.
  if (isFinalLayer && atFinalRealm) {
    // Use translation if available; otherwise fall back to English.
    let finalMsg;
    try {
      finalMsg = tFn('ascension.finalRealm');
    } catch (e) {
      finalMsg = 'You have reached the pinnacle of cultivation. No further ascension is possible.';
    }
    info.innerHTML = `${finalMsg}`;
    if (ascendBtn) {
      ascendBtn.textContent = tFn('btn.ascendRealm');
      ascendBtn.disabled = true;
    }
  } else if (isFinalLayer) {
    const message = tFn('ascension.readyToAscend', { realm: getRealmName(game.stage + 1), cost: formatNumber(cost) });
    info.innerHTML = `${message}${timeToNext}`;
    if (ascendBtn) {
      ascendBtn.textContent = tFn('btn.ascendRealm');
      ascendBtn.disabled = false;
    }
  } else {
    const message = tFn('ascension.nextLayer', { cost: formatNumber(cost) });
    info.innerHTML = `${message}${timeToNext}`;
    if (ascendBtn) {
      ascendBtn.textContent = tFn('btn.breakThrough');
      ascendBtn.disabled = false;
    }
  }

  // Update ascension progress bar and text if they exist.  This shows how close the player is to the next breakthrough or ascension based on current Qi relative to cost.
  const ascBar = document.getElementById('asc-progress-bar');
  const ascText = document.getElementById('asc-progress-text');
  if (ascBar && ascText) {
    const percentAsc = Math.min(game.qi / cost * 100, 100);
    ascBar.style.width = percentAsc.toFixed(2) + '%';
    // Estimate time remaining to reach cost
    let etaStr = '';
    if (game.finalQiPerSec > 0) {
      const qiNeeded = Math.max(0, cost - game.qi);
      const secs = qiNeeded / game.finalQiPerSec;
      if (secs > 0) {
        const mins = Math.floor(secs / 60);
        const sec = Math.floor(secs % 60);
        // Use translated time-to-target string for the progress bar ETA
        etaStr = ' (' + tFn('ascension.timeToTarget', { mins: mins, secs: sec }) + ')';
      }
    }
    // Use translated Qi label for the progress bar text
    const qiLabelAsc = tFn('stat.qi');
    ascText.textContent = `${formatNumber(game.qi)} / ${formatNumber(cost)} ${qiLabelAsc} (${percentAsc.toFixed(1)}%)${etaStr}`;
  }
}

// Handle layer breakthrough or realm ascension
function ascendLayer() {
  // Prevent further breakthroughs or ascensions when at the final realm and final layer.
  const finalRealmIndex = realms.length - 1;
  if (game.stage >= finalRealmIndex && game.subLayer >= 8) {
    // Inform the player that they have reached the pinnacle.  Use translation if available.
    if (typeof window.t === 'function') {
      try {
        showToast(t('toast.finalRealm'));
      } catch (e) {
        showToast('You have reached the pinnacle of cultivation and cannot ascend further.');
      }
    } else {
      showToast('You have reached the pinnacle of cultivation and cannot ascend further.');
    }
    return;
  }
  // Calculate the Qi cost for the next breakthrough or ascension.
  const cost = getLayerCost();
  // Players must have enough Qi to proceed.
  if (game.qi < cost) {
    showToast('Not enough Qi');
    return;
  }
  // Check resource requirements if the player is about to ascend to a new realm.
  // In the first realm (Qi Gathering, stage 0) only Qi is required, so skip extra
  // resource checks.  For later realms, herbs, spiritStones, beasts and jade are
  // consumed in increasing amounts.  This allows new players to ascend out of
  // the first realm without worrying about other resources.
  if (game.subLayer >= 8) {
    const stage = game.stage;
    // Only enforce resource requirements when ascending beyond the first realm.
    if (stage > 0) {
      const herbCost = 100 * Math.pow(2, stage);
      const stoneCost = 100 * Math.pow(2, stage);
      const beastCost = 50 * Math.pow(2, stage);
      const jadeCost = Math.pow(2, stage);
      if (game.herbs < herbCost || game.spiritStones < stoneCost || game.beasts < beastCost || game.jade < jadeCost) {
        showToast(`Insufficient resources to ascend. Need ${herbCost} Herbs, ${stoneCost} Spirit Stones, ${beastCost} Beast Energy and ${jadeCost} Jade.`);
        return;
      }
      // Deduct the required resources for ascension.
      game.herbs -= herbCost;
      game.spiritStones -= stoneCost;
      game.beasts -= beastCost;
      game.jade -= jadeCost;
    }
  }
  // Deduct the Qi cost now that all requirements are satisfied.
  game.qi -= cost;
  if (game.subLayer < 8) {
    // Minor breakthrough: advance the sub‑layer and apply a modest boost.
    game.subLayer++;
    // Each layer increases overall Qi output by 2% (0.02 multiplier).
    // Previously this was 5%, but ascension mechanics have been adjusted for
    // a smoother, less explosive growth curve.
    game.layerMult *= 1.02;
    // Increment the total breakthrough counter for minor breakthroughs.  This
    // counter tracks both minor layer breakthroughs and realm ascensions.  It
    // drives progress for quests and bounties that measure cumulative
    // breakthroughs.  Without incrementing here, only realm ascensions would
    // count, resulting in progress increments every nine layers instead of
    // each breakthrough.
    game.totalBreakthroughs = (game.totalBreakthroughs || 0) + 1;
    showToast('Breakthrough successful!');
    // Tutorial: after the first breakthrough, advance the onboarding tutorial.
    if (game.tutorial && game.tutorial.active && game.tutorial.step === 2) {
      advanceTutorial();
    }
  } else {
    // Completing the 9th layer triggers a realm ascension or resets within the final realm.
    const finalRealm = realms.length - 1;
    const atFinalRealm = game.stage >= finalRealm;
    // Reset the sub‑layer counter and apply the realm multiplier.  Each realm
    // ascended grants a 10% bonus to all Qi production.  Previously this
    // bonus was 40% which caused very steep scaling.
    game.subLayer = 0;
    game.layerMult *= 1.10;
    game.totalBreakthroughs = (game.totalBreakthroughs || 0) + 1;
    // Calculate Spirit Stone reward based on the Qi cost and various bonuses.
    let reward = Math.floor(Math.pow(cost, 0.65) / 1000);
    const soulLv = game['soulRefinementLevel'] || 0;
    const phoenixLv = game.upgrades.phoenixRebirth || 0;
    const heavenlyLv = game.research.heavenlyResearch || 0;
    const soulSearchLv = game.research.soulSearch || 0;
    reward = Math.floor(
      reward * (1 + 0.10 * soulLv) * (1 + 0.15 * phoenixLv) * (1 + 0.05 * heavenlyLv) * (1 + 0.05 * soulSearchLv)
    );
    // Apply global ascension reward multiplier from story choices (Eternal Cycle).
    const ascMult = (typeof game.ascensionRewardMult !== 'undefined' ? game.ascensionRewardMult : 1);
    reward = Math.floor(reward * ascMult);
    game.spiritStones += reward;
    // Award Ascension Points proportional to Spirit Stones (minimum of 1).
    const apReward = Math.max(1, Math.floor(reward / 10));
    game.ascensionPoints += apReward;
    // Reset Qi after ascension.
    game.qi = 0;
    if (atFinalRealm) {
      // Remain in the final realm; no further stage increment.
      showToast(`You have transcended beyond Eternal Godhood! Reward: ${reward} Spirit Stones`);
    } else {
      // Advance to the next realm.
      game.stage++;
      showToast(`Ascended to ${getRealmName(game.stage)}! Reward: ${reward} Spirit Stones`);
      // Unlock new features at specific stages.
      if (game.stage === 1) {
        showToast('Research unlocked! New studies await in the Cultivation hall.');
      } else if (game.stage === 2) {
        showToast('New buildings have been unlocked within your sect.');
      } else if (game.stage === 3) {
        showToast('Forging unlocked! The forge within your sect is now available.');
      }
      // After increasing the stage, check for newly available features
      checkNewFeatures();
      updateNewFeatureIndicators();
      // Tutorial: ascending counts as a breakthrough for the tutorial.
      if (game.tutorial && game.tutorial.active && game.tutorial.step === 2) {
        advanceTutorial();
      }
      // After ascending to a new realm (not the final realm), redirect to the Story page
      // and scroll to the newly unlocked chapter.  This provides narrative context
      // immediately after each realm ascension.
      setTimeout(() => {
        // Switch to the Story screen
        showScreen('story');
        // Scroll to the last unlocked story chapter after the screen has rendered.
        setTimeout(() => {
          const chapters = document.querySelectorAll('#story-chapters .card');
          if (chapters.length > 0) {
            const last = chapters[chapters.length - 1];
            last.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }, 0);
    }
  }
  recalcProduction();
  updateAscensionUI();
  updateAscensionTreeUI();
  updateSectUI();
  updateStatsUI();
  updateUpgradeUI();
  updateResearchUI();
  updateAlchemyUI();
  updateQuestUI();
  // After ascending, update the story UI to reveal new chapters if the realm has changed
  updateStoryUI();
  saveGame();
}

// Manual gather
function gatherQi() {
  // Apply Qi per tap multiplier for testing (e.g. 1 or 100).  Do not mutate
  // qiPerTap itself so that upgrades and other mechanics remain balanced.
  const tapMult = (typeof game.qiPerTapMult === 'number' && game.qiPerTapMult > 0) ? game.qiPerTapMult : 1;
  const buffs = getActiveElixirBuffs();
  const tapVal = (game.qiPerTap * tapMult * (buffs.tapMult||1)) + (buffs.tapFlat||0);
  game.qi += tapVal;
  if (game.qi > game.dantianCap) game.qi = game.dantianCap;
  updateStatsUI();
  updateQuestUI();
  // Tutorial: after the first Qi gather, progress to the next step
  if (game.tutorial && game.tutorial.active && game.tutorial.step === 0) {
    advanceTutorial();
  }
  saveGame();
}

// Screen switching
// Screen switching with gating.  Only Sect management is gated by reaching Foundation Establishment.
// Controls which realm stage is required to unlock each screen.  During testing
// we temporarily set the Sect unlock stage to 0 so we can preview the page
// without ascending.  In the final build this should be 1 (Foundation).
const screenUnlocks = {
  // The sect hub screen unlocks at Foundation Establishment (Stage 1).  The
  // Management Hall page (sect-management) also unlocks at the same time.
  sect: 1,
  'sect-management': 1,
  // Forging Hall unlocks at Golden Core (Stage 3), reflecting its late‑game nature.
  'sect-forging': 3,
  // The Dao Attainment Hall is available immediately so that quests and
  // bounties can accumulate progress even before the sect is unlocked.
  dao: 0
  ,
  // Recruitment & Mission Hall unlocks at the same time as the Management Hall (Foundation Establishment).
  'sect-recruitment': 1
};

// Track which screen is currently displayed.  When navigating away from a
// screen, this variable allows us to mark it as visited and clear any new
// feature notification.  It is updated every time showScreen() is called.
let currentScreen = null;

// Determine which features have been unlocked but not yet visited and set
// notification flags accordingly.  This function iterates over the
// screenUnlocks mapping and marks each screen as new when the player has
// reached or surpassed its required stage and has not previously visited
// it.  Call this after ascending, on load and whenever the game stage
// changes.
function checkNewFeatures() {
  if (!game.newFeatures) game.newFeatures = {};
  if (!game.featuresSeen) game.featuresSeen = {};
  Object.keys(screenUnlocks).forEach(id => {
    const reqStage = screenUnlocks[id];
    if (reqStage !== undefined && game.stage >= reqStage) {
      if (!game.featuresSeen[id]) {
        game.newFeatures[id] = true;
      }
    }
  });
  // Also treat the top‑level sect hub as a feature unlocked at the same stage
  // as its management hall.  The nav button is labelled "Sect" and has
  // data‑screen="sect".  When Foundation Establishment (stage 1) is
  // reached, both 'sect' and 'sect-management' are unlocked.  Include them
  // in the notification check explicitly in case they aren't keys in
  // screenUnlocks.
  if (game.stage >= 1) {
    ['sect', 'sect-management', 'sect-recruitment'].forEach(id => {
      if (!game.featuresSeen[id]) {
        game.newFeatures[id] = true;
      }
    });
  }
  if (game.stage >= 3) {
    // Forging hall becomes available at Golden Core (stage 3)
    ['sect-forging'].forEach(id => {
      if (!game.featuresSeen[id]) {
        game.newFeatures[id] = true;
      }
    });
  }
}

// Refresh notification badges on navigation and sect hall buttons.  When a
// screen is marked as new (game.newFeatures[screen] == true) and has not
// yet been visited (game.featuresSeen[screen] != true), a small "!"
// indicator is appended to the corresponding button.  When a badge is no
// longer needed, it is removed.  This function should be called after
// checkNewFeatures() or when navigating between screens.
function updateNewFeatureIndicators() {
  // Update nav bar buttons
  document.querySelectorAll('.nav-bar button[data-screen]').forEach(btn => {
    const id = btn.dataset.screen;
    // Remove any existing indicator
    const existing = btn.querySelector('.new-feature');
    if (existing) existing.remove();
    // Add indicator only if the feature is unlocked, not yet seen, and not the current screen
    if (game.newFeatures && game.newFeatures[id] && !game.featuresSeen[id] && id !== currentScreen) {
      const span = document.createElement('span');
      span.className = 'new-feature';
      span.textContent = '!';
      btn.appendChild(span);
    }
  });
  // Update sect hall buttons.  Each hall button is within a .hall-item along with its label.
  const hallMap = {
    'sect-management': document.getElementById('hall-management-btn'),
    'sect-forging': document.getElementById('hall-forging-btn'),
    'dao': document.getElementById('hall-dao-btn'),
    'sect-recruitment': document.getElementById('hall-recruitment-btn')
  };
  Object.keys(hallMap).forEach(id => {
    const btn = hallMap[id];
    if (!btn) return;
    // The indicator is appended to the hall item wrapper so that it appears
    // after the label.  This keeps the icon aligned across halls.
    const wrapper = btn.parentElement;
    if (!wrapper) return;
    // Remove existing indicator
    const existingBadge = wrapper.querySelector('.new-feature');
    if (existingBadge) existingBadge.remove();
    if (game.newFeatures && game.newFeatures[id] && !game.featuresSeen[id] && id !== currentScreen) {
      const span = document.createElement('span');
      span.className = 'new-feature';
      span.textContent = '!';
      wrapper.appendChild(span);
    }
  });

  // Update page headings for newly unlocked features.  When the current screen
  // corresponds to a feature that has just been unlocked (i.e. it exists in
  // game.newFeatures and has not yet been seen), append a "!" symbol next
  // to the heading on that page.  Remove any lingering indicators when
  // switching pages or after the feature has been viewed.
  document.querySelectorAll('.screen').forEach(screen => {
    const sid = screen.id.replace('screen-', '');
    // Find the first heading (h1/h2/h3) within this screen.  Ascension and
    // other screens typically use <h2>.
    const heading = screen.querySelector('h1, h2, h3');
    if (!heading) return;
    // Remove existing indicator if present
    const existingBadge = heading.querySelector('.new-feature');
    if (existingBadge) existingBadge.remove();
    // Only show an indicator on the current screen if it is unlocked and
    // unseen.  Do not show on other screens or after the player leaves.
    if (game.newFeatures && game.newFeatures[sid] && !game.featuresSeen[sid] && sid === currentScreen) {
      const span = document.createElement('span');
      span.className = 'new-feature';
      span.textContent = '!';
      heading.appendChild(span);
    }
  });
}
function showScreen(id) {
  // check gating
  const reqStage = screenUnlocks[id];
  if (reqStage !== undefined && game.stage < reqStage) {
    showToast(`Reach ${getRealmName(reqStage)} to unlock this screen.`);
    return;
  }
  // If leaving a screen, mark it as seen so its notification disappears.
  if (currentScreen && currentScreen !== id) {
    if (!game.featuresSeen) game.featuresSeen = {};
    if (!game.newFeatures) game.newFeatures = {};
    game.featuresSeen[currentScreen] = true;
    game.newFeatures[currentScreen] = false;
  }
  // Hide all screens and show the target
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.add('hidden');
  });
  const newScreenEl = document.getElementById(`screen-${id}`);
  if (newScreenEl) newScreenEl.classList.remove('hidden');
  // Toggle active state on nav buttons
  document.querySelectorAll('.nav-bar button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === id);
  });
  // Update current screen and refresh indicators
  currentScreen = id;
  updateNewFeatureIndicators();
  
  // When navigating to the Forging Hall, ensure the forging list is populated
  // and the correct placeholder is shown/hidden based on unlock state.
  if (id === 'sect-forging') {
    try {
      updateForgingUI();
    } catch (e) { /* ignore UI errors */ }
    const list = document.getElementById('forging-list');
    const placeholder = document.getElementById('forging-placeholder');
    if (list && placeholder) {
      if (game.stage >= (screenUnlocks['sect-forging'] || 3)) {
        list.style.display = '';
        placeholder.style.display = 'none';
      } else {
        list.style.display = 'none';
        placeholder.style.display = 'block';
      }
    }
  }
// When navigating to the story screen, refresh the chapters.  This ensures
  // any newly unlocked chapters or choices are displayed immediately and
  // prevents stale content if the page was generated before DOM was ready.
  if (id === 'story') {
    updateStoryUI();
  }

  // Screen‑specific backgrounds and sect name prompting
  // By default restore the player's chosen background and dimmer
  let handledBg = false;
    if (id === 'sect' || id === 'sect-management' || id === 'sect-forging' || id === 'dao' || id === 'sect-recruitment') {
    // Prompt for a sect name the first time the sect hub is entered after unlock.
    // Only prompt if the sect has been unlocked (stage >= 1) and a name
    // hasn't already been set.
    if (game.stage >= 1 && !game.sectName) {
      try {
        const name = prompt('Enter a name for your sect:', 'My Sect');
        if (name && name.trim()) {
          game.sectName = name.trim();
          saveGame();
        } else {
          game.sectName = 'My Sect';
          saveGame();
        }
      } catch(e) {
        // If prompt is not available (e.g. non‑browser context), default a name
        game.sectName = game.sectName || 'My Sect';
      }
    }
    // Determine which background to use based on the hall
    if (id === 'sect') {
      document.documentElement.style.setProperty('--bg-image', "url('assets/sect_background.png')");
      document.documentElement.style.setProperty('--bg-dimmer', 0.3);
      handledBg = true;
    } else if (id === 'sect-management') {
      document.documentElement.style.setProperty('--bg-image', "url('assets/backgrounds/management_hall.png')");
      document.documentElement.style.setProperty('--bg-dimmer', 0.25);
      // update hall header with sect name
      const header = document.getElementById('sect-header-management');
      if (header) header.textContent = `${game.sectName || 'Sect'} – Management Hall`;
      handledBg = true;
    } else if (id === 'sect-forging') {
      document.documentElement.style.setProperty('--bg-image', "url('assets/backgrounds/forging_hall.png')");
      document.documentElement.style.setProperty('--bg-dimmer', 0.25);
      const header = document.getElementById('sect-header-forging');
      if (header) header.textContent = `${game.sectName || 'Sect'} – Forging Hall`;
      handledBg = true;
    } else if (id === 'dao') {
      document.documentElement.style.setProperty('--bg-image', "url('assets/backgrounds/dao_hall.png')");
      document.documentElement.style.setProperty('--bg-dimmer', 0.25);
      // No header update for Dao screen because it uses its own title
      handledBg = true;
    } else if (id === 'sect-recruitment') {
      // Use the management hall background for the recruitment hall as a default.  You can replace
      // this image in the assets/backgrounds folder to customise the appearance.  A slightly
      // darker dimmer is applied for contrast.
      document.documentElement.style.setProperty('--bg-image', "url('assets/backgrounds/management_hall.png')");
      document.documentElement.style.setProperty('--bg-dimmer', 0.25);
      // update recruitment hall header with sect name
      const header = document.getElementById('sect-header-recruitment');
      if (header) header.textContent = `${game.sectName || 'Sect'} – Recruitment & Mission Hall`;
      handledBg = true;
    }
  }
  if (!handledBg) {
    // Restore the selected background and dimmer from settings when not in sect views
    applySettings();
  }
}

// Setup event listeners
function init() {
  loadGame();
  // NOTE: When loading the game, do not override the player's realm or
  // resources.  Previously we temporarily bumped the realm stage and
  // granted spiritStones during development to unlock forging for testing.
  // Those lines have been removed so that players retain their true
  // progression and stone totals on load.

  // During development we sometimes granted Spirit Stones to facilitate testing.
  // Make sure not to override the player's actual spirit stone total on load.
  // Commented out for release.  To grant stones for debugging, uncomment
  // the following line:
  // game.spiritStones = Math.max(game.spiritStones || 0, 200);
  // TEST PATCH REMOVED: do not grant resources on init in release builds.
  // Apply saved settings before rendering
  applySettings();

  // --- Internationalisation initialisation ---
  // Determine the current language from localStorage or saved game settings.
  // If none is set, show the language selection modal so the player can
  // choose their preferred language.  Otherwise apply the saved language
  // immediately.  The i18n module exposes setLanguage() and t() on the
  // global window object.  setLanguage() will persist the selection and
  // invoke applyTranslations() automatically.
  try {
    const storedLang = localStorage.getItem('gameLang');
    const currentLang = game.settings && game.settings.language;
    // Check if a language has been previously selected via localStorage or
    // persisted into the game settings.  If neither is present we show
    // the modal to ask the player for their preferred language.
    const langToUse = storedLang || currentLang;
    const langModal = document.getElementById('lang-modal');
    const langDropdown = document.getElementById('lang-select-dropdown');
    const langConfirmBtn = document.getElementById('lang-select-confirm');
    if (!langToUse) {
      if (langModal) {
        // Show modal overlay
        langModal.classList.remove('hidden');
        // Default selection to English if no language selected yet
        if (langDropdown) langDropdown.value = 'en';
        if (langConfirmBtn) {
          langConfirmBtn.addEventListener('click', () => {
            const selected = langDropdown ? langDropdown.value : 'en';
            if (typeof window.setLanguage === 'function') {
              window.setLanguage(selected);
            }
            // Hide modal after selection
            langModal.classList.add('hidden');
            // Update settings page dropdown to reflect selection
            const settingsLangSelect = document.getElementById('language-select');
            if (settingsLangSelect) settingsLangSelect.value = selected;
            // Save game state
            saveGame();
          }, { once: true });
        }
      }
    } else {
      // A language has already been chosen; apply it immediately.
      if (typeof window.setLanguage === 'function') {
        window.setLanguage(langToUse);
      }
      // Ensure the settings dropdown reflects the saved language
      const settingsLangSelect = document.getElementById('language-select');
      if (settingsLangSelect) settingsLangSelect.value = langToUse;
    }
  } catch (e) {
    // On any error just apply translations with default (English)
    try {
      if (typeof window.setLanguage === 'function') {
        window.setLanguage('en');
      }
    } catch (ignored) {}
  }
  // Keep stats banner fixed directly beneath the sticky nav by exposing its height
  try {
    const navBar = document.querySelector('.nav-bar');
    if (navBar) {
      const applyNavHeight = () => {
        const h = Math.ceil(navBar.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--nav-height', h + 'px');
      };
      applyNavHeight();
      window.addEventListener('resize', applyNavHeight);
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(applyNavHeight);
        ro.observe(navBar);
      }
    }
  } catch(e) { /* benign */ }
  recalcProduction();
  updateStatsUI();
  updateUpgradeUI();
  updateSkillUI();
  updateResearchUI();
  updateQuestUI();
  updateBountyUI();
  updateDiscipleUI();
  updateForgingUI();
  updateAscensionUI();
  updateAchLoreUI();
  updateSectUI();
  updateAscensionTreeUI();
  updateStoryUI();
  // nav
  document.querySelectorAll('.nav-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      showScreen(btn.dataset.screen);
    });
  });

  // Sect hall buttons: clicking a hall icon navigates to the corresponding
  // dedicated screen rather than toggling a tab within a single sect page.
  const sectMgmtBtn = document.getElementById('hall-management-btn');
  const sectForgeBtn = document.getElementById('hall-forging-btn');
  const sectDaoBtn = document.getElementById('hall-dao-btn');
  const sectRecruitBtn = document.getElementById('hall-recruitment-btn');
  if (sectMgmtBtn) {
    sectMgmtBtn.addEventListener('click', () => {
      showScreen('sect-management');
    });
  }
  if (sectForgeBtn) {
    sectForgeBtn.addEventListener('click', () => {
      showScreen('sect-forging');
    });
  }
  if (sectDaoBtn) {
    sectDaoBtn.addEventListener('click', () => {
      showScreen('dao');
    });
  }
  if (sectRecruitBtn) {
    sectRecruitBtn.addEventListener('click', () => {
      showScreen('sect-recruitment');
    });
  }
  // gather button on Upgrades page
  const gatherUpgradesBtn = document.getElementById('gather-btn-upgrades');
  if (gatherUpgradesBtn) {
    gatherUpgradesBtn.addEventListener('click', gatherQi);
  }
  // ascend button
  const ascendBtn = document.getElementById('ascend-btn');
  if (ascendBtn) ascendBtn.addEventListener('click', ascendLayer);
  // multi selector
  document.querySelectorAll('#upgrade-multiplier button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#upgrade-multiplier button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateUpgradeUI();
    });
  });
  // default active screen: go directly to the Story page instead of a separate home
  
  // Wire navbar buttons
  document.querySelectorAll('.nav-bar [data-screen]').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });
  // Claim-all buttons
  const claimAllQuestsBtn = document.getElementById('quest-claim-all-btn');
  if (claimAllQuestsBtn) claimAllQuestsBtn.addEventListener('click', claimAllCompletedQuests);
  const claimAllBountiesBtn = document.getElementById('bounty-claim-all-btn');
  if (claimAllBountiesBtn) claimAllBountiesBtn.addEventListener('click', claimAllCompletedBounties);
  // On initial load, start on the Story page to emphasise the narrative.
  showScreen('story');

  // After loading and showing the initial screen, check for any features
  // unlocked by the current stage and update notification indicators.  This
  // ensures that newly available screens (e.g. sect management or forging)
  // display a small exclamation mark until the player visits them.
  checkNewFeatures();
  updateNewFeatureIndicators();
  // Start the tick loop using a managed timer so that we can pause when the tab is hidden.
  function startTick() {
    if (game._tickTimer) clearInterval(game._tickTimer);
    game._tickTimer = setInterval(tick, 1000);
  }
  function stopTick() {
    if (game._tickTimer) {
      clearInterval(game._tickTimer);
      game._tickTimer = null;
    }
  }
  startTick();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTick();
    } else {
      // Run a single tick immediately to process offline gains and refresh UI
      tick();
      startTick();
    }
  });
  // The tutorial has been removed; no overlay or skip button is initialised.

  // collapse toggles for achievements and lore
  const achToggle = document.getElementById('ach-toggle');
  const loreToggle = document.getElementById('lore-toggle');
  if (achToggle) {
    achToggle.addEventListener('click', () => {
      game.achCollapsed = !game.achCollapsed;
      updateAchLoreUI();
      saveGame();
    });
  }
  if (loreToggle) {
    loreToggle.addEventListener('click', () => {
      game.loreCollapsed = !game.loreCollapsed;
      updateAchLoreUI();
      saveGame();
    });
  }

  // Collapse toggles for Cultivation sections
  const skillsToggle = document.getElementById('skills-toggle');
  const skillsList = document.getElementById('skill-list');
  if (skillsToggle && skillsList) {
    // Initialize collapsed state based on saved game value
    skillsList.classList.toggle('hidden', !!game.skillsCollapsed);
    skillsToggle.textContent = game.skillsCollapsed ? '+' : '−';
    skillsToggle.addEventListener('click', () => {
      game.skillsCollapsed = !game.skillsCollapsed;
      // Show/hide the list
      skillsList.classList.toggle('hidden', game.skillsCollapsed);
      // Update the toggle icon
      skillsToggle.textContent = game.skillsCollapsed ? '+' : '−';
      saveGame();
    });
  }
  const researchToggle = document.getElementById('research-toggle');
  const researchList = document.getElementById('research-list');
  if (researchToggle && researchList) {
    researchList.classList.toggle('hidden', !!game.researchCollapsed);
    researchToggle.textContent = game.researchCollapsed ? '+' : '−';
    researchToggle.addEventListener('click', () => {
      game.researchCollapsed = !game.researchCollapsed;
      researchList.classList.toggle('hidden', game.researchCollapsed);
      researchToggle.textContent = game.researchCollapsed ? '+' : '−';
      saveGame();
    });
  }
  // auto-send toggle
  const autoToggle = document.getElementById('auto-send-toggle');
  if (autoToggle) {
    autoToggle.checked = game.autoSend;
    autoToggle.addEventListener('change', () => {
      game.autoSend = autoToggle.checked;
      saveGame();
    });
  }

  // Hide‑locked toggles have been removed; locked content is now hidden automatically.

  // Settings toggles
  const cbColor = document.getElementById('cb-color-blind');
  const cbLarge = document.getElementById('cb-large-font');
  const cbMotion = document.getElementById('cb-reduce-motion');
  const themeSelect = document.getElementById('theme-select');
  const bgSelect = document.getElementById('bg-select');
  const resetBtn = document.getElementById('reset-game-btn');
  if (cbColor) {
    cbColor.checked = !!game.settings.colorBlind;
    cbColor.addEventListener('change', () => {
      game.settings.colorBlind = cbColor.checked;
      applySettings();
      saveGame();
    });
  }
  if (cbLarge) {
    cbLarge.checked = !!game.settings.largeFont;
    cbLarge.addEventListener('change', () => {
      game.settings.largeFont = cbLarge.checked;
      applySettings();
      saveGame();
    });
  }
  if (cbMotion) {
    cbMotion.checked = !!game.settings.reduceMotion;
    cbMotion.addEventListener('change', () => {
      game.settings.reduceMotion = cbMotion.checked;
      applySettings();
      saveGame();
    });
  }
  if (themeSelect) {
    themeSelect.value = game.settings.theme || 'dark';
    themeSelect.addEventListener('change', () => {
      game.settings.theme = themeSelect.value;
      applySettings();
      saveGame();
    });
  }

  // Language selection in settings.  When the user chooses a different
  // language from the dropdown we call the i18n setLanguage() helper and
  // persist the choice.  The initial value is set during i18n
  // initialisation in the beginning of init().
  const settingsLangSelect = document.getElementById('language-select');
  if (settingsLangSelect) {
    settingsLangSelect.addEventListener('change', () => {
      const newLang = settingsLangSelect.value;
      if (typeof window.setLanguage === 'function') {
        window.setLanguage(newLang);
      }
      // Persist the new language in the game settings for consistency
      if (game.settings) {
        game.settings.language = newLang;
      }
      saveGame();
    });
  }

  // Background selection dropdown
  if (bgSelect) {
    // default the dropdown to the saved value (cast to string because value attributes are strings)
    const idx = typeof game.settings.backgroundIndex !== 'undefined' ? game.settings.backgroundIndex : 0;
    bgSelect.value = String(idx);
    bgSelect.addEventListener('change', () => {
      const newIdx = parseInt(bgSelect.value, 10);
      if (!isNaN(newIdx)) {
        game.settings.backgroundIndex = newIdx;
        applySettings();
        saveGame();
      }
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', resetGame);
  }

  // Background dimmer slider: initialise value from settings and listen for changes
  const bgDimmerSlider = document.getElementById('bg-dimmer-slider');
  if (bgDimmerSlider) {
    const dimVal = typeof game.settings.bgDimmer !== 'undefined' ? game.settings.bgDimmer : 0;
    bgDimmerSlider.value = dimVal;
    bgDimmerSlider.addEventListener('input', () => {
      const v = parseFloat(bgDimmerSlider.value);
      if (!isNaN(v)) {
        game.settings.bgDimmer = v;
        applySettings();
        saveGame();
      }
    });
  }

  // Testing toggle for Qi per tap multiplier.  When enabled, manual Qi gains
  // are multiplied by 100 to accelerate testing.  This checkbox is not
  // visible to ordinary players but aids development and balancing.
  const cbTapMult = document.getElementById('cb-tap-mult');
  if (cbTapMult) {
    // Determine initial state from the game property: enable if multiplier > 1
    cbTapMult.checked = !!(game.qiPerTapMult && game.qiPerTapMult > 1);
    cbTapMult.addEventListener('change', () => {
      game.qiPerTapMult = cbTapMult.checked ? 100 : 1;
      // Update stats to reflect the new effective Qi per tap immediately
      updateStatsUI();
      saveGame();
    });
  }

  // Testing toggle for Qi per second multiplier.  Similar to the tap
  // multiplier, this checkbox increases passive Qi gain by a factor of 100
  // when checked.  It reads and writes the qiPerSecMult property on the
  // game object and triggers a recalculation of production so that the
  // change takes effect immediately.
  const cbPsMult = document.getElementById('cb-ps-mult');
  if (cbPsMult) {
    // Initialise the checkbox based on the current game state (>1 means enabled)
    cbPsMult.checked = !!(game.qiPerSecMult && game.qiPerSecMult > 1);
    // Disable the Qi per second multiplier toggle so it cannot be altered by the player.
    cbPsMult.disabled = true;
    // Still attach the listener for completeness, but it will never fire because the control is disabled.
    cbPsMult.addEventListener('change', () => {
      // Force the multiplier back to 1 regardless of checkbox state to avoid accidental activation.
      game.qiPerSecMult = 1;
      recalcProduction();
      updateStatsUI();
      saveGame();
    });
  }

  // Export save: copy current game state as JSON to clipboard
  const exportBtn = document.getElementById('export-save-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        const text = JSON.stringify(game);
        await navigator.clipboard.writeText(text);
        showToast('Save exported to clipboard');
      } catch (err) {
        showToast('Unable to copy save to clipboard');
      }
    });
  }
  // Import save: prompt user to paste JSON and load
  const importBtn = document.getElementById('import-save-btn');
  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      const data = prompt('Paste your save JSON here:');
      if (!data) return;
      try {
        const obj = JSON.parse(data);
        if (obj) {
          if (confirm('Importing will overwrite your current progress. Continue?')) {
            Object.assign(game, obj);
            saveGame();
            location.reload();
          }
        } else {
          showToast('Invalid save data');
        }
      } catch (e) {
        showToast('Failed to parse save data');
      }
    });
  }

  // Floating buttons: open settings screen and toggle fullscreen
  const settingsIcon = document.getElementById('settings-icon');
  if (settingsIcon) {
    settingsIcon.addEventListener('click', () => {
      // Show settings screen when the gear icon is clicked
      showScreen('settings');
    });
    // Set tooltip with last save time
    if (game.lastSaveTime) {
      const date = new Date(game.lastSaveTime);
      settingsIcon.title = 'Last saved: ' + date.toLocaleTimeString();
    }
  }
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      toggleFullScreen();
    });
  }

  
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// ===== SPRINT 1 ENHANCEMENTS =====
// Event Log UI + API, ROI/Max for upgrades, Qi/s breakdown panel, Expedition party clarity, Text/effect guardrails.
(function(){
  // --- Event Log ---
  const S1 = window.__S1 || (window.__S1 = {});
  S1.events = S1.events || [];
  S1.ui = S1.ui || {};
  function s1Now(){ return Date.now(); }
  S1.log = function(type, msg, data){
    try {
      S1.events.unshift({t:s1Now(), type, msg, data: data||null});
      if (S1.events.length>200) S1.events.pop();
      const bell = S1.ui.bell;
      if (bell){
        const count = Number(bell.getAttribute('data-count')||'0')+1;
        bell.setAttribute('data-count', String(count));
        bell.classList.add('s1-has');
      }
      if (S1.ui.drawer && S1.ui.drawer.classList.contains('open')) s1RenderEvents();
    } catch(e){ console.warn('[S1 log] error', e); }
  };
  function s1EnsureBell(){
    if (S1.ui.bell) return;
    const bell = document.createElement('button');
    bell.className = 's1-bell'; bell.title = 'Event Log'; bell.textContent = '🔔';
    bell.addEventListener('click', ()=>{
      bell.classList.remove('s1-has'); bell.removeAttribute('data-count');
      S1.ui.drawer.classList.toggle('open');
      if (S1.ui.drawer.classList.contains('open')) s1RenderEvents();
    });
    document.body.appendChild(bell);
    const drawer = document.createElement('div');
    drawer.className = 's1-drawer';
    drawer.innerHTML = '<div class="s1-drawer-head"><div>Event Log</div><button class="s1-close">✕</button></div><div class="s1-events"></div>';
    drawer.querySelector('.s1-close').addEventListener('click', ()=>drawer.classList.remove('open'));
    document.body.appendChild(drawer);
    S1.ui.bell = bell; S1.ui.drawer = drawer;
  }
  function s1RenderEvents(){
    const host = S1.ui.drawer?.querySelector('.s1-events'); if (!host) return;
    host.innerHTML = '';
    for (const e of S1.events) {
      const row = document.createElement('div');
      row.className = 's1-event';
      const dt = new Date(e.t).toLocaleString();
      // Hide the event type when it's a toast message to reduce clutter
      const typeLabel = e.type && e.type !== 'toast' ? e.type : '';
      let headerHtml = '<span class="s1-time">' + dt + '</span>';
      if (typeLabel) {
        headerHtml += '<span class="s1-type">' + typeLabel + '</span>';
      }
      row.innerHTML = '<div class="s1-row">' + headerHtml + '</div><div class="s1-msg"></div>';
      row.querySelector('.s1-msg').textContent = e.msg || '';
      host.appendChild(row);
    }
  }

  // Hook logging into key flows
  const _showToast = typeof showToast==='function' ? showToast : null;
  if (_showToast){
    window.showToast = function(m){ try{ S1.log('toast', m);}catch(e){}; return _showToast(m); };
  }
  const _startExpedition = startExpedition;
  window.startExpedition = function(type){
    S1.log('expedition_start', 'Expedition started: '+type);
    return _startExpedition(type);
  };

  const _updateExpedition = updateExpedition;
  window.updateExpedition = function(){
    const before = JSON.stringify(Object.keys(game.activeExpeditions||{}));
    _updateExpedition();
    // detect completions by diff (best-effort)
    const after = JSON.stringify(Object.keys(game.activeExpeditions||{}));
    if (before!==after) S1.log('expedition_update','Expeditions updated');
  };

  const _updateAlchemyQueue = updateAlchemyQueue;
  window.updateAlchemyQueue = function(){
    const invBefore = JSON.stringify(game.elixirInventory||{});
    _updateAlchemyQueue();
    const invAfter = JSON.stringify(game.elixirInventory||{});
    if (invBefore!==invAfter) S1.log('brew_complete','An elixir finished brewing');
  };
  const _useElixir = useElixir;
  window.useElixir = function(id){
    S1.log('elixir_used','Elixir used: '+id);
    return _useElixir(id);
  };
  const _updateForgingQueue = updateForgingQueue;
  window.updateForgingQueue = function(){
    const forgedBefore = game.artifactsForged||0;
    _updateForgingQueue();
    const forgedAfter = game.artifactsForged||0;
    if (forgedAfter>forgedBefore) S1.log('forge_complete','An artifact was forged');
  };

  // --- ROI & Max for upgrades ---
  function s1EffFactor(){
    const effLv = game.ascensionPerks?.upgradeEfficiency || 0;
    const talismanLv = game.upgrades?.originTalisman || 0;
    let eff = 1 - 0.02*effLv - 0.02*talismanLv;
    if (eff < 0.3) eff = 0.3;
    return eff;
  }
  function s1GetUpgradeDef(id){ return upgradeDefs.find(u=>u.id===id); }
  function s1GetLevel(id){ return game.upgrades[id] || 0; }
  function s1TotalCost(def, level, n){ return getUpgradeTotalCost(def, level, n) * s1EffFactor(); }
  function s1MaxAffordable(def, level, wallet){
    const r = def.costMult, a = def.baseCost*Math.pow(r, level), eff = s1EffFactor();
    const maxByCost = r===1 ? Math.floor(wallet/(a*eff)) :
      Math.floor(Math.log(1 + (wallet*(r-1))/(a*eff))/Math.log(r));
    const cap = (typeof def.maxLevel==='number') ? (def.maxLevel - level) : Infinity;
    return Math.max(0, Math.min(maxByCost, cap));
  }
  function s1SimulateDeltaQiPerSec(id, n){
    const old = s1GetLevel(id);
    const qiBefore = game.finalQiPerSec || 0;
    game.upgrades[id] = old + n;
    recalcProduction();
    const after = game.finalQiPerSec || 0;
    game.upgrades[id] = old;
    recalcProduction();
    return after - qiBefore;
  }
  function s1FmtSecs(ms){
    let s = Math.floor(ms/1000); if (s<0) s=0;
    const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = s%60;
    if (h>0) return `${h}h ${m}m ${sec}s`; if (m>0) return `${m}m ${sec}s`; return `${sec}s`;
  }
  function s1EnhanceUpgradeUI(){
    const list = document.getElementById('upgrade-list'); if (!list) return;
    const wallet = game.qi || 0;
    list.querySelectorAll('.entry').forEach(entry => {
      const buyBtn = entry.querySelector('button');
      // Extract the upgrade ID from the onClick handler e.g. buyUpgrade('meditation')
      const idMatch = entry.innerHTML.match(/buyUpgrade\(['"]([a-zA-Z0-9_]+)['"]\)/);
      if (!idMatch) return;
      const id = idMatch[1];
      const def = s1GetUpgradeDef(id); if (!def) return;
      const level = s1GetLevel(id);
      // ROI tag
      let tag = entry.querySelector('.s1-roi');
      if (!tag){ tag = document.createElement('span'); tag.className='s1-roi'; entry.appendChild(tag); }
      let delta = 0, be = '—';
      try{
        delta = s1SimulateDeltaQiPerSec(id, 1);
        const cost = s1TotalCost(def, level, 1);
        be = (delta>0) ? s1FmtSecs((cost/delta)*1000) : '—';
      }catch(e){}
      tag.textContent = `ROI: +${formatNumber(delta)} Qi/s • BE ${be}`;
      // Max button
      if (!entry.querySelector('.s1-max')){
        const maxBtn = document.createElement('button');
        maxBtn.className = 's1-max'; maxBtn.textContent = 'Max';
        maxBtn.title = 'Buy all affordable levels';
        maxBtn.addEventListener('click', ()=>{
          const n = s1MaxAffordable(def, level, game.qi||0);
          if (n>0) buyUpgrade(id, n);
        });
        entry.appendChild(maxBtn);
      }
    });
  }

  // Wrap updateUpgradeUI to inject ROI/Max
  const _updateUpgradeUI = updateUpgradeUI;
  window.updateUpgradeUI = function(){ _updateUpgradeUI(); try{s1EnhanceUpgradeUI();}catch(e){} };

  // --- Qi/s Breakdown Panel ---
  function s1UpdateBreakdown(){
    const host = document.getElementById('qi-breakdown-panel'); if (!host) return;
    const base = game.qiPerSec || 0;
    const buffs = (typeof getActiveElixirBuffs==='function') ? getActiveElixirBuffs() : {qiMult:1};
    // Try to reconstruct multipliers we can attribute
    const qiMasteryLv = game.ascensionPerks?.qiMastery || 0;
    const mastery = (1 + 0.02*qiMasteryLv);
    const layerRealm = game.layerMult || 1;
    const forgeQi = (window.forgeQiMult !== undefined ? forgeQiMult : (game.forgeQiMult||1));
    const synergy = (typeof synergyMult!=='undefined') ? synergyMult : 1; // may be lexically scoped; if not, skip
    const multQi = game.multQi || 1;

    const lines = [];
    function add(name, mult){ if (mult && isFinite(mult) && mult!==1) lines.push([name, mult]); }
    add('Qi Mult', multQi);
    add('Forging', forgeQi);
    add('Layers/Realms', layerRealm);
    add('Synergy', synergy);
    add('Ascension (Qi Mastery)', mastery);
    add('Elixirs (display)', buffs.qiMult||1);

    // Render
    host.innerHTML = '';
    const head = document.createElement('div');
    const displayQi = (game.finalQiPerSec||0) * (buffs.qiMult||1);
    head.className='s1-bd-head';
    head.innerHTML = `<div><b>Qi/s</b> now: ${formatNumber(displayQi)} (base ${formatNumber(base)})</div>`;
    host.appendChild(head);
    lines.forEach(([name, mult])=>{
      const row = document.createElement('div'); row.className='s1-bd-row';
      row.innerHTML = `<div class="s1-bd-cat">${name}</div><div class="s1-bd-mult">×${(Math.round(mult*100)/100).toLocaleString()}</div>`;
      host.appendChild(row);
    });
  }
  const _recalcProduction = recalcProduction;
  window.recalcProduction = function(){ _recalcProduction(); try{s1UpdateBreakdown();}catch(e){} };

  // Ensure breakdown updates when alchemy changes too
  const _updateStatsUI = updateStatsUI;
  window.updateStatsUI = function(){ _updateStatsUI(); try{s1UpdateBreakdown();}catch(e){} };

  // --- Expedition party clarity (on cards) ---
  // The party system has been removed.  To avoid unnecessary DOM
  // decoration and ensure backwards compatibility with existing hook calls,
  // s1DecorateExpeditions is now a no‑op.
  function s1DecorateExpeditions(){
    return;
  }
  const _updateExpeditionUI = updateExpeditionUI;
  window.updateExpeditionUI = function(){ _updateExpeditionUI(); try{s1DecorateExpeditions();}catch(e){} };

  // --- Text/effect guardrails ---
  function s1Guardrails(){
    try{
      const beast = (skillDefs||[]).find(s=>s.id==='beastTaming');
      if (beast){
        const hasMult = /5% per level.*multiplicative/i.test(beast.desc||'');
        if (!hasMult) console.warn('[S1 Guardrail] beastTaming description may not match multiplicative 5% effect.');
      }
    }catch(e){}
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    try{ s1EnsureBell(); s1Guardrails(); s1UpdateBreakdown(); }catch(e){}
  });
})();
// ===== END SPRINT 1 ENHANCEMENTS =====


// Claim all completed quests in one click
function claimAllCompletedQuests() {
  if (!game.quests) return;
  let total = 0;
  questDefs.forEach(def => {
    const q = game.quests[def.id];
    if (!q) return;
    if (q.completed) {
      total += (q.rewardVal || 0);
      // advance chain
      q.tier = (q.tier || 0) + 1;
      q.amount = def.amount * Math.pow(2, q.tier);
      q.rewardVal = Math.ceil(def.reward * Math.pow(1.5, q.tier));
      q.progress = 0;
      q.completed = false;
      q.started = false;
    }
  });
  if (total > 0) {
    game.spiritStones = (game.spiritStones || 0) + total;
    // advance tutorial once at most
    if (game.tutorial && game.tutorial.active && game.tutorial.step === 4) {
      advanceTutorial();
    }
    showToast(`Claimed ${formatNumber(total)} Spirit Stones from completed quests.`);
    updateQuestUI();
    updateStatsUI();
    saveGame();
  } else {
    showToast('No completed quests to claim.');
  }
}

// Claim all completed bounties in one click
function claimAllCompletedBounties() {
  if (!game.bounties) return;
  let totalSS = 0, totalJade = 0;
  bountyDefs.forEach(def => {
    const b = game.bounties[def.id];
    if (!b) return;
    if (b.completed) {
      totalSS += (b.reward.spiritStones || 0);
      totalJade += (b.reward.jade || 0);
      // advance chain
      b.tier = (b.tier || 0) + 1;
      b.amount = def.amount * Math.pow(2, b.tier);
      b.reward = {
        spiritStones: Math.ceil(def.reward.spiritStones * Math.pow(1.5, b.tier)),
        jade: Math.ceil(def.reward.jade * Math.pow(1.5, b.tier))
      };
      b.progress = 0;
      b.completed = false;
      b.started = false;
      game.bountiesClaimed = (game.bountiesClaimed || 0) + 1;
    }
  });
  if (totalSS > 0 || totalJade > 0) {
    game.spiritStones = (game.spiritStones || 0) + totalSS;
    game.jade = (game.jade || 0) + totalJade;
    showToast(`Claimed ${formatNumber(totalSS)} Spirit Stones and ${formatNumber(totalJade)} Jade from completed bounties.`);
    updateBountyUI();
    updateStatsUI();
    saveGame();
  } else {
    showToast('No completed bounties to claim.');
  }
}

