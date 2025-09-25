/*
 * Internationalisation (i18n) support for Cultivation World
 *
 * This module defines a set of translation strings for various user interface
 * elements in the game and exposes helper functions for looking up and
 * applying translations at runtime. The primary entry points are:
 *   - t(key, vars): returns the translated string for the current language.
 *     Optionally accepts a map of variables to interpolate into the string.
 *   - setLanguage(lang): persists the chosen language on the game settings
 *     object (if available) and into localStorage and reapplies all
 *     translations. Supported languages are English (en), French (fr),
 *     Spanish (es), Mandarin/Chinese (zh) and Hindi (hi).
 *   - applyTranslations(): traverses the document and updates the text of
 *     select UI elements such as navigation buttons, headings and labels.
 *
 * The translation data is intentionally kept limited to key UI text and
 * upgrade/research/skill names. When a key is missing in the selected
 * language the English fallback is used. Long narrative content such as
 * story text and quest descriptions remains in English to preserve the
 * original tone while keeping the translation effort manageable. Additional
 * keys can be added over time as necessary.
 */

(function () {
  // Declare supported languages. Any other value passed to setLanguage will
  // silently fall back to English.
  const supportedLanguages = ['en', 'fr', 'es', 'zh', 'hi'];

  // Translation dictionary. Keys follow a dotted notation to group related
  // strings, e.g. nav labels begin with 'nav.', upgrade names with
  // 'upgrade.', etc. Where a key is not present for a language the English
  // value is used as a fallback.
  const translations = {
    en: {
      // General
      'title': 'Cultivation Idle Game',
      'language.selectTitle': 'Select Language',
      // Navigation
      'nav.story': 'Story',
      'nav.upgrades': 'Upgrades',
      'nav.ascension': 'Ascension',
      'nav.cultivation': 'Cultivation',
      'nav.sect': 'Sect',
      'nav.codex': 'Codex',
      // Screens and headings
      'h2.upgrades': 'Upgrades',
      'p.upgrades.welcome': 'Begin your cultivation journey by meditating, viewing your stats and purchasing upgrades all in one place.',
      'btn.gather': 'Meditate to Gather Qi',
      'label.buyQuantity': 'Buy quantity:',
      'h2.cultivation': 'Cultivation',
      'p.cultivation.intro': 'Develop your cultivation by mastering techniques and conducting research. Research unlocks at Foundation Establishment (Stage 1).',
      'h3.techniques': 'Techniques',
      'h3.research': 'Research',
      'h3.alchemy': 'Alchemy',
      'disciplesExp': 'Disciples & Expeditions',
      'missionNote': 'Manage your disciples and missions here. More disciple classes and expeditions unlock as you ascend.',
      'autoSend': 'Auto‑send expeditions',
      // Disciple recruitment and training
      'recruit.title': 'Recruit Disciple',
      'recruit.cost': 'Cost: {cost} Spirit Stones',
      'btn.recruit': 'Recruit',
      'btn.train': 'Train',
      'toast.insufficientSS': 'Not enough Spirit Stones',
      'toast.recruited': 'Recruited {name}, a {class} with the {trait} trait!',
      'toast.discipleAdvanced': '{name} has advanced to Level {level}! Training cost is now {cost} SS.',
      // Settings
      'h2.settings': 'Settings',
      'label.colorBlind': 'Color‑blind mode',
      'label.largeFont': 'Large font',
      'label.reduceMotion': 'Reduce motion',
      'label.theme': 'Theme:',
      'option.theme.dark': 'Dark',
      'option.theme.light': 'Light',
      'label.background': 'Background:',
      'option.background.0': 'Nebula Purple',
      'option.background.1': 'Nebula Green',
      'option.background.2': 'Nebula Pink',
      'option.background.3': 'Nebula Ember',
      'option.background.4': 'Mountain Valley',
      'label.backgroundDimmer': 'Background dimmer:',
      'label.tapMult': 'Qi per tap ×100 (testing)',
      'label.psMult': 'Qi per second ×100 (testing)',
      'btn.exportSave': 'Export Save',
      'btn.importSave': 'Import Save',
      'btn.resetGame': 'Reset Game',
      'btn.ok': 'OK',
      // Generic button/label text
      'btn.buy': 'Buy',
      'btn.research': 'Research',
      'locked': 'Locked',
      'requires': 'Requires',
      // Realm names
      'realm.0': 'Qi Gathering',
      'realm.1': 'Foundation Establishment',
      'realm.2': 'Core Formation',
      'realm.3': 'Golden Core',
      'realm.4': 'Nascent Soul',
      'realm.5': 'Spirit Transformation',
      'realm.6': 'Immortal Ascension',
      'realm.7': 'Void Refinement',
      'realm.8': 'Celestial Tribulation',
      'realm.9': 'Divine Ascension',
      'realm.10': 'Eternal Godhood',
      // Upgrade names
      'upgrade.meditation.name': 'Meditation',
      'upgrade.breathing.name': 'Breathing Technique',
      'upgrade.spiritualRoot.name': 'Spiritual Root',
      'upgrade.meridianOpening.name': 'Meridian Opening',
      'upgrade.pillFurnace.name': 'Pill Furnace',
      'upgrade.meditationFocus.name': 'Meditation Focus',
      'upgrade.dantianExpansion.name': 'Dantian Expansion',
      'upgrade.elementalAttunement.name': 'Elemental Attunement',
      'upgrade.spiritForge.name': 'Spirit Forge',
      'upgrade.beastDen.name': 'Beast Den',
      'upgrade.talismanWorkshop.name': 'Talisman Workshop',
      'upgrade.spiritWell.name': 'Spirit Well',
      'upgrade.daoComprehension.name': 'Dao Comprehension',
      'upgrade.cosmicAlignment.name': 'Cosmic Alignment',
      'upgrade.universalResonance.name': 'Universal Resonance',
      'upgrade.soulSearch.name': 'Soul Search',
      'upgrade.ascensionTheory.name': 'Ascension Theory',
      'upgrade.temporalRift.name': 'Temporal Rift',
      'upgrade.cosmicBreath.name': 'Cosmic Breath',
      'upgrade.nebulaElixir.name': 'Nebula Elixir',
      'upgrade.galacticMining.name': 'Galactic Mining',
      'upgrade.beastRealm.name': 'Beast Realm',
      'upgrade.spiritArrayAmplification.name': 'Spirit Array Amplification',
      'upgrade.voidPierce.name': 'Void Pierce',
      'upgrade.originTalisman.name': 'Origin Talisman',
      // Research names
      'research.qiResearch.name': 'Qi Research',
      'research.herbResearch.name': 'Herb Research',
      'research.stoneResearch.name': 'Spirit Stone Research',
      'research.beastResearch.name': 'Beast Research',
      'research.jadeResearch.name': 'Jade Research',
      'research.logistics.name': 'Logistics',
      'research.alchemyResearch.name': 'Alchemy Research',
      'research.sectResearch.name': 'Sect Research',
      'research.cosmicAlignment.name': 'Cosmic Alignment',
      'research.universalResonance.name': 'Universal Resonance',
      'research.soulSearch.name': 'Soul Search',
      'research.ascensionTheory.name': 'Ascension Theory',
      'research.temporalRift.name': 'Temporal Rift',
      // Skill names
      'skill.alchemy.name': 'Alchemy',
      'skill.swordplay.name': 'Swordplay',
      'skill.bodyCultivation.name': 'Body Cultivation',
      'skill.beastTaming.name': 'Beast Taming',
      'skill.sectLeadership.name': 'Sect Leadership',
      'skill.soulRefinement.name': 'Soul Refinement',
      // Additional headings and buttons (story/ascension) and stats banner labels
      'h2.story': 'Story',
      'h2.ascension': 'Ascension & Perks',
      'btn.breakThrough': 'Break Through',
      'btn.ascendRealm': 'Ascend Realm',
      'ascension.readyToAscend': 'Ready to ascend to {realm}. Cost: {cost} Qi',
      'ascension.nextLayer': 'Next layer breakthrough requires {cost} Qi',
      'ascension.timeToTarget': 'Time to target: {mins}m {secs}s',
      // Message shown when the player is at the final realm and final layer
      'ascension.finalRealm': 'You have reached the pinnacle of cultivation. No further ascension is possible.',
      // Toast message when attempting to ascend beyond the final realm
      'toast.finalRealm': 'You have reached the pinnacle of cultivation and cannot ascend further.',
      'stat.realm': 'Realm',
      'stat.qi': 'Qi',
      'stat.qiPerTap': 'Qi per tap',
      'stat.qiPerSec': 'Qi per second',
      'stat.activeElixirs': 'Active Elixirs',
      'stat.spiritStones': 'Spirit Stones',
      'stat.herbs': 'Herbs',
      'stat.beastEnergy': 'Beast Energy',
      'stat.jade': 'Jade',
      // Additional descriptive keys for upgrades, research, skills, perks and narratives
      // Upgrade descriptions
      'upgrade.meditation.desc': 'Focus your mind to produce 5 Qi per second per level.',
      'upgrade.breathing.desc': 'Improve your breathing to gain 10 Qi per tap per level.',
      'upgrade.spiritualRoot.desc': 'Enhance your root, increasing Qi/s by 7% per level.',
      'upgrade.meridianOpening.desc': 'Open your meridians to increase Qi/s by 50% every 5 levels.',
      'upgrade.pillFurnace.desc': 'Improves herb production by 20% per level.',
      'upgrade.meditationFocus.desc': 'Raises Qi per tap by 15 per level.',
      'upgrade.dantianExpansion.desc': 'Increase Qi capacity by 10% per level.',
      'upgrade.elementalAttunement.desc': 'Boost Qi/s by 3% per level.',
      'upgrade.spiritForge.desc': 'Improve stone production by 20% per level.',
      'upgrade.beastDen.desc': 'Increase beast energy generation by 20% per level.',
      'upgrade.talismanWorkshop.desc': 'Reduce forging costs and time by 3% per level.',
      'upgrade.spiritWell.desc': 'Boost offline Qi accumulation by 5% per level.',
      'upgrade.daoComprehension.desc': 'Reduce technique costs by 3% per level.',
      'upgrade.heavenlyThunder.desc': 'Qi/s increased by 1% per level and forging buffs grow stronger.',
      'upgrade.daoistInsights.desc': 'Reduces research costs by 2% per level.',
      'upgrade.stellarComprehension.desc': 'Attune your consciousness to the movements of the stars across the endless cosmos. Each level exponentially increases Qi production by 10%, reflecting the profound secrets gleaned from celestial bodies and aligning your inner world with the universal rhythm.',
      'upgrade.cosmicBreath.desc': 'Refine your breathing by drawing in cosmic energies. Each level greatly increases Qi per tap by 80, allowing cultivators to harness the breath of the universe itself. This technique echoes the breathing patterns of ancient immortals and brings your mortal shell closer to the Dao.',
      'upgrade.nebulaElixir.desc': 'Brew elixirs infused with the essence of nebulae, expanding your dantian and enhancing herb production. Each level multiplies Qi capacity by 20% and herb generation by 10%, symbolising the vastness of the nebula within your sea of consciousness.',
      'upgrade.galacticMining.desc': 'Establish stone harvesting colonies throughout the galaxy. Each level multiplies stone production by 20%, tapping into the rich ore veins of distant planets and asteroids.',
      'upgrade.beastRealm.desc': 'Journey to the Beast Realm to tame legendary spirit beasts. Each level increases beast energy generation by 20%, reflecting the aid of mythical companions such as dragons, phoenixes and qilins.',
      'upgrade.manaPool.desc': 'Cultivate a vast mana pool within your dantian. Each level grants +50 Qi per second and +100 Qi per tap, representing the inexhaustible flow of primal energy into your cultivation base.',
      'upgrade.spiritArrayAmplification.desc': 'Deploy massive spirit arrays around your sect to channel cosmic energies. Each level multiplies Qi, herb, spirit stone and beast generation by 15%. These arrays reflect the ancient art of formation masters and turn your sect into a beacon of cultivation.',
      'upgrade.voidPierce.desc': 'Pierce through the void to harvest resources from alternate dimensions. Each level boosts herb, spirit stone and beast production by 10%, reflecting the spoils of other realms bleeding into yours.',
      'upgrade.originTalisman.desc': 'Craft talismans that resonate with the origin of Qi, subtly reducing all costs and enhancing cultivation speed. Each level increases Qi/s by 5% and reduces upgrade costs by 2%.',
      'upgrade.eternalFlame.desc': 'Ignite the eternal flame within your dantian. Each level adds 100 Qi per second and 5% more Spirit Stones on ascension, symbolising the rebirth of your cultivation base and the endless cycle of rising flame.',
      // Research descriptions
      'research.qiResearch.desc': 'Increase Qi per second by 1% per level.',
      'research.herbResearch.desc': 'Increase herb generation by 4% per level.',
      'research.stoneResearch.desc': 'Increase spirit stone generation by 4% per level.',
      'research.beastResearch.desc': 'Increase beast energy generation by 4% per level.',
      'research.jadeResearch.desc': 'Reduce technique costs by 2% per level.',
      'research.logistics.desc': 'Reduce expedition durations and increase rewards by 0.5% per level.',
      'research.alchemyResearch.desc': 'Increases elixir potency and Qi/s by 1% per level.',
      'research.sectResearch.desc': 'Increases disciple output by 0.5% per level.',
      'research.cosmicAlignment.desc': 'Align your internal energies with the cosmic ley lines. Each level increases both Qi per second and Qi per tap by 2%. As your cultivation resonates with the universe, every breath draws in stardust and every heartbeat echoes the pulse of galaxies.',
      'research.universalResonance.desc': 'Harmonise with the vibrations of the entire universe. Each level amplifies all resource production (herbs, spiritStones, beasts, and jade) by 5%. This research reflects the subtle interplay between all forms of energy and matter.',
      'research.soulSearch.desc': 'Dive deep into the sea of your soul to uncover hidden potentials. Each level increases Spirit Stone rewards from ascension by 5%. The greater your insight, the richer the rewards drawn from your inner world.',
      'research.ascensionTheory.desc': 'Study the mechanics of ascension itself. Each level reduces the Qi requirement for each layer and realm breakthrough by 2%, easing the path toward greater heights.',
      'research.temporalRift.desc': 'Tear open rifts in time to extend how long you can cultivate offline. Each level adds one hour to the offline progress cap, allowing your cultivation to continue even when you step away from the mortal world.',
      // Skill descriptions
      'skill.alchemy.desc': 'Brew elixirs to temporarily boost Qi production.',
      'skill.swordplay.desc': 'Master sword techniques to increase Qi per tap by 50 per level.',
      'skill.bodyCultivation.desc': 'Strengthen your body to increase Qi per second by 5% per level.',
      'skill.beastTaming.desc': 'Learn to tame spirit beasts, increasing beast energy by 5% per level (multiplicative).',
      'skill.sectLeadership.desc': 'Increases disciple Qi output by 50% per level.',
      'skill.soulRefinement.desc': 'Increase Spirit Stone rewards from ascension by 10% per level.',
      // Perk names and descriptions for ascension tree
      'perk.qiMastery.name': 'Qi Mastery',
      'perk.qiMastery.desc': 'Increases all Qi/s by 2% per level.',
      'perk.upgradeEfficiency.name': 'Upgrade Efficiency',
      'perk.upgradeEfficiency.desc': 'Reduces upgrade costs by 2% per level.',
      'perk.resourceProficiency.name': 'Resource Proficiency',
      'perk.resourceProficiency.desc': 'Increases herb, spirit stone and beast production by 2% per level.',
      'perk.forgeMastery.name': 'Forge Mastery',
      'perk.forgeMastery.desc': 'Reduces forging cost and time by 2% per level.',
      // Sect hub and hall labels/descriptions
      'card.brewing': 'Brewing',
      'card.elixirInventory': 'Elixir Inventory',
      'hall.management': 'Management',
      'hall.forging': 'Forging',
      'hall.dao': 'Dao Attainment',
      'hall.recruitment': 'Recruitment & Mission',
      'p.sectIntro': 'Visit the halls of your sect to manage buildings, forge artifacts, recruit disciples, or progress on your path to enlightenment.',
      'p.managementIntro': 'Expand your sect by upgrading buildings that produce resources. Buildings unlock as you ascend realms.',
      'p.forgingIntro': 'Forge powerful artifacts to bolster your sect’s might. Forging unlocks at Golden Core (Stage 3).',
      'p.daoHallIntro': 'Aim for the peak and receive sect rewards for your progress in the Immortal Dao.',
      'p.recruitIntro': 'Recruit disciples and send them on expeditions to gather herbs, spirit stones, beasts and jade. Enable Auto‑send to dispatch expeditions automatically when available.',
      'p.forgingPlaceholder': 'Forging unlocks at Golden Core (Stage 3).',
      // Forging UI labels
      'forging.cost': 'Cost: {cost} spiritStones',
      'forging.time': 'Time: {time}s',
      'forging.queueHeader': 'Forging Queue',
      'forging.remaining': '{time}s remaining',
      'btn.forge': 'Forge',
      'btn.full': 'Full',
      'btn.locked': 'Locked',
      // Artifact names and descriptions for forging
      'artifact.qiTalisman.name': 'Qi Talisman',
      'artifact.qiTalisman.desc': 'Increases Qi/s by {percent}',
      'artifact.herbTalisman.name': 'Herbal Charm',
      'artifact.herbTalisman.desc': 'Increases herb production by {percent}',
      'artifact.stoneTalisman.name': 'Stone Sigil',
      'artifact.stoneTalisman.desc': 'Increases spirit stone production by {percent}',
      'artifact.beastTalisman.name': 'Beast Totem',
      'artifact.beastTalisman.desc': 'Increases beast energy production by {percent}',
      'artifact.fortuneCharm.name': 'Fortune Charm',
      'artifact.fortuneCharm.desc': 'Reduces expedition failure chance by {percent}',
      // Toast messages related to forging
      'toast.forgingSlotsFull': 'All forging slots are currently in use',
      'toast.notEnoughSpiritStones2': 'Not enough Spirit Stones',
      'forging.inProgress': 'Forging {name}',
      'toast.startedForging': '{name} started forging!',
      'toast.forgingUnlocked': 'Forging unlocked! The forge within your sect is now available.',
      // Additional labels
      'label.ascensionPoints': 'Ascension Points',
      // Ascension introduction paragraph
      'p.ascension.intro': 'Break through layers to ascend: each layer grants a 2% multiplier, and after nine layers you may ascend to a higher realm. Ascending to a new realm provides a 10% multiplier. Ascending requires herbs, spirit stones, beast energy and jade, so manage your resources wisely. Use the Ascension Points (AP) you earn to unlock powerful perks in the tree below.',
      // Story introduction paragraphs
      'p.story.intro1': 'After passing away in a mundane world, you awaken in a realm governed by cultivation. A mysterious voice bestows upon you a guiding artifact to aid your journey. Through meditation, refining your techniques and directing disciples you advance your cultivation base.',
      'p.story.intro2': 'As the story begins, you are a novice cultivator at the Qi Gathering stage. Through relentless practice you collect ambient Qi, open your meridians and strengthen your dantian. With each breakthrough you gain deeper insight into the Dao and are rewarded with Spirit Stones, the currency of this world. Completing quests and bounties, you meet fellow cultivators and recruit disciples to aid your journey.',
      'p.story.intro3': 'Upon establishing your Foundation, you unlock the secrets of research and alchemy. Your sect grows from a humble abode into a thriving institution with herb gardens, spirit mines and beast pens. Disciples embark on expeditions to gather rare ingredients while you forge artifacts to augment your power. The ascension system resets your Qi, but each realm ascended brings exponential strength and new possibilities.',
      'p.story.intro4': 'Ultimately, this journey chronicles your rise from a reincarnated mortal to an immortal sovereign. The choices you make — which skills to learn, which research to prioritise, how to lead your sect — determine how swiftly you soar to the peak of existence. May your cultivation be smooth, and may you one day transcend the final tribulation to attain Eternal Godhood.',
    },
    fr: {
      'title': 'Jeu Idle de Cultivation',
      'language.selectTitle': 'Choisissez la langue',
      'nav.story': 'Histoire',
      'nav.upgrades': 'Améliorations',
      'nav.ascension': 'Ascension',
      'nav.cultivation': 'Cultivation',
      'nav.sect': 'Secte',
      'nav.codex': 'Codex',
      'h2.upgrades': 'Améliorations',
      'p.upgrades.welcome': 'Commencez votre voyage de cultivation en méditant, en visualisant vos statistiques et en achetant des améliorations au même endroit.',
      'btn.gather': 'Méditer pour récolter du Qi',
      'label.buyQuantity': 'Quantité d\'achat:',
      'h2.cultivation': 'Cultivation',
      'p.cultivation.intro': 'Développez votre cultivation en maîtrisant des techniques et en menant des recherches. La recherche se débloque à l\'Établissement de la Fondation (Niveau 1).',
      'h3.techniques': 'Techniques',
      'h3.research': 'Recherche',
      'h3.alchemy': 'Alchimie',
      'disciplesExp': 'Disciples et Expéditions',
      'missionNote': 'Gérez vos disciples et missions ici. Davantage de classes de disciples et d\'expéditions se débloquent au fil de votre ascension.',
      'autoSend': 'Envoi automatique des expéditions',
      // Disciple recruitment and training
      'recruit.title': 'Recruter un disciple',
      'recruit.cost': 'Coût : {cost} pierres d\'esprit',
      'btn.recruit': 'Recruter',
      'btn.train': 'Entraîner',
      'toast.insufficientSS': 'Pas assez de pierres d\'esprit',
      'toast.recruited': 'Recruté {name}, un {class} avec le trait {trait} !',
      'toast.discipleAdvanced': '{name} est passé au niveau {level} ! Le coût d\'entraînement est maintenant de {cost} pierres d\'esprit.',
      'h2.settings': 'Paramètres',
      'label.colorBlind': 'Mode daltonien',
      'label.largeFont': 'Grande police',
      'label.reduceMotion': 'Réduire les animations',
      'label.theme': 'Thème :',
      'option.theme.dark': 'Sombre',
      'option.theme.light': 'Clair',
      'label.background': 'Fond :',
      'option.background.0': 'Nébuleuse violette',
      'option.background.1': 'Nébuleuse verte',
      'option.background.2': 'Nébuleuse rose',
      'option.background.3': 'Nébuleuse braise',
      'option.background.4': 'Vallée montagneuse',
      'label.backgroundDimmer': 'Atténuation du fond :',
      'label.tapMult': 'Qi par tap ×100 (test)',
      'label.psMult': 'Qi par seconde ×100 (test)',
      'btn.exportSave': 'Exporter la sauvegarde',
      'btn.importSave': 'Importer la sauvegarde',
      'btn.resetGame': 'Réinitialiser le jeu',
      'btn.ok': 'OK',
      'btn.buy': 'Acheter',
      'btn.research': 'Rechercher',
      'locked': 'Verrouillé',
      'requires': 'Nécessite',
      'realm.0': 'Récolte de Qi',
      'realm.1': 'Établissement de la Fondation',
      'realm.2': 'Formation du Noyau',
      'realm.3': 'Noyau Doré',
      'realm.4': 'Âme Naissante',
      'realm.5': 'Transformation Spirituelle',
      'realm.6': 'Ascension Immortelle',
      'realm.7': 'Raffinement du Vide',
      'realm.8': 'Tribulation Céleste',
      'realm.9': 'Ascension Divine',
      'realm.10': 'Divinité Éternelle',
      'upgrade.meditation.name': 'Méditation',
      'upgrade.breathing.name': 'Technique de respiration',
      'upgrade.spiritualRoot.name': 'Racine spirituelle',
      'upgrade.meridianOpening.name': 'Ouverture des méridiens',
      'upgrade.pillFurnace.name': 'Fourneau à pilules',
      'upgrade.meditationFocus.name': 'Concentration de méditation',
      'upgrade.dantianExpansion.name': 'Expansion du dantian',
      'upgrade.elementalAttunement.name': 'Harmonisation élémentaire',
      'upgrade.spiritForge.name': 'Forge spirituelle',
      'upgrade.beastDen.name': 'Antre des bêtes',
      'upgrade.talismanWorkshop.name': 'Atelier de talismans',
      'upgrade.spiritWell.name': 'Puits spirituel',
      'upgrade.daoComprehension.name': 'Compréhension du Dao',
      'upgrade.cosmicAlignment.name': 'Alignement cosmique',
      'upgrade.universalResonance.name': 'Résonance universelle',
      'upgrade.soulSearch.name': 'Recherche d\'âme',
      'upgrade.ascensionTheory.name': 'Théorie de l\'ascension',
      'upgrade.temporalRift.name': 'Faille temporelle',
      'upgrade.cosmicBreath.name': 'Souffle cosmique',
      'upgrade.nebulaElixir.name': 'Élixir de nébuleuse',
      'upgrade.galacticMining.name': 'Exploitation galactique',
      'upgrade.beastRealm.name': 'Royaume des bêtes',
      'upgrade.spiritArrayAmplification.name': 'Amplification de l\'array spirituel',
      'upgrade.voidPierce.name': 'Percée du vide',
      'upgrade.originTalisman.name': 'Talisman d\'origine',
      'research.qiResearch.name': 'Recherche de Qi',
      'research.herbResearch.name': 'Recherche d\'herbes',
      'research.stoneResearch.name': 'Recherche de pierres spirituelles',
      'research.beastResearch.name': 'Recherche sur les bêtes',
      'research.jadeResearch.name': 'Recherche de jade',
      'research.logistics.name': 'Logistique',
      'research.alchemyResearch.name': 'Recherche en alchimie',
      'research.sectResearch.name': 'Recherche de secte',
      'research.cosmicAlignment.name': 'Alignement cosmique',
      'research.universalResonance.name': 'Résonance universelle',
      'research.soulSearch.name': 'Recherche d\'âme',
      'research.ascensionTheory.name': 'Théorie de l\'ascension',
      'research.temporalRift.name': 'Faille temporelle',
      'skill.alchemy.name': 'Alchimie',
      'skill.swordplay.name': 'Escrime',
      'skill.bodyCultivation.name': 'Cultivation corporelle',
      'skill.beastTaming.name': 'Dressage de bêtes',
      'skill.sectLeadership.name': 'Leadership de secte',
      'skill.soulRefinement.name': 'Raffinement de l\'âme',
      // Additional headings and buttons (story/ascension) and stats banner labels
      'h2.story': 'Histoire',
      'h2.ascension': 'Ascension et Avantages',
      'btn.breakThrough': 'Percée',
      'btn.ascendRealm': 'Ascension de royaume',
      'ascension.readyToAscend': 'Prêt à ascendre au {realm}. Coût : {cost} Qi',
      'ascension.nextLayer': 'La prochaine percée de couche requiert {cost} Qi',
      'ascension.timeToTarget': 'Temps restant : {mins}m {secs}s',
      // Message affiché lorsque le joueur atteint le royaume final et la dernière couche
      'ascension.finalRealm': 'Vous avez atteint le sommet de la cultivation. Aucune ascension supplémentaire n\'est possible.',
      // Message toast lorsque l\'on tente d\'ascendre au‑delà du dernier royaume
      'toast.finalRealm': 'Vous avez atteint le sommet de la cultivation et ne pouvez pas ascendre davantage.',
      'stat.realm': 'Royaume',
      'stat.qi': 'Qi',
      'stat.qiPerTap': 'Qi par tap',
      'stat.qiPerSec': 'Qi par seconde',
      'stat.activeElixirs': 'Élixirs actifs',
      'stat.spiritStones': 'Pierres spirituelles',
      'stat.herbs': 'Herbes',
      'stat.beastEnergy': 'Énergie bestiale',
      'stat.jade': 'Jade',
      // Descriptions supplémentaires pour les améliorations, recherches, compétences, avantages et récits
      // Descriptions des améliorations
      'upgrade.meditation.desc': 'Concentrez votre esprit pour produire 5 Qi par seconde et par niveau.',
      'upgrade.breathing.desc': 'Améliorez votre respiration pour gagner 10 Qi par tap par niveau.',
      'upgrade.spiritualRoot.desc': 'Améliorez votre racine, augmentant le Qi/s de 7 % par niveau.',
      'upgrade.meridianOpening.desc': 'Ouvrez vos méridiens pour augmenter le Qi/s de 50 % tous les 5 niveaux.',
      'upgrade.pillFurnace.desc': 'Améliore la production d’herbes de 20 % par niveau.',
      'upgrade.meditationFocus.desc': 'Augmente le Qi par tap de 15 par niveau.',
      'upgrade.dantianExpansion.desc': 'Augmentez la capacité de Qi de 10 % par niveau.',
      'upgrade.elementalAttunement.desc': 'Augmente le Qi/s de 3 % par niveau.',
      'upgrade.spiritForge.desc': 'Améliore la production de pierres spirituelles de 20 % par niveau.',
      'upgrade.beastDen.desc': 'Augmente la génération d’énergie bestiale de 20 % par niveau.',
      'upgrade.talismanWorkshop.desc': 'Réduit les coûts et le temps de forgeage de 3 % par niveau.',
      'upgrade.spiritWell.desc': 'Augmente l’accumulation hors ligne de Qi de 5 % par niveau.',
      'upgrade.daoComprehension.desc': 'Réduit les coûts des techniques de 3 % par niveau.',
      'upgrade.heavenlyThunder.desc': 'Le Qi/s augmente de 1 % par niveau et les bonus de forge deviennent plus puissants.',
      'upgrade.daoistInsights.desc': 'Réduit les coûts de recherche de 2 % par niveau.',
      'upgrade.stellarComprehension.desc': 'Accordez votre conscience aux mouvements des étoiles à travers le cosmos infini. Chaque niveau augmente exponentiellement la production de Qi de 10 %, reflétant les secrets profonds glanés des corps célestes et alignant votre monde intérieur avec le rythme universel.',
      'upgrade.cosmicBreath.desc': 'Affinez votre respiration en absorbant les énergies cosmiques. Chaque niveau augmente considérablement le Qi par tap de 80, permettant aux cultivateurs d’exploiter la respiration de l’univers lui-même. Cette technique reflète les rythmes des anciens immortels et rapproche votre corps mortel du Dao.',
      'upgrade.nebulaElixir.desc': 'Brassez des élixirs infusés de l’essence des nébuleuses, agrandissant votre dantian et augmentant la production d’herbes. Chaque niveau multiplie la capacité de Qi de 20 % et la génération d’herbes de 10 %, symbolisant l’immensité de la nébuleuse dans votre mer de conscience.',
      'upgrade.galacticMining.desc': 'Établissez des colonies d’extraction de pierres à travers la galaxie. Chaque niveau multiplie la production de pierres de 20 %, exploitant les riches veines de minerai des planètes et astéroïdes lointains.',
      'upgrade.beastRealm.desc': 'Voyagez au Royaume des Bêtes pour dompter des esprits légendaires. Chaque niveau augmente la génération d’énergie bestiale de 20 %, reflétant l’aide de compagnons mythiques comme les dragons, les phénix et les qilins.',
      'upgrade.manaPool.desc': 'Cultivez un vaste bassin de mana dans votre dantian. Chaque niveau accorde +50 Qi par seconde et +100 Qi par tap, représentant le flux inépuisable d’énergie primordiale dans votre base de cultivation.',
      'upgrade.spiritArrayAmplification.desc': 'Déployez d’immenses arrays spirituels autour de votre secte pour canaliser les énergies cosmiques. Chaque niveau multiplie la génération de Qi, d’herbes, de pierres spirituelles et d’énergie bestiale de 15 %. Ces arrays reflètent l’art ancien des maîtres de formation et transforment votre secte en un phare de cultivation.',
      'upgrade.voidPierce.desc': 'Percez le vide pour récolter des ressources depuis des dimensions parallèles. Chaque niveau augmente de 10 % la production d’herbes, de pierres spirituelles et d’énergie bestiale, reflétant le butin d’autres royaumes qui se déverse dans le vôtre.',
      'upgrade.originTalisman.desc': 'Forgez des talismans qui résonnent avec l’origine du Qi, réduisant subtilement tous les coûts et accélérant la cultivation. Chaque niveau augmente le Qi/s de 5 % et réduit les coûts des améliorations de 2 %.',
      'upgrade.eternalFlame.desc': 'Allumez la flamme éternelle dans votre dantian. Chaque niveau ajoute 100 Qi par seconde et 5 % de pierres spirituelles supplémentaires lors de l’ascension, symbolisant la renaissance de votre base de cultivation et le cycle sans fin de la flamme montante.',
      // Descriptions des recherches
      'research.qiResearch.desc': 'Augmente le Qi par seconde de 1 % par niveau.',
      'research.herbResearch.desc': 'Augmente la génération d’herbes de 4 % par niveau.',
      'research.stoneResearch.desc': 'Augmente la génération de pierres spirituelles de 4 % par niveau.',
      'research.beastResearch.desc': 'Augmente la génération d’énergie bestiale de 4 % par niveau.',
      'research.jadeResearch.desc': 'Réduit les coûts des techniques de 2 % par niveau.',
      'research.logistics.desc': 'Réduit la durée des expéditions et augmente les récompenses de 0,5 % par niveau.',
      'research.alchemyResearch.desc': 'Augmente la puissance des élixirs et le Qi/s de 1 % par niveau.',
      'research.sectResearch.desc': 'Augmente la production des disciples de 0,5 % par niveau.',
      'research.cosmicAlignment.desc': 'Alignez vos énergies internes avec les lignes ley cosmiques. Chaque niveau augmente à la fois le Qi par seconde et le Qi par tap de 2 %. Au fur et à mesure que votre cultivation résonne avec l’univers, chaque respiration attire la poussière d’étoiles et chaque battement de cœur reflète le pouls des galaxies.',
      'research.universalResonance.desc': 'Harmonisez-vous avec les vibrations de l’univers entier. Chaque niveau amplifie toute production de ressources (herbes, pierres spirituelles, énergie bestiale et jade) de 5 %. Cette recherche reflète la subtile interaction entre toutes les formes d’énergie et de matière.',
      'research.soulSearch.desc': 'Plongez profondément dans la mer de votre âme pour découvrir des potentiels cachés. Chaque niveau augmente les récompenses de pierres spirituelles à l’ascension de 5 %. Plus votre insight est grand, plus les récompenses tirées de votre monde intérieur sont riches.',
      'research.ascensionTheory.desc': 'Étudiez les mécanismes de l’ascension elle-même. Chaque niveau réduit de 2 % l’exigence de Qi pour chaque couche et percée de royaume, facilitant la voie vers de plus grandes hauteurs.',
      'research.temporalRift.desc': 'Déchirez des failles temporelles pour prolonger la durée de votre cultivation hors ligne. Chaque niveau ajoute une heure au plafond de progression hors ligne, permettant à votre cultivation de continuer même lorsque vous vous éloignez du monde mortel.',
      // Descriptions des compétences
      'skill.alchemy.desc': 'Brassez des élixirs pour augmenter temporairement la production de Qi.',
      'skill.swordplay.desc': 'Maîtrisez des techniques d’épée pour augmenter le Qi par tap de 50 par niveau.',
      'skill.bodyCultivation.desc': 'Renforcez votre corps pour augmenter le Qi par seconde de 5 % par niveau.',
      'skill.beastTaming.desc': 'Apprenez à dompter les bêtes spirituelles, augmentant l’énergie bestiale de 5 % par niveau (multiplicatif).',
      'skill.sectLeadership.desc': 'Augmente la production de Qi des disciples de 50 % par niveau.',
      'skill.soulRefinement.desc': 'Augmente les récompenses de pierres spirituelles à l’ascension de 10 % par niveau.',
      // Noms et descriptions des avantages
      'perk.qiMastery.name': 'Maîtrise du Qi',
      'perk.qiMastery.desc': 'Augmente tout le Qi/s de 2 % par niveau.',
      'perk.upgradeEfficiency.name': 'Efficacité des améliorations',
      'perk.upgradeEfficiency.desc': 'Réduit les coûts des améliorations de 2 % par niveau.',
      'perk.resourceProficiency.name': 'Maîtrise des ressources',
      'perk.resourceProficiency.desc': 'Augmente la production d’herbes, de pierres spirituelles et d’énergie bestiale de 2 % par niveau.',
      'perk.forgeMastery.name': 'Maîtrise de la forge',
      'perk.forgeMastery.desc': 'Réduit le coût et le temps de forgeage de 2 % par niveau.',
      // Sect hub and hall labels/descriptions
      'card.brewing': 'Brassage',
      'card.elixirInventory': 'Inventaire d’élixirs',
      'hall.management': 'Gestion',
      'hall.forging': 'Forge',
      'hall.dao': 'Attainment du Dao',
      'hall.recruitment': 'Recrutement & Mission',
      'p.sectIntro': 'Visitez les halls de votre secte pour gérer les bâtiments, forger des artefacts, recruter des disciples ou progresser sur votre voie vers l’illumination.',
      'p.managementIntro': 'Développez votre secte en améliorant des bâtiments qui produisent des ressources. Les bâtiments se débloquent à mesure que vous atteignez de nouveaux royaumes.',
      'p.forgingIntro': 'Forgez des artefacts puissants pour renforcer votre secte. La forge se débloque au Noyau Doré (Stage 3).',
      'p.daoHallIntro': 'Visez le sommet et recevez des récompenses de secte pour vos progrès dans le Dao immortel.',
      'p.recruitIntro': 'Recrutez des disciples et envoyez‑les en expédition pour récolter herbes, pierres spirituelles, bêtes et jade. Activez l’envoi automatique pour dépêcher des expéditions dès qu’elles sont disponibles.',
      'p.forgingPlaceholder': 'La forge se débloque au Noyau Doré (Stage 3).',
      // Forging UI labels
      'forging.cost': 'Coût : {cost} pierres spirituelles',
      'forging.time': 'Temps : {time}s',
      'forging.queueHeader': 'File de forgeage',
      'forging.remaining': '{time}s restantes',
      'btn.forge': 'Forger',
      'btn.full': 'Complet',
      'btn.locked': 'Verrouillé',
      // Artifact names and descriptions for forging
      'artifact.qiTalisman.name': 'Talisman de Qi',
      'artifact.qiTalisman.desc': 'Augmente le Qi/s de {percent}',
      'artifact.herbTalisman.name': 'Charme d’herbes',
      'artifact.herbTalisman.desc': 'Augmente la production d’herbes de {percent}',
      'artifact.stoneTalisman.name': 'Sigil de pierre',
      'artifact.stoneTalisman.desc': 'Augmente la production de pierres spirituelles de {percent}',
      'artifact.beastTalisman.name': 'Totem de bête',
      'artifact.beastTalisman.desc': 'Augmente la production d’énergie bestiale de {percent}',
      'artifact.fortuneCharm.name': 'Charme de Fortune',
      'artifact.fortuneCharm.desc': 'Réduit la chance d’échec d’expédition de {percent}',
      // Toast messages related to forging
      'toast.forgingSlotsFull': 'Tous les emplacements de forge sont actuellement utilisés',
      'toast.notEnoughSpiritStones2': 'Pas assez de pierres spirituelles',
      'forging.inProgress': 'Forge de {name}',
      'toast.startedForging': '{name} commence à forger !',
      'toast.forgingUnlocked': 'Forge débloquée ! La forge de votre secte est maintenant disponible.',
      // Libellé supplémentaire
      'label.ascensionPoints': 'Points d’ascension',
      // Introduction de l’ascension
      'p.ascension.intro': 'Percez les couches pour ascendre : chaque couche accorde un multiplicateur de 2 %, et après neuf couches vous pouvez ascendre à un royaume supérieur. L’ascension vers un nouveau royaume fournit un multiplicateur de 10 %. L’ascension nécessite des herbes, des pierres spirituelles, de l’énergie bestiale et du jade ; gérez donc vos ressources judicieusement. Utilisez les Points d’Ascension (PA) que vous gagnez pour débloquer de puissants avantages dans l’arbre ci-dessous.',
      // Paragraphes d’introduction de l’histoire
      'p.story.intro1': 'Après être décédé dans un monde banal, vous vous réveillez dans un royaume gouverné par la cultivation. Une voix mystérieuse vous confie un artefact pour guider votre voyage. Par la méditation, l’affinement de vos techniques et la direction de disciples, vous développez votre base de cultivation.',
      'p.story.intro2': 'Au début de l’histoire, vous êtes un novice au stade de Récolte de Qi. Par une pratique incessante, vous recueillez le Qi ambiant, ouvrez vos méridiens et fortifiez votre dantian. À chaque percée, vous obtenez une compréhension plus profonde du Dao et êtes récompensé par des Pierres spirituelles, la monnaie de ce monde. En accomplissant des quêtes et des primes, vous rencontrez d’autres cultivateurs et recrutez des disciples pour vous aider dans votre voyage.',
      'p.story.intro3': 'Après avoir établi votre Fondation, vous débloquez les secrets de la recherche et de l’alchimie. Votre secte passe d’un humble abri à une institution florissante dotée de jardins d’herbes, de mines d’esprits et de parcs à bêtes. Les disciples partent en expédition pour collecter des ingrédients rares pendant que vous forgez des artefacts pour augmenter votre puissance. Le système d’ascension réinitialise votre Qi, mais chaque royaume ascendu apporte une force exponentielle et de nouvelles possibilités.',
      'p.story.intro4': 'En fin de compte, ce voyage raconte votre ascension d’un mortel réincarné à un souverain immortel. Les choix que vous faites — quelles compétences apprendre, quelles recherches privilégier, comment diriger votre secte — déterminent la rapidité avec laquelle vous atteignez le sommet de l’existence. Puissiez-vous avoir une cultivation harmonieuse, et qu’un jour vous transcendiez la tribulation finale pour atteindre la Divinité Éternelle.',
    },
    es: {
      'title': 'Juego ocioso de Cultivo',
      'language.selectTitle': 'Seleccione idioma',
      'nav.story': 'Historia',
      'nav.upgrades': 'Mejoras',
      'nav.ascension': 'Ascensión',
      'nav.cultivation': 'Cultivo',
      'nav.sect': 'Secta',
      'nav.codex': 'Códice',
      'h2.upgrades': 'Mejoras',
      'p.upgrades.welcome': 'Comienza tu viaje de cultivo meditando, viendo tus estadísticas y comprando mejoras en un solo lugar.',
      'btn.gather': 'Meditar para recolectar Qi',
      'label.buyQuantity': 'Cantidad a comprar:',
      'h2.cultivation': 'Cultivo',
      'p.cultivation.intro': 'Desarrolla tu cultivo dominando técnicas y realizando investigaciones. La investigación se desbloquea en el Establecimiento de la Fundación (Etapa 1).',
      'h3.techniques': 'Técnicas',
      'h3.research': 'Investigación',
      'h3.alchemy': 'Alquimia',
      'disciplesExp': 'Discípulos y Expediciones',
      'missionNote': 'Gestiona aquí tus discípulos y misiones. Más clases de discípulos y expediciones se desbloquean a medida que asciendes.',
      'autoSend': 'Enviar expediciones automáticamente',
      // Disciple recruitment and training
      'recruit.title': 'Reclutar discípulo',
      'recruit.cost': 'Costo: {cost} piedras espirituales',
      'btn.recruit': 'Reclutar',
      'btn.train': 'Entrenar',
      'toast.insufficientSS': 'No hay suficientes piedras espirituales',
      'toast.recruited': '¡Se reclutó a {name}, un {class} con el rasgo {trait}!',
      'toast.discipleAdvanced': '¡{name} ha subido al nivel {level}! El costo de entrenamiento ahora es {cost} piedras espirituales.',
      'h2.settings': 'Ajustes',
      'label.colorBlind': 'Modo daltonismo',
      'label.largeFont': 'Fuente grande',
      'label.reduceMotion': 'Reducir movimiento',
      'label.theme': 'Tema:',
      'option.theme.dark': 'Oscuro',
      'option.theme.light': 'Claro',
      'label.background': 'Fondo:',
      'option.background.0': 'Nébula púrpura',
      'option.background.1': 'Nébula verde',
      'option.background.2': 'Nébula rosa',
      'option.background.3': 'Nébula brasa',
      'option.background.4': 'Valle montañoso',
      'label.backgroundDimmer': 'Atenuación del fondo:',
      'label.tapMult': 'Qi por toque ×100 (prueba)',
      'label.psMult': 'Qi por segundo ×100 (prueba)',
      'btn.exportSave': 'Exportar partida',
      'btn.importSave': 'Importar partida',
      'btn.resetGame': 'Reiniciar juego',
      'btn.ok': 'OK',
      'btn.buy': 'Comprar',
      'btn.research': 'Investigar',
      'locked': 'Bloqueado',
      'requires': 'Requiere',
      'realm.0': 'Recolección de Qi',
      'realm.1': 'Establecimiento de Fundación',
      'realm.2': 'Formación del Núcleo',
      'realm.3': 'Núcleo Dorado',
      'realm.4': 'Alma Naciente',
      'realm.5': 'Transformación Espiritual',
      'realm.6': 'Ascensión Inmortal',
      'realm.7': 'Refinamiento del Vacío',
      'realm.8': 'Tribulación Celestial',
      'realm.9': 'Ascensión Divina',
      'realm.10': 'Divinidad Eterna',
      'upgrade.meditation.name': 'Meditación',
      'upgrade.breathing.name': 'Técnica de respiración',
      'upgrade.spiritualRoot.name': 'Raíz espiritual',
      'upgrade.meridianOpening.name': 'Apertura de meridianos',
      'upgrade.pillFurnace.name': 'Horno de píldoras',
      'upgrade.meditationFocus.name': 'Foco de meditación',
      'upgrade.dantianExpansion.name': 'Expansión del dantian',
      'upgrade.elementalAttunement.name': 'Ajuste elemental',
      'upgrade.spiritForge.name': 'Forja espiritual',
      'upgrade.beastDen.name': 'Guarida de bestias',
      'upgrade.talismanWorkshop.name': 'Taller de talismanes',
      'upgrade.spiritWell.name': 'Pozo espiritual',
      'upgrade.daoComprehension.name': 'Comprensión del Dao',
      'upgrade.cosmicAlignment.name': 'Alineamiento cósmico',
      'upgrade.universalResonance.name': 'Resonancia universal',
      'upgrade.soulSearch.name': 'Búsqueda del alma',
      'upgrade.ascensionTheory.name': 'Teoría de la Ascensión',
      'upgrade.temporalRift.name': 'Grieta temporal',
      'upgrade.cosmicBreath.name': 'Aliento cósmico',
      'upgrade.nebulaElixir.name': 'Elixir de nebulosa',
      'upgrade.galacticMining.name': 'Minería galáctica',
      'upgrade.beastRealm.name': 'Reino bestia',
      'upgrade.spiritArrayAmplification.name': 'Amplificación de matriz espiritual',
      'upgrade.voidPierce.name': 'Perforación del vacío',
      'upgrade.originTalisman.name': 'Talismán del origen',
      'research.qiResearch.name': 'Investigación de Qi',
      'research.herbResearch.name': 'Investigación de hierbas',
      'research.stoneResearch.name': 'Investigación de piedras espirituales',
      'research.beastResearch.name': 'Investigación de bestias',
      'research.jadeResearch.name': 'Investigación de jade',
      'research.logistics.name': 'Logística',
      'research.alchemyResearch.name': 'Investigación de alquimia',
      'research.sectResearch.name': 'Investigación de secta',
      'research.cosmicAlignment.name': 'Alineamiento cósmico',
      'research.universalResonance.name': 'Resonancia universal',
      'research.soulSearch.name': 'Búsqueda del alma',
      'research.ascensionTheory.name': 'Teoría de la Ascensión',
      'research.temporalRift.name': 'Grieta temporal',
      'skill.alchemy.name': 'Alquimia',
      'skill.swordplay.name': 'Esgrima',
      'skill.bodyCultivation.name': 'Cultivo del cuerpo',
      'skill.beastTaming.name': 'Domar bestias',
      'skill.sectLeadership.name': 'Liderazgo de secta',
      'skill.soulRefinement.name': 'Refinamiento del alma',
      // Additional headings and buttons (story/ascension) and stats banner labels
      'h2.story': 'Historia',
      'h2.ascension': 'Ascensión y Ventajas',
      'btn.breakThrough': 'Romper capa',
      'btn.ascendRealm': 'Ascender de reino',
      'ascension.readyToAscend': 'Listo para ascender a {realm}. Costo: {cost} Qi',
      'ascension.nextLayer': 'La siguiente ruptura de capa requiere {cost} Qi',
      'ascension.timeToTarget': 'Tiempo restante: {mins}m {secs}s',
      // Mensaje que se muestra cuando el jugador ha alcanzado el último reino y la última capa
      'ascension.finalRealm': 'Has alcanzado la cúspide de la cultivación. No es posible ascender más.',
      // Mensaje emergente al intentar ascender más allá del reino final
      'toast.finalRealm': 'Has alcanzado la cúspide de la cultivación y no puedes ascender más.',
      'stat.realm': 'Reino',
      'stat.qi': 'Qi',
      'stat.qiPerTap': 'Qi por toque',
      'stat.qiPerSec': 'Qi por segundo',
      'stat.activeElixirs': 'Elixires activos',
      'stat.spiritStones': 'Piedras espirituales',
      'stat.herbs': 'Hierbas',
      'stat.beastEnergy': 'Energía bestia',
      'stat.jade': 'Jade',
      // Descripciones adicionales para mejoras, investigaciones, habilidades, beneficios y narrativa
      // Descripciones de mejoras
      'upgrade.meditation.desc': 'Concéntrate para producir 5 Qi por segundo por nivel.',
      'upgrade.breathing.desc': 'Mejora tu respiración para ganar 10 Qi por toque por nivel.',
      'upgrade.spiritualRoot.desc': 'Mejora tu raíz, aumentando el Qi/s en un 7 % por nivel.',
      'upgrade.meridianOpening.desc': 'Abre tus meridianos para aumentar el Qi/s en un 50 % cada 5 niveles.',
      'upgrade.pillFurnace.desc': 'Mejora la producción de hierbas en un 20 % por nivel.',
      'upgrade.meditationFocus.desc': 'Aumenta el Qi por toque en 15 por nivel.',
      'upgrade.dantianExpansion.desc': 'Aumenta la capacidad de Qi en un 10 % por nivel.',
      'upgrade.elementalAttunement.desc': 'Aumenta el Qi/s en un 3 % por nivel.',
      'upgrade.spiritForge.desc': 'Mejora la producción de piedras espirituales en un 20 % por nivel.',
      'upgrade.beastDen.desc': 'Aumenta la generación de energía bestial en un 20 % por nivel.',
      'upgrade.talismanWorkshop.desc': 'Reduce los costes y el tiempo de forja en un 3 % por nivel.',
      'upgrade.spiritWell.desc': 'Aumenta la acumulación de Qi sin conexión en un 5 % por nivel.',
      'upgrade.daoComprehension.desc': 'Reduce los costes de las técnicas en un 3 % por nivel.',
      'upgrade.heavenlyThunder.desc': 'El Qi/s aumenta en un 1 % por nivel y las mejoras de forja se vuelven más fuertes.',
      'upgrade.daoistInsights.desc': 'Reduce los costes de investigación en un 2 % por nivel.',
      'upgrade.stellarComprehension.desc': 'Sintoniza tu conciencia con el movimiento de las estrellas a través del cosmos infinito. Cada nivel aumenta exponencialmente la producción de Qi en un 10 %, reflejando los profundos secretos obtenidos de los cuerpos celestes y alineando tu mundo interior con el ritmo universal.',
      'upgrade.cosmicBreath.desc': 'Refina tu respiración al absorber energías cósmicas. Cada nivel aumenta enormemente el Qi por toque en 80, permitiendo a los cultivadores aprovechar la respiración del universo. Esta técnica refleja los patrones de respiración de los antiguos inmortales y acerca tu cuerpo mortal al Dao.',
      'upgrade.nebulaElixir.desc': 'Prepara elixires infundidos con la esencia de las nebulosas, expandiendo tu dantian y aumentando la producción de hierbas. Cada nivel multiplica la capacidad de Qi en un 20 % y la generación de hierbas en un 10 %, simbolizando la inmensidad de la nebulosa dentro de tu mar de conciencia.',
      'upgrade.galacticMining.desc': 'Establece colonias de extracción de piedras en toda la galaxia. Cada nivel multiplica la producción de piedras en un 20 %, aprovechando las ricas vetas de minerales de planetas y asteroides distantes.',
      'upgrade.beastRealm.desc': 'Viaja al Reino Bestia para domesticar bestias espirituales legendarias. Cada nivel aumenta la generación de energía bestial en un 20 %, reflejando la ayuda de compañeros míticos como dragones, fénix y qilins.',
      'upgrade.manaPool.desc': 'Cultiva un vasto reservorio de maná dentro de tu dantian. Cada nivel otorga +50 Qi por segundo y +100 Qi por toque, representando el flujo inagotable de energía primordial en tu base de cultivo.',
      'upgrade.spiritArrayAmplification.desc': 'Despliega enormes matrices espirituales alrededor de tu secta para canalizar energías cósmicas. Cada nivel multiplica la generación de Qi, hierbas, piedras espirituales y energía bestial en un 15 %. Estas matrices reflejan el antiguo arte de los maestros de formaciones y convierten tu secta en un faro de cultivo.',
      'upgrade.voidPierce.desc': 'Perfora el vacío para recolectar recursos de dimensiones alternativas. Cada nivel aumenta la producción de hierbas, piedras espirituales y energía bestial en un 10 %, reflejando el botín de otros reinos que se filtra en el tuyo.',
      'upgrade.originTalisman.desc': 'Crea talismanes que resuenen con el origen del Qi, reduciendo sutilmente todos los costes y acelerando la cultivación. Cada nivel aumenta el Qi/s en un 5 % y reduce los costes de las mejoras en un 2 %.',
      'upgrade.eternalFlame.desc': 'Enciende la llama eterna dentro de tu dantian. Cada nivel añade 100 Qi por segundo y un 5 % más de piedras espirituales al ascender, simbolizando el renacimiento de tu base de cultivo y el ciclo interminable de la llama creciente.',
      // Descripciones de investigaciones
      'research.qiResearch.desc': 'Aumenta el Qi por segundo en un 1 % por nivel.',
      'research.herbResearch.desc': 'Aumenta la generación de hierbas en un 4 % por nivel.',
      'research.stoneResearch.desc': 'Aumenta la generación de piedras espirituales en un 4 % por nivel.',
      'research.beastResearch.desc': 'Aumenta la generación de energía bestial en un 4 % por nivel.',
      'research.jadeResearch.desc': 'Reduce los costes de las técnicas en un 2 % por nivel.',
      'research.logistics.desc': 'Reduce la duración de las expediciones y aumenta las recompensas en un 0,5 % por nivel.',
      'research.alchemyResearch.desc': 'Aumenta la potencia de los elixires y el Qi/s en un 1 % por nivel.',
      'research.sectResearch.desc': 'Aumenta la producción de los discípulos en un 0,5 % por nivel.',
      'research.cosmicAlignment.desc': 'Alinea tus energías internas con las líneas ley cósmicas. Cada nivel aumenta tanto el Qi por segundo como el Qi por toque en un 2 %. A medida que tu cultivo resuena con el universo, cada respiración atrae polvo estelar y cada latido refleja el pulso de las galaxias.',
      'research.universalResonance.desc': 'Armonízate con las vibraciones de todo el universo. Cada nivel amplifica toda producción de recursos (hierbas, piedras espirituales, energía bestial y jade) en un 5 %. Esta investigación refleja la sutil interacción entre todas las formas de energía y materia.',
      'research.soulSearch.desc': 'Sumérgete profundamente en el mar de tu alma para descubrir potenciales ocultos. Cada nivel aumenta las recompensas de piedras espirituales de la ascensión en un 5 %. Cuanto mayor es tu intuición, más ricas son las recompensas obtenidas de tu mundo interior.',
      'research.ascensionTheory.desc': 'Estudia los mecanismos de la ascensión en sí. Cada nivel reduce en un 2 % la exigencia de Qi para cada capa y avance de reino, facilitando el camino hacia alturas mayores.',
      'research.temporalRift.desc': 'Abre grietas en el tiempo para alargar cuánto tiempo puedes cultivar sin conexión. Cada nivel añade una hora al límite de progreso sin conexión, permitiendo que tu cultivo continúe incluso cuando te alejas del mundo mortal.',
      // Descripciones de habilidades
      'skill.alchemy.desc': 'Prepara elixires para aumentar temporalmente la producción de Qi.',
      'skill.swordplay.desc': 'Domina técnicas de espada para aumentar el Qi por toque en 50 por nivel.',
      'skill.bodyCultivation.desc': 'Fortalece tu cuerpo para aumentar el Qi por segundo en un 5 % por nivel.',
      'skill.beastTaming.desc': 'Aprende a domar bestias espirituales, aumentando la energía bestial en un 5 % por nivel (multiplicativo).',
      'skill.sectLeadership.desc': 'Aumenta la producción de Qi de los discípulos en un 50 % por nivel.',
      'skill.soulRefinement.desc': 'Aumenta las recompensas de piedras espirituales de la ascensión en un 10 % por nivel.',
      // Nombres y descripciones de ventajas
      'perk.qiMastery.name': 'Dominio del Qi',
      'perk.qiMastery.desc': 'Aumenta todo el Qi/s en un 2 % por nivel.',
      'perk.upgradeEfficiency.name': 'Eficiencia de mejoras',
      'perk.upgradeEfficiency.desc': 'Reduce los costes de las mejoras en un 2 % por nivel.',
      'perk.resourceProficiency.name': 'Dominio de recursos',
      'perk.resourceProficiency.desc': 'Aumenta la producción de hierbas, piedras espirituales y energía bestial en un 2 % por nivel.',
      'perk.forgeMastery.name': 'Dominio de la forja',
      'perk.forgeMastery.desc': 'Reduce el coste y el tiempo de forja en un 2 % por nivel.',
      // Sect hub and hall labels/descriptions
      'card.brewing': 'Preparación',
      'card.elixirInventory': 'Inventario de elixires',
      'hall.management': 'Gestión',
      'hall.forging': 'Forja',
      'hall.dao': 'Attainment del Dao',
      'hall.recruitment': 'Reclutamiento y Misión',
      'p.sectIntro': 'Visita los salones de tu secta para gestionar edificios, forjar artefactos, reclutar discípulos o avanzar en tu camino hacia la iluminación.',
      'p.managementIntro': 'Amplía tu secta mejorando edificios que producen recursos. Los edificios se desbloquean a medida que asciendes en los reinos.',
      'p.forgingIntro': 'Forja poderosos artefactos para fortalecer tu secta. La forja se desbloquea en Núcleo Dorado (Etapa 3).',
      'p.daoHallIntro': 'Aspira a la cima y recibe recompensas de secta por tu progreso en el Dao inmortal.',
      'p.recruitIntro': 'Recluta discípulos y envíalos en expediciones para recolectar hierbas, piedras espirituales, bestias y jade. Activa el envío automático para despachar expediciones cuando estén disponibles.',
      'p.forgingPlaceholder': 'La forja se desbloquea en Núcleo Dorado (Etapa 3).',
      // Forging UI labels
      'forging.cost': 'Costo: {cost} piedras espirituales',
      'forging.time': 'Tiempo: {time}s',
      'forging.queueHeader': 'Cola de forja',
      'forging.remaining': '{time}s restantes',
      'btn.forge': 'Forjar',
      'btn.full': 'Lleno',
      'btn.locked': 'Bloqueado',
      // Artifact names and descriptions for forging
      'artifact.qiTalisman.name': 'Talismán de Qi',
      'artifact.qiTalisman.desc': 'Aumenta el Qi/s en {percent}',
      'artifact.herbTalisman.name': 'Amuleto Herbal',
      'artifact.herbTalisman.desc': 'Aumenta la producción de hierbas en {percent}',
      'artifact.stoneTalisman.name': 'Sigilo de Piedra',
      'artifact.stoneTalisman.desc': 'Aumenta la producción de piedras espirituales en {percent}',
      'artifact.beastTalisman.name': 'Tótem Bestial',
      'artifact.beastTalisman.desc': 'Aumenta la producción de energía bestial en {percent}',
      'artifact.fortuneCharm.name': 'Amuleto de Fortuna',
      'artifact.fortuneCharm.desc': 'Reduce la probabilidad de fracaso de expedición en {percent}',
      // Toast messages related to forging
      'toast.forgingSlotsFull': 'Todos los espacios de forja están en uso',
      'toast.notEnoughSpiritStones2': 'No hay suficientes piedras espirituales',
      'forging.inProgress': 'Forjando {name}',
      'toast.startedForging': '¡{name} comenzó a forjarse!',
      'toast.forgingUnlocked': '¡Forja desbloqueada! La forja dentro de tu secta ya está disponible.',
      // Etiqueta adicional
      'label.ascensionPoints': 'Puntos de ascensión',
      // Introducción de ascensión
      'p.ascension.intro': 'Rompe capas para ascender: cada capa otorga un multiplicador del 2 %, y después de nueve capas puedes ascender a un reino superior. Ascender a un nuevo reino proporciona un multiplicador del 10 %. La ascensión requiere hierbas, piedras espirituales, energía bestial y jade, así que administra tus recursos sabiamente. Usa los Puntos de Ascensión (PA) que ganes para desbloquear poderosas ventajas en el árbol de abajo.',
      // Párrafos de introducción de la historia
      'p.story.intro1': 'Después de fallecer en un mundo mundano, despiertas en un reino gobernado por la cultivación. Una voz misteriosa te otorga un artefacto guía para ayudar en tu viaje. A través de la meditación, el perfeccionamiento de tus técnicas y la dirección de discípulos, avanzas tu base de cultivación.',
      'p.story.intro2': 'Al comienzo de la historia, eres un cultivador novato en la etapa de Recolección de Qi. Mediante una práctica incansable recolectas Qi ambiental, abres tus meridianos y fortaleces tu dantian. Con cada avance obtienes una comprensión más profunda del Dao y eres recompensado con Piedras espirituales, la moneda de este mundo. Al completar misiones y recompensas, conoces a otros cultivadores y reclutas discípulos que te ayuden en tu viaje.',
      'p.story.intro3': 'Al establecer tu Fundación, desbloqueas los secretos de la investigación y la alquimia. Tu secta crece de una humilde morada a una institución próspera con jardines de hierbas, minas espirituales y corrales de bestias. Los discípulos emprenden expediciones para recolectar ingredientes raros mientras tú forjas artefactos para aumentar tu poder. El sistema de ascensión reinicia tu Qi, pero cada reino ascendido trae fuerza exponencial y nuevas posibilidades.',
      'p.story.intro4': 'En última instancia, este viaje narra tu ascenso de un mortal reencarnado a un soberano inmortal. Las decisiones que tomes — qué habilidades aprender, qué investigaciones priorizar, cómo liderar tu secta — determinan la rapidez con la que alcanzas la cima de la existencia. Que tu cultivación sea fluida, y que algún día superes la tribulación final para alcanzar la Divinidad Eterna.',
    },
    zh: {
      'title': '修仙放置游戏',
      'language.selectTitle': '选择语言',
      'nav.story': '故事',
      'nav.upgrades': '升级',
      'nav.ascension': '飞升',
      'nav.cultivation': '修炼',
      'nav.sect': '宗门',
      'nav.codex': '卷宗',
      'h2.upgrades': '升级',
      'p.upgrades.welcome': '通过冥想、查看属性并购买升级来开始你的修仙之旅。',
      'btn.gather': '冥想采集气',
      'label.buyQuantity': '购买数量：',
      'h2.cultivation': '修炼',
      'p.cultivation.intro': '通过掌握技术和进行研究来发展你的修炼。研究在筑基境（阶段1）解锁。',
      'h3.techniques': '功法',
      'h3.research': '研究',
      'h3.alchemy': '炼丹',
      'disciplesExp': '弟子与远征',
      'missionNote': '在此管理你的弟子和任务。随着你的飞升，更多弟子类别和远征将解锁。',
      'autoSend': '自动派遣远征',
      // Disciple recruitment and training
      'recruit.title': '招募弟子',
      'recruit.cost': '花费：{cost} 灵石',
      'btn.recruit': '招募',
      'btn.train': '训练',
      'toast.insufficientSS': '灵石不足',
      'toast.recruited': '招募了{name}，他/她是一位{class}，拥有{trait}特性！',
      'toast.discipleAdvanced': '{name}已升至第{level}级！训练成本现在是{cost}灵石。',
      'h2.settings': '设置',
      'label.colorBlind': '色盲模式',
      'label.largeFont': '大字体',
      'label.reduceMotion': '减少动画',
      'label.theme': '主题：',
      'option.theme.dark': '暗色',
      'option.theme.light': '亮色',
      'label.background': '背景：',
      'option.background.0': '紫色星云',
      'option.background.1': '绿色星云',
      'option.background.2': '粉色星云',
      'option.background.3': '炽焰星云',
      'option.background.4': '山谷',
      'label.backgroundDimmer': '背景遮罩：',
      'label.tapMult': '每次点击气 ×100（测试）',
      'label.psMult': '每秒气 ×100（测试）',
      'btn.exportSave': '导出存档',
      'btn.importSave': '导入存档',
      'btn.resetGame': '重置游戏',
      'btn.ok': '确定',
      'btn.buy': '购买',
      'btn.research': '研究',
      'locked': '已锁定',
      'requires': '需要',
      'realm.0': '聚气境',
      'realm.1': '筑基境',
      'realm.2': '结丹境',
      'realm.3': '金丹境',
      'realm.4': '元婴境',
      'realm.5': '化神境',
      'realm.6': '飞升境',
      'realm.7': '炼虚境',
      'realm.8': '渡劫境',
      'realm.9': '神灵飞升',
      'realm.10': '永恒神灵',
      'upgrade.meditation.name': '冥想',
      'upgrade.breathing.name': '呼吸技巧',
      'upgrade.spiritualRoot.name': '灵根',
      'upgrade.meridianOpening.name': '开脉',
      'upgrade.pillFurnace.name': '丹炉',
      'upgrade.meditationFocus.name': '冥想专注',
      'upgrade.dantianExpansion.name': '丹田扩张',
      'upgrade.elementalAttunement.name': '元素亲和',
      'upgrade.spiritForge.name': '灵器锻造',
      'upgrade.beastDen.name': '兽穴',
      'upgrade.talismanWorkshop.name': '符篆工坊',
      'upgrade.spiritWell.name': '灵井',
      'upgrade.daoComprehension.name': '道悟',
      'upgrade.cosmicAlignment.name': '宇宙契合',
      'upgrade.universalResonance.name': '宇宙共鸣',
      'upgrade.soulSearch.name': '灵魂探寻',
      'upgrade.ascensionTheory.name': '飞升理论',
      'upgrade.temporalRift.name': '时间裂隙',
      'upgrade.cosmicBreath.name': '宇宙呼吸',
      'upgrade.nebulaElixir.name': '星云灵丹',
      'upgrade.galacticMining.name': '星际采矿',
      'upgrade.beastRealm.name': '兽界',
      'upgrade.spiritArrayAmplification.name': '灵阵放大',
      'upgrade.voidPierce.name': '破空',
      'upgrade.originTalisman.name': '本源符箓',
      'research.qiResearch.name': '气研究',
      'research.herbResearch.name': '草药研究',
      'research.stoneResearch.name': '灵石研究',
      'research.beastResearch.name': '灵兽研究',
      'research.jadeResearch.name': '玉石研究',
      'research.logistics.name': '后勤学',
      'research.alchemyResearch.name': '炼丹研究',
      'research.sectResearch.name': '宗门研究',
      'research.cosmicAlignment.name': '宇宙契合',
      'research.universalResonance.name': '宇宙共鸣',
      'research.soulSearch.name': '灵魂探寻',
      'research.ascensionTheory.name': '飞升理论',
      'research.temporalRift.name': '时间裂隙',
      'skill.alchemy.name': '炼丹',
      'skill.swordplay.name': '剑法',
      'skill.bodyCultivation.name': '炼体',
      'skill.beastTaming.name': '驯兽',
      'skill.sectLeadership.name': '宗门领导',
      'skill.soulRefinement.name': '炼魂',
      // Additional headings and buttons (story/ascension) and stats banner labels
      'h2.story': '故事',
      'h2.ascension': '飞升与福利',
      'btn.breakThrough': '突破',
      'btn.ascendRealm': '飞升',
      'ascension.readyToAscend': '准备晋升至 {realm}。消耗 {cost} 气',
      'ascension.nextLayer': '下一层突破需要 {cost} 气',
      'ascension.timeToTarget': '达到目标还需: {mins}分 {secs}秒',
      // 当玩家达到最后一个境界和最后一层时显示的信息
      'ascension.finalRealm': '你已经达到了修行的巅峰，无法再进一步飞升。',
      // 当尝试超越最终境界时的弹窗信息
      'toast.finalRealm': '你已经达到了修行的巅峰，不能再飞升。',
      'stat.realm': '境界',
      'stat.qi': '气',
      'stat.qiPerTap': '每次点击气',
      'stat.qiPerSec': '每秒气',
      'stat.activeElixirs': '激活丹药',
      'stat.spiritStones': '灵石',
      'stat.herbs': '草药',
      'stat.beastEnergy': '兽能',
      'stat.jade': '玉石',
      // 升级、研究、技能、天赋和故事的额外描述
      // 升级描述
      'upgrade.meditation.desc': '集中精神，每级每秒产生5点气。',
      'upgrade.breathing.desc': '改善呼吸，每级每次点击获得10点气。',
      'upgrade.spiritualRoot.desc': '增强灵根，每级使气/s增加7%。',
      'upgrade.meridianOpening.desc': '开启经脉，每5级使气/s增加50%。',
      'upgrade.pillFurnace.desc': '每级使草药产量提高20%。',
      'upgrade.meditationFocus.desc': '每级使每次点击气增加15。',
      'upgrade.dantianExpansion.desc': '每级使气容量增加10%。',
      'upgrade.elementalAttunement.desc': '每级使气/s提高3%。',
      'upgrade.spiritForge.desc': '每级使灵石产量提高20%。',
      'upgrade.beastDen.desc': '每级使兽能生成提高20%。',
      'upgrade.talismanWorkshop.desc': '每级使锻造成本和时间降低3%。',
      'upgrade.spiritWell.desc': '每级使离线气积累提高5%。',
      'upgrade.daoComprehension.desc': '每级使技术成本降低3%。',
      'upgrade.heavenlyThunder.desc': '每级使气/s提高1%，并使锻造加成更强。',
      'upgrade.daoistInsights.desc': '每级使研究成本降低2%。',
      'upgrade.stellarComprehension.desc': '调谐你的意识以感应无尽宇宙中星辰的运行。每级使气产量指数式提高10%，反映从天体中获得的深奥秘密，并使你的内心世界与宇宙节奏相一致。',
      'upgrade.cosmicBreath.desc': '吸取宇宙能量来精炼呼吸。每级大幅增加每次点击气80，使修炼者能够驾驭宇宙之息。这一技艺模仿古代仙人的呼吸模式，使你的凡体更加接近道。',
      'upgrade.nebulaElixir.desc': '炼制蕴含星云精华的灵药，扩大丹田并增加草药产量。每级使气容量提升20%，草药生成提升10%，象征着星云在你识海中的浩渺。',
      'upgrade.galacticMining.desc': '在银河中建立采石殖民地。每级使灵石产量增加20%，开采遥远行星和小行星的丰富矿脉。',
      'upgrade.beastRealm.desc': '踏入兽域以驯服传奇灵兽。每级使兽能生成增加20%，得到龙、凤凰、麒麟等神兽的助力。',
      'upgrade.manaPool.desc': '在你的丹田中培养巨大的法力池。每级增加每秒50气和每次点击100气，代表原始能量不断涌入你的修为根基。',
      'upgrade.spiritArrayAmplification.desc': '在宗门周围布置巨大的灵阵以引导宇宙能量。每级使气、草药、灵石和兽能产量增加15%。这些阵法体现了古老阵法大师的技艺，使你的宗门成为修炼的灯塔。',
      'upgrade.voidPierce.desc': '刺穿虚空，从异次元收集资源。每级使草药、灵石和兽能产量增加10%，反映其他世界的战利品溢入你的小世界。',
      'upgrade.originTalisman.desc': '制作与气之本源共鸣的符箓，微妙地降低所有成本并提升修炼速度。每级使气/s增加5%，并将升级成本降低2%。',
      'upgrade.eternalFlame.desc': '点燃丹田中的永恒之火。每级增加每秒100气，并在飞升时额外获得5%的灵石，象征着修为的重生和永不熄灭的火焰循环。',
      // 研究描述
      'research.qiResearch.desc': '每级使气每秒增加1%。',
      'research.herbResearch.desc': '每级使草药生成增加4%。',
      'research.stoneResearch.desc': '每级使灵石生成增加4%。',
      'research.beastResearch.desc': '每级使兽能生成增加4%。',
      'research.jadeResearch.desc': '每级使技术成本降低2%。',
      'research.logistics.desc': '每级使远征时长减少并奖励增加0.5%。',
      'research.alchemyResearch.desc': '每级使灵药效能和气/s增加1%。',
      'research.sectResearch.desc': '每级使弟子产出增加0.5%。',
      'research.cosmicAlignment.desc': '使你的内在能量与宇宙脉络对齐。每级使气每秒和每次点击气增加2%。随着你的修炼与宇宙共鸣，每一次呼吸都吸入星尘，每一次心跳都映射银河的脉动。',
      'research.universalResonance.desc': '与整个宇宙的振动谐振。每级使所有资源产量（草药、灵石、兽能和玉）增加5%。这项研究体现了所有能量和物质之间微妙的互动。',
      'research.soulSearch.desc': '深入灵魂之海发现隐藏的潜力。每级使飞升获得的灵石奖励增加5%。你的洞见越深，从内心世界汲取的奖励越丰厚。',
      'research.ascensionTheory.desc': '研究飞升的机制。每级使每层和每个境界突破所需的气减少2%，让你更容易达到更高的境界。',
      'research.temporalRift.desc': '撕开时间裂缝以延长你离线修炼的时间。每级使离线进度上限增加一小时，让你离开尘世时修炼仍在继续。',
      // 技能描述
      'skill.alchemy.desc': '炼制灵药临时提升气产量。',
      'skill.swordplay.desc': '掌握剑法，每级使每次点击气增加50。',
      'skill.bodyCultivation.desc': '锻炼肉身，每级使气每秒增加5%。',
      'skill.beastTaming.desc': '学习驯服灵兽，每级使兽能增加5%（乘算）。',
      'skill.sectLeadership.desc': '每级使弟子气产出增加50%。',
      'skill.soulRefinement.desc': '每级使飞升获得的灵石奖励增加10%。',
      // 天赋名称和描述
      'perk.qiMastery.name': '气之精通',
      'perk.qiMastery.desc': '每级使所有气/s增加2%。',
      'perk.upgradeEfficiency.name': '升级效率',
      'perk.upgradeEfficiency.desc': '每级减少升级成本2%。',
      'perk.resourceProficiency.name': '资源精通',
      'perk.resourceProficiency.desc': '每级使草药、灵石和兽能产量增加2%。',
      'perk.forgeMastery.name': '锻造精通',
      'perk.forgeMastery.desc': '每级减少锻造成本和时间2%。',
      // 宗门大厅及标签/描述
      'card.brewing': '酿造',
      'card.elixirInventory': '丹药库存',
      'hall.management': '管理',
      'hall.forging': '锻造',
      'hall.dao': '悟道',
      'hall.recruitment': '招募与任务',
      'p.sectIntro': '访问你宗门的大厅以管理建筑、锻造法器、招募弟子或在通往成仙的道路上精进。',
      'p.managementIntro': '通过升级产出资源的建筑来扩展你的宗门。随着你晋升境界，建筑会解锁。',
      'p.forgingIntro': '锻造强大的法器以增强宗门实力。锻造在金丹（阶段3）解锁。',
      'p.daoHallIntro': '志存高远，在通往仙道的道路上获得宗门奖励。',
      'p.recruitIntro': '招募弟子并派遣他们远行以收集草药、灵石、灵兽和玉石。启用自动派遣可在可用时自动派遣。',
      'p.forgingPlaceholder': '锻造在金丹（阶段3）解锁。',
      // 锻造界面标签
      'forging.cost': '成本：{cost} 灵石',
      'forging.time': '时间：{time}秒',
      'forging.queueHeader': '锻造队列',
      'forging.remaining': '剩余 {time} 秒',
      'btn.forge': '锻造',
      'btn.full': '已满',
      'btn.locked': '已锁',
      // 锻造神器名称和描述
      'artifact.qiTalisman.name': '聚气符',
      'artifact.qiTalisman.desc': '气/秒增加 {percent}',
      'artifact.herbTalisman.name': '灵草符',
      'artifact.herbTalisman.desc': '草药产量提高 {percent}',
      'artifact.stoneTalisman.name': '灵石符',
      'artifact.stoneTalisman.desc': '灵石产量提高 {percent}',
      'artifact.beastTalisman.name': '灵兽图腾',
      'artifact.beastTalisman.desc': '灵兽能量产量提高 {percent}',
      'artifact.fortuneCharm.name': '幸运符',
      'artifact.fortuneCharm.desc': '减少远征失败概率 {percent}',
      // 锻造相关提示
      'toast.forgingSlotsFull': '所有锻造槽已满',
      'toast.notEnoughSpiritStones2': '灵石不足',
      'forging.inProgress': '正在锻造 {name}',
      'toast.startedForging': '{name} 开始锻造了！',
      'toast.forgingUnlocked': '锻造已解锁！宗门的锻造炉现在可以使用。',
      // 额外标签
      'label.ascensionPoints': '飞升点数',
      // 飞升介绍
      'p.ascension.intro': '突破层次以飞升：每层提供2%的倍增奖励，每九层后可升至更高境界。飞升到新境界提供10%的乘数。飞升需要草药、灵石、兽能和玉石，因此请明智管理资源。使用获得的飞升点数 (AP) 在下方树中解锁强大的加成。',
      // 故事介绍段落
      'p.story.intro1': '在平凡世界死去后，你在一个由修炼支配的世界醒来。一个神秘的声音赐予你一个指引法器，帮助你的修炼之旅。通过冥想、锻炼技艺并指挥弟子，你提升你的修为基础。',
      'p.story.intro2': '故事开始时，你是气聚阶段的新手。通过不懈的练习，你收集周围的气，打通经脉，加强丹田。每一次突破都令你更深入地理解大道，并获得灵石作为奖励，这是这个世界的货币。完成任务和悬赏，你结识同道修士并招募弟子助你修行。',
      'p.story.intro3': '当你建立基础后，你解锁研究和炼丹的秘密。你的宗门从简陋的住所成长为繁荣的机构，拥有草药园、灵矿和兽栏。弟子们前往远征收集稀有材料，你则锻造法宝增强自己的力量。飞升系统会重置你的气，但每次飞升都会带来指数式增长的新力量和可能性。',
      'p.story.intro4': '最终，这段旅程记录了你从转世凡人到不朽主宰的崛起。你做出的选择——学习哪种技能、优先研究哪些内容、如何领导你的宗门——决定了你多快能登上存在的顶峰。愿你的修行顺利，愿你终有一日突破最终的天劫，成就永恒神祗。',
    },
    hi: {
      'title': 'संवर्धन निष्क्रिय खेल',
      'language.selectTitle': 'भाषा चुनें',
      'nav.story': 'कहानी',
      'nav.upgrades': 'उन्नयन',
      'nav.ascension': 'उत्कर्ष',
      'nav.cultivation': 'संवर्धन',
      'nav.sect': 'संघ',
      'nav.codex': 'कोडेक्स',
      'h2.upgrades': 'उन्नयन',
      'p.upgrades.welcome': 'ध्यान करने, अपनी आँकड़े देखने और एक ही स्थान पर उन्नयन खरीदने से अपना संवर्धन यात्रा शुरू करें।',
      'btn.gather': 'क्यूई एकत्र करने के लिए ध्यान करें',
      'label.buyQuantity': 'खरीद मात्रा:',
      'h2.cultivation': 'संवर्धन',
      'p.cultivation.intro': 'तकनीकों में महारत हासिल कर और अनुसंधान करके अपने संवर्धन को विकसित करें। अनुसंधान नींव स्थापना (स्तर 1) पर अनलॉक होता है।',
      'h3.techniques': 'तकनीकें',
      'h3.research': 'अनुसंधान',
      'h3.alchemy': 'रसायन विद्या',
      'disciplesExp': 'शिष्य और अभियान',
      'missionNote': 'अपने शिष्यों और अभियानों को यहां प्रबंधित करें। जैसे-जैसे आप आरोहण करते हैं, अधिक शिष्य वर्ग और अभियान अनलॉक होंगे।',
      'autoSend': 'स्वचालित रूप से अभियान भेजें',
      // Disciple recruitment and training
      'recruit.title': 'शिष्य भर्ती करें',
      'recruit.cost': 'कीमत: {cost} आत्मा पत्थर',
      'btn.recruit': 'भर्ती करें',
      'btn.train': 'प्रशिक्षण',
      'toast.insufficientSS': 'पर्याप्त आत्मा पत्थर नहीं',
      'toast.recruited': '{name} नामक {class} के साथ {trait} गुण वाले शिष्य को भर्ती किया गया!',
      'toast.discipleAdvanced': '{name} अब स्तर {level} पर पहुंच गया है! प्रशिक्षण लागत अब {cost} आत्मा पत्थर है।',
      'h2.settings': 'सेटिंग्स',
      'label.colorBlind': 'रंग-अंधता मोड',
      'label.largeFont': 'बड़ा फ़ॉन्ट',
      'label.reduceMotion': 'गति कम करें',
      'label.theme': 'थीम:',
      'option.theme.dark': 'डार्क',
      'option.theme.light': 'लाइट',
      'label.background': 'पृष्ठभूमि:',
      'option.background.0': 'निहारिका बैंगनी',
      'option.background.1': 'निहारिका हरा',
      'option.background.2': 'निहारिका गुलाबी',
      'option.background.3': 'निहारिका एंबर',
      'option.background.4': 'पर्वतीय घाटी',
      'label.backgroundDimmer': 'पृष्ठभूमि डिमर:',
      'label.tapMult': 'प्रत्येक टैप पर क्यूई ×100 (परीक्षण)',
      'label.psMult': 'प्रति सेकंड क्यूई ×100 (परीक्षण)',
      'btn.exportSave': 'सेव निर्यात करें',
      'btn.importSave': 'सेव आयात करें',
      'btn.resetGame': 'खेल रीसेट करें',
      'btn.ok': 'ठीक है',
      'btn.buy': 'खरीदें',
      'btn.research': 'अनुसंधान करें',
      'locked': 'लॉक',
      'requires': 'आवश्यक',
      'realm.0': 'क्यूई संग्रह',
      'realm.1': 'नींव स्थापना',
      'realm.2': 'कोर निर्माण',
      'realm.3': 'स्वर्ण कोर',
      'realm.4': 'जन्मती आत्मा',
      'realm.5': 'आध्यात्मिक परिवर्तन',
      'realm.6': 'अमर आरोहण',
      'realm.7': 'शून्य परिशोधन',
      'realm.8': 'स्वर्गीय परीक्षा',
      'realm.9': 'दिव्य आरोहण',
      'realm.10': 'अनन्त देवत्व',
      'upgrade.meditation.name': 'ध्यान',
      'upgrade.breathing.name': 'श्वास तकनीक',
      'upgrade.spiritualRoot.name': 'आध्यात्मिक जड़',
      'upgrade.meridianOpening.name': 'मेरिडियन खोलना',
      'upgrade.pillFurnace.name': 'गोलियाँ भट्ठी',
      'upgrade.meditationFocus.name': 'ध्यान केंद्रित',
      'upgrade.dantianExpansion.name': 'डांतियान विस्तार',
      'upgrade.elementalAttunement.name': 'तत्व अनुकूलन',
      'upgrade.spiritForge.name': 'आध्यात्मिक भट्ठा',
      'upgrade.beastDen.name': 'पशु मांद',
      'upgrade.talismanWorkshop.name': 'ताबीज कार्यशाला',
      'upgrade.spiritWell.name': 'आध्यात्मिक कुआँ',
      'upgrade.daoComprehension.name': 'दाओ समझ',
      'upgrade.cosmicAlignment.name': 'ब्रह्मांडीय संरेखण',
      'upgrade.universalResonance.name': 'सार्वभौमिक अनुनाद',
      'upgrade.soulSearch.name': 'आत्मा खोज',
      'upgrade.ascensionTheory.name': 'उत्कर्ष सिद्धांत',
      'upgrade.temporalRift.name': 'काल अंतराल',
      'upgrade.cosmicBreath.name': 'ब्रह्मांडीय श्वास',
      'upgrade.nebulaElixir.name': 'नेबुला अमृत',
      'upgrade.galacticMining.name': 'गैलेक्टिक खनन',
      'upgrade.beastRealm.name': 'पशु क्षेत्र',
      'upgrade.spiritArrayAmplification.name': 'आध्यात्मिक सरणी प्रवर्धन',
      'upgrade.voidPierce.name': 'खालीपन भेदन',
      'upgrade.originTalisman.name': 'मूल ताबीज',
      'research.qiResearch.name': 'क्यूई अनुसंधान',
      'research.herbResearch.name': 'जड़ी अनुसंधान',
      'research.stoneResearch.name': 'आध्यात्मिक पत्थर अनुसंधान',
      'research.beastResearch.name': 'पशु अनुसंधान',
      'research.jadeResearch.name': 'जेड अनुसंधान',
      'research.logistics.name': 'लॉजिस्टिक्स',
      'research.alchemyResearch.name': 'रसायन अनुसंधान',
      'research.sectResearch.name': 'संघ अनुसंधान',
      'research.cosmicAlignment.name': 'ब्रह्मांडीय संरेखण',
      'research.universalResonance.name': 'सार्वभौमिक अनुनाद',
      'research.soulSearch.name': 'आत्मा खोज',
      'research.ascensionTheory.name': 'उत्कर्ष सिद्धांत',
      'research.temporalRift.name': 'काल अंतराल',
      'skill.alchemy.name': 'रसायन विद्या',
      'skill.swordplay.name': 'तलवारबाज़ी',
      'skill.bodyCultivation.name': 'शरीर संवर्धन',
      'skill.beastTaming.name': 'पशु पालन',
      'skill.sectLeadership.name': 'संघ नेतृत्व',
      'skill.soulRefinement.name': 'आत्मा परिष्करण',
      // Additional headings and buttons (story/ascension) and stats banner labels
      'h2.story': 'कहानी',
      'h2.ascension': 'उत्क्रमण और लाभ',
      'btn.breakThrough': 'परत तोड़ें',
      'btn.ascendRealm': 'क्षेत्र बढ़ाएं',
      'ascension.readyToAscend': '{realm} तक वृद्धि के लिए तैयार। लागत: {cost} क्यूई',
      'ascension.nextLayer': 'अगली परत की सफलता के लिए {cost} क्यूई आवश्यक',
      'ascension.timeToTarget': 'लक्ष्य समय: {mins}m {secs}s',
      // अंतिम क्षेत्र और अंतिम स्तर पर पहुंचने पर दिखाया गया संदेश
      'ascension.finalRealm': 'आपने साधना की पराकाष्ठा प्राप्त कर ली है। आगे कोई उत्क्रमण संभव नहीं है।',
      // अंतिम क्षेत्र से आगे बढ़ने का प्रयास करने पर दिखाया जाने वाला संदेश
      'toast.finalRealm': 'आपने साधना की पराकाष्ठा प्राप्त कर ली है और आगे नहीं बढ़ सकते।',
      'stat.realm': 'क्षेत्र',
      'stat.qi': 'क्यूई',
      'stat.qiPerTap': 'प्रति टैप क्यूई',
      'stat.qiPerSec': 'प्रति सेकंड क्यूई',
      'stat.activeElixirs': 'सक्रिय औषधियां',
      'stat.spiritStones': 'आत्मिक पत्थर',
      'stat.herbs': 'जड़ी-बूटियां',
      'stat.beastEnergy': 'पशु ऊर्जा',
      'stat.jade': 'जेड',
      // उन्नयन, शोध, कौशल, पर्क और कहानी के लिए अतिरिक्त विवरण
      // उन्नयन विवरण
      'upgrade.meditation.desc': 'अपना मन केंद्रित करें ताकि प्रति स्तर प्रति सेकंड 5 क्यूई उत्पन्न हो सके।',
      'upgrade.breathing.desc': 'अपनी साँस की तकनीक सुधारें ताकि प्रति स्तर प्रत्येक टैप पर 10 क्यूई प्राप्त हो।',
      'upgrade.spiritualRoot.desc': 'अपनी आध्यात्मिक जड़ को सुधारें, प्रति स्तर Qi/s को 7% बढ़ाता है।',
      'upgrade.meridianOpening.desc': 'अपने मेरिडियन खोलें ताकि हर 5 स्तरों पर Qi/s 50% बढ़ सके।',
      'upgrade.pillFurnace.desc': 'प्रत्येक स्तर पर जड़ी-बूटी उत्पादन को 20% बढ़ाता है।',
      'upgrade.meditationFocus.desc': 'प्रति स्तर टैप पर Qi को 15 बढ़ाता है।',
      'upgrade.dantianExpansion.desc': 'प्रति स्तर Qi क्षमता को 10% बढ़ाता है।',
      'upgrade.elementalAttunement.desc': 'प्रति स्तर Qi/s को 3% बढ़ाता है।',
      'upgrade.spiritForge.desc': 'प्रति स्तर पत्थर उत्पादन को 20% बढ़ाता है।',
      'upgrade.beastDen.desc': 'प्रति स्तर पशु ऊर्जा उत्पादन को 20% बढ़ाता है।',
      'upgrade.talismanWorkshop.desc': 'प्रति स्तर धातुकरण लागत और समय को 3% कम करता है।',
      'upgrade.spiritWell.desc': 'प्रति स्तर ऑफ़लाइन Qi संचय को 5% बढ़ाता है।',
      'upgrade.daoComprehension.desc': 'प्रति स्तर तकनीक लागत को 3% कम करता है।',
      'upgrade.heavenlyThunder.desc': 'प्रति स्तर Qi/s में 1% वृद्धि और फोर्जिंग बोनस मजबूत होते हैं।',
      'upgrade.daoistInsights.desc': 'प्रति स्तर शोध लागत को 2% कम करता है।',
      'upgrade.stellarComprehension.desc': 'अपनी चेतना को अनंत ब्रह्मांड में सितारों की गतियों के साथ तालमेल बिठाएं। प्रत्येक स्तर Qi उत्पादन को 10% से गुणात्मक रूप से बढ़ाता है, जो खगोलीय निकायों से प्राप्त गहन रहस्यों को दर्शाता है और आपके आंतरिक संसार को वैश्विक लय के साथ संरेखित करता है।',
      'upgrade.cosmicBreath.desc': 'ब्रह्मांडीय ऊर्जा को अंदर खींचकर अपनी साँस को परिष्कृत करें। प्रत्येक स्तर टैप पर Qi को 80 से बढ़ाता है, जिससे साधक स्वयं ब्रह्मांड की सांस का उपयोग कर सकते हैं। यह तकनीक प्राचीन अमरों के साँस पैटर्न की प्रतिध्वनि है और आपके नश्वर शरीर को Dao के करीब लाती है।',
      'upgrade.nebulaElixir.desc': 'निहारिका की सार-संख्या से युक्त औषधि तैयार करें, अपने दन्तियन को विस्तारित करें और जड़ी-बूटी उत्पादन को बढ़ाएँ। प्रत्येक स्तर Qi क्षमता को 20% और जड़ी-बूटी उत्पादन को 10% बढ़ाता है, जो आपकी चेतना के समुद्र में निहारिका की विशालता का प्रतीक है।',
      'upgrade.galacticMining.desc': 'आकाशगंगा भर में पत्थर खनन कॉलोनियाँ स्थापित करें। प्रत्येक स्तर पत्थर उत्पादन को 20% से गुणा करता है, दूर की ग्रहों और क्षुद्रग्रहों की समृद्ध खनिज नसों का दोहन करता है।',
      'upgrade.beastRealm.desc': 'पौराणिक आत्मा पशुओं को वश में करने के लिए पशु क्षेत्र की यात्रा करें। प्रत्येक स्तर पशु ऊर्जा उत्पादन को 20% बढ़ाता है, ड्रेगन, फीनिक्स और क़िलिन जैसे पौराणिक साथी की सहायता को दर्शाता है।',
      'upgrade.manaPool.desc': 'अपने दन्तियन में एक विशाल मना भंडार विकसित करें। प्रत्येक स्तर प्रति सेकंड 50 Qi और प्रति टैप 100 Qi देता है, जो आपकी साधना आधार में आदि ऊर्जा के अंतहीन प्रवाह का प्रतिनिधित्व करता है।',
      'upgrade.spiritArrayAmplification.desc': 'अपने संप्रदाय के चारों ओर विशाल आत्मा सरणियाँ तैनात करें ताकि ब्रह्मांडीय ऊर्जा को चैनल किया जा सके। प्रत्येक स्तर Qi, जड़ी-बूटी, पत्थर और पशु उत्पादन को 15% से गुणा करता है। ये सरणियाँ प्राचीन संरचना गुरुओं की कला को दर्शाती हैं और आपके संप्रदाय को साधना का प्रकाशस्तंभ बनाती हैं।',
      'upgrade.voidPierce.desc': 'खाली जगह को भेदें और वैकल्पिक आयामों से संसाधन लाएँ। प्रत्येक स्तर जड़ी-बूटी, पत्थर और पशु उत्पादन को 10% बढ़ाता है, जो अन्य लोकों से आपके लोक में बहने वाली लूट को दर्शाता है।',
      'upgrade.originTalisman.desc': 'ऐसे ताबीज़ बनाएं जो Qi के स्रोत के साथ गूंजते हों, सभी लागतों को सूक्ष्म रूप से कम करें और साधना की गति बढ़ाएँ। प्रत्येक स्तर Qi/s को 5% बढ़ाता है और अपग्रेड लागत को 2% कम करता है।',
      'upgrade.eternalFlame.desc': 'अपने दन्तियन में अनन्त अग्नि प्रज्वलित करें। प्रत्येक स्तर प्रति सेकंड 100 Qi जोड़ता है और उन्नति पर 5% अधिक आत्मा पत्थर देता है, जो आपकी साधना आधार के पुनर्जन्म और बढ़ती आग के अंतहीन चक्र का प्रतीक है।',
      // शोध विवरण
      'research.qiResearch.desc': 'प्रति स्तर Qi प्रति सेकंड 1% बढ़ाता है।',
      'research.herbResearch.desc': 'प्रति स्तर जड़ी-बूटी उत्पादन 4% बढ़ाता है।',
      'research.stoneResearch.desc': 'प्रति स्तर आत्मा पत्थर उत्पादन 4% बढ़ाता है।',
      'research.beastResearch.desc': 'प्रति स्तर पशु ऊर्जा उत्पादन 4% बढ़ाता है।',
      'research.jadeResearch.desc': 'प्रति स्तर तकनीक लागत 2% कम करता है।',
      'research.logistics.desc': 'प्रति स्तर अभियान की अवधि कम करता है और पुरस्कारों को 0.5% बढ़ाता है।',
      'research.alchemyResearch.desc': 'प्रति स्तर औषधि की क्षमता और Qi/s को 1% बढ़ाता है।',
      'research.sectResearch.desc': 'प्रति स्तर शिष्यों की उत्पादन क्षमता को 0.5% बढ़ाता है।',
      'research.cosmicAlignment.desc': 'अपनी आंतरिक ऊर्जाओं को ब्रह्मांडीय ले लाइनों के साथ संरेखित करें। प्रत्येक स्तर Qi प्रति सेकंड और प्रति टैप दोनों में 2% वृद्धि करता है। जैसे-जैसे आपकी साधना ब्रह्मांड के साथ प्रतिध्वनित होती है, प्रत्येक साँस सितारों की धूल को आकर्षित करती है और प्रत्येक हृदय की धड़कन आकाशगंगाओं की धड़कन को प्रतिध्वनित करती है।',
      'research.universalResonance.desc': 'पूरे ब्रह्मांड की कंपन के साथ सामंजस्य स्थापित करें। प्रत्येक स्तर सभी संसाधन उत्पादन (जड़ी-बूटी, आत्मा पत्थर, पशु ऊर्जा और जेड) को 5% बढ़ाता है। यह शोध ऊर्जा और पदार्थ के सभी रूपों के बीच सूक्ष्म अंतःक्रिया को दर्शाता है।',
      'research.soulSearch.desc': 'अपनी आत्मा के समुद्र में गहराई तक जाएँ ताकि छिपी संभावनाओं को उजागर कर सकें। प्रत्येक स्तर उन्नति से आत्मा पत्थर पुरस्कारों को 5% बढ़ाता है। आपकी अंतर्दृष्टि जितनी बड़ी होगी, आपके आंतरिक संसार से प्राप्त पुरस्कार उतने ही समृद्ध होंगे।',
      'research.ascensionTheory.desc': 'स्वयं उन्नति की तंत्र का अध्ययन करें। प्रत्येक स्तर प्रत्येक परत और राज्य उन्नति के Qi आवश्यकता को 2% कम करता है, जिससे महान ऊंचाइयों तक पहुंच आसान हो जाती है।',
      'research.temporalRift.desc': 'समय में दरारें खोलें ताकि आप ऑफ़लाइन कितने समय तक साधना कर सकते हैं बढ़ जाए। प्रत्येक स्तर ऑफ़लाइन प्रगति सीमा में एक घंटे की वृद्धि करता है, जिससे आप जब दैहिक दुनिया से दूर हों तब भी साधना जारी रहती है।',
      // कौशल विवरण
      'skill.alchemy.desc': 'Qi उत्पादन को अस्थायी रूप से बढ़ाने के लिए औषधियाँ तैयार करें।',
      'skill.swordplay.desc': 'तलवार तकनीकों में महारत हासिल करें, प्रति स्तर हर टैप पर Qi को 50 बढ़ाएँ।',
      'skill.bodyCultivation.desc': 'अपने शरीर को मजबूत करें, प्रति स्तर Qi प्रति सेकंड को 5% बढ़ाएँ।',
      'skill.beastTaming.desc': 'आत्मा पशुओं को वश में करना सीखें, प्रति स्तर पशु ऊर्जा को 5% बढ़ाएँ (गुणा रूप से)।',
      'skill.sectLeadership.desc': 'प्रति स्तर शिष्यों की Qi उत्पादन को 50% बढ़ाता है।',
      'skill.soulRefinement.desc': 'प्रति स्तर उन्नति से आत्मा पत्थर पुरस्कारों को 10% बढ़ाता है।',
      // पर्क नाम और विवरण
      'perk.qiMastery.name': 'Qi महारत',
      'perk.qiMastery.desc': 'प्रति स्तर सभी Qi/s को 2% बढ़ाता है।',
      'perk.upgradeEfficiency.name': 'उन्नयन दक्षता',
      'perk.upgradeEfficiency.desc': 'प्रति स्तर उन्नयन की लागत को 2% कम करता है।',
      'perk.resourceProficiency.name': 'संसाधन दक्षता',
      'perk.resourceProficiency.desc': 'प्रति स्तर जड़ी-बूटी, आत्मा पत्थर और पशु उत्पादन को 2% बढ़ाता है।',
      'perk.forgeMastery.name': 'फोर्ज महारत',
      'perk.forgeMastery.desc': 'प्रति स्तर फोर्ज लागत और समय को 2% कम करता है।',
      // संप्रदाय हब और हॉल लेबल/विवरण
      'card.brewing': 'निर्माण',
      'card.elixirInventory': 'अमृत सूची',
      'hall.management': 'प्रबंधन',
      'hall.forging': 'गढ़ना',
      'hall.dao': 'दाओ प्राप्ति',
      'hall.recruitment': 'भर्ती और मिशन',
      'p.sectIntro': 'अपनी संप्रदाय की हॉल्स में जाकर भवनों का प्रबंधन करें, कलाकृतियाँ गढ़ें, शिष्यों की भर्ती करें या आत्मज्ञान के मार्ग पर आगे बढ़ें।',
      'p.managementIntro': 'संसाधन उत्पन्न करने वाली इमारतों को उन्नत करके अपनी संप्रदाय का विस्तार करें। इमारतें उच्च स्तरों पर अनलॉक होती हैं।',
      'p.forgingIntro': 'अपनी संप्रदाय की शक्ति बढ़ाने के लिए शक्तिशाली कलाकृतियाँ गढ़ें। गढ़ना गोल्डन कोर (चरण 3) पर अनलॉक होता है।',
      'p.daoHallIntro': 'शिखर का लक्ष्य रखें और अमर दाओ में अपनी प्रगति के लिए संप्रदाय पुरस्कार प्राप्त करें।',
      'p.recruitIntro': 'शिष्यों की भर्ती करें और उन्हें जड़ी‑बूटियाँ, आत्मा पत्थर, पशु ऊर्जा और जेड इकट्ठा करने के लिए अभियानों पर भेजें। उपलब्ध होने पर स्वचालित रूप से अभियानों को भेजने के लिए Auto-send सक्षम करें।',
      'p.forgingPlaceholder': 'गढ़ना गोल्डन कोर (चरण 3) पर अनलॉक होता है।',
      // गढ़ने इंटरफ़ेस लेबल
      'forging.cost': 'लागत: {cost} आत्मा पत्थर',
      'forging.time': 'समय: {time} सेकंड',
      'forging.queueHeader': 'गढ़ने की कतार',
      'forging.remaining': '{time} सेकंड शेष',
      'btn.forge': 'गढ़ें',
      'btn.full': 'पूर्ण',
      'btn.locked': 'लॉक्ड',
      // गढ़ने कलाकृतियों के नाम और विवरण
      'artifact.qiTalisman.name': 'Qi ताबीज',
      'artifact.qiTalisman.desc': 'Qi/सेकंड में {percent} वृद्धि',
      'artifact.herbTalisman.name': 'हर्ब ताबीज',
      'artifact.herbTalisman.desc': 'जड़ी उत्पादन में {percent} वृद्धि',
      'artifact.stoneTalisman.name': 'स्टोन सिगिल',
      'artifact.stoneTalisman.desc': 'आत्मा पत्थर उत्पादन में {percent} वृद्धि',
      'artifact.beastTalisman.name': 'पशु टोटेम',
      'artifact.beastTalisman.desc': 'पशु ऊर्जा उत्पादन में {percent} वृद्धि',
      'artifact.fortuneCharm.name': 'भाग्य ताबीज',
      'artifact.fortuneCharm.desc': 'अभियान की विफलता की संभावना {percent} तक कम',
      // गढ़ने से संबंधित टोसट संदेश
      'toast.forgingSlotsFull': 'सभी गढ़ने के स्लॉट उपयोग में हैं',
      'toast.notEnoughSpiritStones2': 'पर्याप्त आत्मा पत्थर नहीं',
      'forging.inProgress': '{name} का गढ़ना जारी है',
      'toast.startedForging': '{name} का गढ़ना शुरू हुआ!',
      'toast.forgingUnlocked': 'गढ़ना अनलॉक हो गया! आपकी संप्रदाय की फोर्ज अब उपलब्ध है।',
      // अतिरिक्त लेबल
      'label.ascensionPoints': 'उन्नति अंक',
      // उन्नति परिचय
      'p.ascension.intro': 'स्तरों को तोड़कर ऊपर उठें: प्रत्येक स्तर 2% गुणक प्रदान करता है, और नौ स्तरों के बाद आप एक उच्च क्षेत्र में जा सकते हैं। एक नए क्षेत्र में उन्नति 10% गुणक प्रदान करती है। उन्नति में जड़ी-बूटियाँ, आत्मा पत्थर, पशु ऊर्जा और जेड की आवश्यकता होती है, इसलिए अपनी संसाधनों को समझदारी से प्रबंधित करें। नीचे के पेड़ में शक्तिशाली लाभ अनलॉक करने के लिए अर्जित उन्नति अंकों (AP) का उपयोग करें।',
      // कहानी परिचय पैराग्राफ
      'p.story.intro1': 'एक साधारण दुनिया में मरने के बाद, आप एक ऐसे संसार में जागते हैं जहां सब कुछ साधना द्वारा नियंत्रित होता है। एक रहस्यमय आवाज आपको एक मार्गदर्शक वस्तु देती है ताकि आपकी यात्रा में मदद मिल सके। ध्यान, अपनी तकनीकों को तराशने और शिष्यों का निर्देशन करने से आप अपनी साधना का आधार बढ़ाते हैं।',
      'p.story.intro2': 'कहानी की शुरुआत में, आप Qi एकत्रीकरण चरण में एक नौसिखिए साधक हैं। निरंतर अभ्यास के माध्यम से आप परिवेशी Qi एकत्र करते हैं, अपने मेरिडियन खोलते हैं और अपने दन्तियन को मजबूत करते हैं। प्रत्येक सफलता के साथ आप Dao की गहरी समझ हासिल करते हैं और आपको इस दुनिया की मुद्रा, आत्मा पत्थरों, से पुरस्कृत किया जाता है। quests और बाउंटी पूरी करके, आप अन्य साधकों से मिलते हैं और अपने मार्ग में मदद करने के लिए शिष्यों को भर्ती करते हैं।',
      'p.story.intro3': 'अपनी नींव स्थापित करने के बाद, आप शोध और अल्केमी के रहस्यों को खोलते हैं। आपका संप्रदाय एक साधारण आश्रय से एक फलते-फूलते संस्थान में बदल जाता है जिसमें जड़ी-बूटी के बगीचे, आत्मा की खानें और पशु पेन हैं। शिष्य दुर्लभ सामग्रियां एकत्र करने के लिए अभियानों पर जाते हैं जबकि आप अपनी शक्ति को बढ़ाने के लिए कलाकृतियां बनाते हैं। उन्नति प्रणाली आपके Qi को रीसेट करती है, लेकिन प्रत्येक क्षेत्र की उन्नति आपको अत्यधिक शक्ति और नई संभावनाएँ प्रदान करती है।',
      'p.story.intro4': 'आखिरकार, यह यात्रा आपके पुनर्जन्मित नश्वर से एक अमर सम्राट तक के उत्थान का वर्णन करती है। आपके द्वारा किए गए चुनाव—कौन से कौशल सीखने हैं, किस शोध को प्राथमिकता देनी है, अपने संप्रदाय का नेतृत्व कैसे करना है—निर्धारित करते हैं कि आप अस्तित्व के शिखर तक कितनी तेजी से पहुंचते हैं। आपकी साधना सुचारू हो, और एक दिन आप अंतिम कष्ट को पार कर अनंत देवत्व प्राप्त करें।',
    },
  };

  /**
   * Retrieve the translation for a given key in the current language.
   * If variables are provided the placeholders in the translation string
   * (e.g. {cost}) will be replaced with the corresponding values. When
   * no translation exists for the selected language the English string
   * (or the key itself) is returned.
   *
   * @param {string} key The translation key.
   * @param {Object} [vars] Optional variables to interpolate into the string.
   * @returns {string} The translated and interpolated string.
   */
  function t(key, vars) {
    const lang = (window.game && window.game.settings && window.game.settings.language) || localStorage.getItem('gameLang') || 'en';
    let str;
    if (translations[lang] && Object.prototype.hasOwnProperty.call(translations[lang], key)) {
      str = translations[lang][key];
    } else if (translations.en && Object.prototype.hasOwnProperty.call(translations.en, key)) {
      str = translations.en[key];
    } else {
      str = key;
    }
    if (vars) {
      for (const k in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, k)) {
          str = str.replace(new RegExp(`{${k}}`, 'g'), vars[k]);
        }
      }
    }
    return str;
  }

  /**
   * Change the game language. This function updates the language stored on
   * the global game.settings object (if present) and in localStorage and
   * then reapplies all translations. If an unsupported language code is
   * provided English will be used.
   *
   * @param {string} lang The desired language code.
   */
  function setLanguage(lang) {
    if (!supportedLanguages.includes(lang)) {
      lang = 'en';
    }
    if (window.game) {
      window.game.settings = window.game.settings || {};
      window.game.settings.language = lang;
    }
    try {
      localStorage.setItem('gameLang', lang);
    } catch (e) {
      /* ignore storage errors */
    }
    applyTranslations();
    // Refresh dynamic UI lists (upgrades, research, skills) to reflect the new language.
    // These functions are defined in main.js and rebuild the lists using translated names.
    try {
      if (typeof window.updateUpgradeUI === 'function') window.updateUpgradeUI();
      if (typeof window.updateResearchUI === 'function') window.updateResearchUI();
      if (typeof window.updateSkillUI === 'function') window.updateSkillUI();
      // Refresh disciple list on language change to update recruit labels and train buttons
      if (typeof window.updateDiscipleUI === 'function') window.updateDiscipleUI();
    } catch (e) {
      // ignore any errors (e.g. functions may not be loaded yet)
    }
    // Persist the game settings if a save function is available
    if (typeof window.saveGame === 'function' && window.game) {
      window.saveGame();
    }
  }

  /**
   * Apply translations to static UI elements. This function queries for
   * specific elements by ID or attribute and updates their text content
   * based on the current language. It does not handle dynamic game data
   * (e.g. upgrade costs) – those are translated in their respective
   * update functions. New keys can be added to this function as needed.
   */
  function applyTranslations() {
    const lang = (window.game && window.game.settings && window.game.settings.language) || localStorage.getItem('gameLang') || 'en';
    // Update document language attribute
    document.documentElement.lang = lang;
    // Update title
    const titleEl = document.querySelector('title');
    if (titleEl) titleEl.textContent = t('title');
    // Navigation buttons
    const navButtons = document.querySelectorAll('.nav-bar button[data-screen]');
    navButtons.forEach(btn => {
      const screen = btn.getAttribute('data-screen');
      if (!screen) return;
      const key = `nav.${screen}`;
      btn.textContent = t(key);
    });
    // Upgrades screen
    const upgradesSection = document.getElementById('screen-upgrades');
    if (upgradesSection) {
      const h2 = upgradesSection.querySelector('h2');
      if (h2) h2.textContent = t('h2.upgrades');
      const welcome = upgradesSection.querySelector('.welcome-msg');
      if (welcome) welcome.textContent = t('p.upgrades.welcome');
      const gatherBtn = document.getElementById('gather-btn-upgrades');
      if (gatherBtn) gatherBtn.textContent = t('btn.gather');
      const buyLabel = upgradesSection.querySelector('.multiplier-selector label');
      if (buyLabel) buyLabel.textContent = t('label.buyQuantity');
    }
    // Cultivation screen
    const cultivationSection = document.getElementById('screen-cultivation');
    if (cultivationSection) {
      const h2c = cultivationSection.querySelector('h2');
      if (h2c) h2c.textContent = t('h2.cultivation');
      const introP = cultivationSection.querySelector('p');
      if (introP) introP.textContent = t('p.cultivation.intro');
      const h3s = cultivationSection.querySelectorAll('h3');
      h3s.forEach(h3 => {
        const text = h3.textContent.trim();
        // Use loose matching at the start of the string so that trailing
        // punctuation (e.g. "–") does not prevent translation of the section
        // headers.  This ensures headings like "Techniques –" or
        // "Research –" are translated properly.
        if (/^Techniques/i.test(text)) {
          h3.textContent = t('h3.techniques');
        } else if (/^Research/i.test(text)) {
          h3.textContent = t('h3.research');
        } else if (/^Alchemy/i.test(text)) {
          h3.textContent = t('h3.alchemy');
        }
      });
    }
    // Sect recruitment screen
    const sectRecruit = document.getElementById('screen-sect-recruitment');
    if (sectRecruit) {
      const h2r = sectRecruit.querySelector('h2');
      if (h2r) {
        // The header is updated dynamically elsewhere to include sect name.  Nothing to translate here.
      }
      const p = sectRecruit.querySelector('p');
      if (p) p.textContent = t('missionNote');
      const h3 = sectRecruit.querySelector('h3');
      if (h3) h3.innerHTML = `${t('disciplesExp')} (<span id="disciple-count">${document.getElementById('disciple-count') ? document.getElementById('disciple-count').textContent : '0'}</span>)`;
      const autoToggleLabel = sectRecruit.querySelector('.auto-send-toggle label');
      if (autoToggleLabel) {
        autoToggleLabel.lastChild.textContent = ' ' + t('autoSend');
      }
    }
    // Settings screen
    const settingsSection = document.getElementById('screen-settings');
    if (settingsSection) {
      const h2s = settingsSection.querySelector('h2');
      if (h2s) h2s.textContent = t('h2.settings');
    // Update all settings labels that declare a data-i18n attribute.  This
    // approach avoids relying on regex matching against existing text,
    // which can break when the current language is not English.  Each
    // label with a data-i18n attribute specifies the translation key
    // directly.  We remove any existing text nodes and then append the
    // translated label after any child elements (e.g. inputs or selects).
    const translatable = settingsSection.querySelectorAll('[data-i18n]');
    translatable.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const translatedText = t(key);
      // Remove all existing text nodes (both whitespace and non-whitespace)
      const toRemove = [];
      el.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          toRemove.push(node);
        }
      });
      toRemove.forEach(node => el.removeChild(node));
      // Determine if the label contains a select or range input.  For these
      // cases we insert the translation before the first such element so
      // that the label text appears preceding the control (e.g. "Theme:").
      const selectEl = el.querySelector('select');
      const rangeEl = el.querySelector('input[type="range"]');
      const insertBeforeEl = selectEl || rangeEl;
      if (insertBeforeEl) {
        const textNode = document.createTextNode(translatedText + ' ');
        el.insertBefore(textNode, insertBeforeEl);
      } else {
        // For checkbox labels: insert translation after the input element
        const needsSpace = el.childNodes.length > 0;
        const textNode = document.createTextNode((needsSpace ? ' ' : '') + translatedText);
        el.appendChild(textNode);
      }
    });
      // Theme options
      const themeSelect = document.getElementById('theme-select');
      if (themeSelect) {
        const optDark = themeSelect.querySelector('option[value="dark"]');
        if (optDark) optDark.textContent = t('option.theme.dark');
        const optLight = themeSelect.querySelector('option[value="light"]');
        if (optLight) optLight.textContent = t('option.theme.light');
      }
      // Background options
      const bgSelect = document.getElementById('bg-select');
      if (bgSelect) {
        for (let i = 0; i < bgSelect.options.length; i++) {
          const opt = bgSelect.options[i];
          const key = `option.background.${opt.value}`;
          opt.textContent = t(key);
        }
      }
      // Buttons
      const exportBtn = document.getElementById('export-save-btn');
      if (exportBtn) exportBtn.textContent = t('btn.exportSave');
      const importBtn = document.getElementById('import-save-btn');
      if (importBtn) importBtn.textContent = t('btn.importSave');
      const resetBtn = document.getElementById('reset-game-btn');
      if (resetBtn) resetBtn.textContent = t('btn.resetGame');
      // Language select label translation
      const langLabel = document.getElementById('language-select-label');
      if (langLabel) {
        const selectEl = langLabel.querySelector('select');
        // Remove any existing text nodes in the label to avoid duplication
        const children = Array.from(langLabel.childNodes);
        children.forEach(node => {
          if (node.nodeType === 3) langLabel.removeChild(node);
        });
        // Insert the translated label text before the select element
        const translatedLang = t('language.selectTitle');
        const textNode = document.createTextNode(translatedLang + ' ');
        if (selectEl) {
          langLabel.insertBefore(textNode, selectEl);
        } else {
          // Fallback: append translation if select is missing
          langLabel.appendChild(textNode);
        }
      }
    }
    // Modal translations (language selection modal)
    const langModal = document.getElementById('lang-modal');
    if (langModal) {
      const header = langModal.querySelector('h2');
      if (header) header.textContent = t('language.selectTitle');
      const confirmBtn = document.getElementById('lang-select-confirm');
      if (confirmBtn) confirmBtn.textContent = t('btn.ok');
    }

    // Story and Ascension headings
    // Update the headings of the Story and Ascension screens.  These elements are
    // defined in the static HTML and need to be translated whenever the
    // language changes.  The story heading uses the key 'h2.story', while
    // the ascension screen uses 'h2.ascension'.
    const storySection = document.getElementById('screen-story');
    if (storySection) {
      const h2story = storySection.querySelector('h2');
      if (h2story) h2story.textContent = t('h2.story');
    }
    const ascensionSection = document.getElementById('screen-ascension');
    if (ascensionSection) {
      const h2asc = ascensionSection.querySelector('h2');
      if (h2asc) h2asc.textContent = t('h2.ascension');
      // Translate the introductory paragraph of the ascension screen.  The first
      // <p> element contains the introduction text and is replaced with the
      // translated version using key 'p.ascension.intro'.
      const ascIntro = ascensionSection.querySelector('p');
      if (ascIntro) {
        ascIntro.textContent = t('p.ascension.intro');
      }
    }

    // Translate the story introduction paragraphs.  The #story-intro div
    // contains four <p> elements which we map to keys p.story.intro1…4.  If
    // additional paragraphs are present they will be left unchanged.
    const storyIntro = document.getElementById('story-intro');
    if (storyIntro) {
      const ps = storyIntro.querySelectorAll('p');
      ps.forEach((pElem, idx) => {
        const key = 'p.story.intro' + (idx + 1);
        try {
          const translated = t(key);
          if (translated && translated !== key) {
            pElem.textContent = translated;
          }
        } catch (e) {
          // ignore if translation fails
        }
      });
    }

    // Translate sect hub and hall pages
    // Sect hub introduction paragraph
    const sectHub = document.getElementById('screen-sect');
    if (sectHub) {
      const introP = sectHub.querySelector('p');
      if (introP) {
        try {
          introP.textContent = t('p.sectIntro');
        } catch (e) {
          // ignore translation failures
        }
      }
      // Translate hall labels within the sect hub 2×2 grid.  Match by original English text
      const hallLabels = sectHub.querySelectorAll('.hall-label');
      hallLabels.forEach(span => {
        const txt = span.textContent.trim();
        if (/^Management/i.test(txt)) {
          span.textContent = t('hall.management');
        } else if (/^Forging/i.test(txt)) {
          span.textContent = t('hall.forging');
        } else if (/^Dao/i.test(txt)) {
          span.textContent = t('hall.dao');
        } else if (/^Recruitment/i.test(txt)) {
          span.textContent = t('hall.recruitment');
        }
      });
    }
    // Management hall introduction
    const managementHall = document.getElementById('screen-sect-management');
    if (managementHall) {
      const pElem = managementHall.querySelector('p');
      if (pElem) {
        try {
          pElem.textContent = t('p.managementIntro');
        } catch (e) {}
      }
    }
    // Forging hall introduction and placeholder
    const forgingHall = document.getElementById('screen-sect-forging');
    if (forgingHall) {
      const pElem = forgingHall.querySelector('p');
      if (pElem) {
        try {
          pElem.textContent = t('p.forgingIntro');
        } catch (e) {}
      }
      const placeholder = document.getElementById('forging-placeholder');
      if (placeholder) {
        try {
          placeholder.textContent = t('p.forgingPlaceholder');
        } catch (e) {}
      }
    }
    // Dao hall introduction
    const daoHall = document.getElementById('screen-dao');
    if (daoHall) {
      const pElem = daoHall.querySelector('p');
      if (pElem) {
        try {
          pElem.textContent = t('p.daoHallIntro');
        } catch (e) {}
      }
    }
    // Recruitment hall introduction paragraph
    const recruitHall = document.getElementById('screen-sect-recruitment');
    if (recruitHall) {
      const firstP = recruitHall.querySelector('p');
      if (firstP) {
        try {
          firstP.textContent = t('p.recruitIntro');
        } catch (e) {}
      }
    }
    // Alchemy card headers
    const brewHeader = document.getElementById('alchemy-brewing-header');
    if (brewHeader) {
      try {
        brewHeader.textContent = t('card.brewing');
      } catch (e) {}
    }
    const inventoryHeader = document.getElementById('alchemy-inventory-header');
    if (inventoryHeader) {
      try {
        inventoryHeader.textContent = t('card.elixirInventory');
      } catch (e) {}
    }
  }

  // Expose helpers globally
  window.t = t;
  window.setLanguage = setLanguage;
  window.applyTranslations = applyTranslations;
  window.supportedLanguages = supportedLanguages;
})();