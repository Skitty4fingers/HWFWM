/* Essence & Ascension — Character Forge
 * data-index.js: Chapter 1 canon index (essences, confluences, derived families, awakening stones).
 * Source: HWFWM/Rulebook/Ch01_Canon_Index.json. Lore paraphrased; no novel text.
 */
(function (EA) {
  'use strict';

  var FAMILY = { AR: 'ARCANE', EL: 'ELEMENT', BE: 'BEAST', WA: 'WARD', WE: 'WEAPON', TO: 'TOOL', LI: 'LIFE', BO: 'BODY', MO: 'MOTION', SH: 'SHADOW', CO: 'COSMIC' };
  var RARITY = { C: 'Common', U: 'Uncommon', R: 'Rare', E: 'Epic', L: 'Legendary', '?': 'Unknown' };

  // name|rarity|family|theme   (all essence entries are [CANON-UNVERIFIED] in Ch1)
  var ESSENCE_ROWS = [
    'Adept|C|AR|Facilitates skill: precision, technique, proprioception; rarely grants skills outright',
    'Air|C|EL|General air manipulation; variety of abilities',
    'Ape|C|BE|Primate strength, climbing, intimidation',
    'Armour|C|WA|Protective plating, damage reduction',
    'Axe|C|WE|Heavy cleaving special attacks',
    'Balance|U|AR|Balances two ideas or powers; varies wildly with pairing; often retributive',
    'Bat|C|BE|Night flight, echolocation, draining bites',
    'Bear|C|BE|Toughness, mauling, bestial stances',
    'Bee|C|BE|Stings, hive coordination, swarming',
    'Bird|C|BE|Flight, aerial sight, avian aspects',
    'Blight|?|SH|Rot, plague, withering',
    'Blood|U|SH|Health-draining effects, especially with the Feast stone',
    'Bone|U|BO|Skeletal armour, bone weapons',
    'Bow|C|WE|Many ranged special attacks (a weapon essence)',
    'Brush|?|TO|Painting, inscribing',
    'Cage|C|WA|Confinement, enclosure, control',
    'Cat|C|BE|Agility, stealth, pouncing',
    'Cattle|C|BE|Endurance, charging, herd strength',
    'Chain|C|WA|Binding, reach, restraint',
    'Claw|U|BO|Rending natural weapons',
    'Cloth|C|TO|Garments, wraps, woven effects',
    'Cloud|U|EL|Mist, vapour, weather',
    'Cold|U|EL|Chill, slowing, freezing',
    'Coral|C|LI|Reef growth, shared regeneration, sharp barriers',
    'Corrupt|E|SH|Corruption, tainting; restricted',
    'Crocodile|C|BE|Ambush, crushing grapples',
    'Crystal|R|EL|Crystalline structure, focusing energy',
    'Dance|U|MO|Rhythm, flowing movement, performance',
    'Dark|U|SH|Shadow, darkness, concealment',
    'Death|U|SH|Necrotic power; usually produces Undeath (restricted)',
    'Deep|R|CO|Abyssal depths, pressure',
    'Deer|C|BE|Alertness, swiftness, antler strikes',
    'Dimension|L|CO|Movement, utility, evasion through space',
    'Discord|E|SH|Disruption, dissonance',
    'Dog|C|BE|Tracking, loyalty, pack tactics',
    'Duck|C|BE|Amphibious versatility; no essence is strictly inferior',
    'Dust|U|EL|Erosion, obscuring particles',
    'Earth|C|EL|Stone, terrain shaping, durability',
    'Echo|R|AR|Repetition, resonance, after-effects',
    'Elemental|E|EL|Multi-element versatility',
    'Eye|C|BO|Sight, perception, gaze effects',
    'Feast|C|LI|Consumption and sustenance; shared abundance',
    'Feeble|?|SH|Weakness, debilitation',
    'Fire|C|EL|Flame damage, burning, heat',
    'Fish|C|BE|Swimming, schooling, water breathing',
    'Flea|C|BE|Leaping, parasitic pests',
    'Flesh|U|BO|Body shaping, mutation',
    'Foot|C|BO|Kicks, footwork, mobility',
    'Fork|C|TO|Versatile: pitchfork or dining fork depending on combination',
    'Fox|C|BE|Trickery, cunning, illusion',
    'Frog|C|BE|Leaping, toxins, grasping tongue',
    'Fungus|C|LI|Spores, decay-driven growth',
    'Gathering|R|AR|Accumulation, collecting power',
    'Glass|U|EL|Shards, transparency, fragility',
    'Goat|C|BE|Climbing, ramming, sacrificial symbolism',
    'Grazen|C|BE|In-world creature aspect (details unconfirmed)',
    'Growth|U|LI|Boosting allies’ skills, abilities, and defense',
    'Gun|C|WE|Ranged special attacks (fewer than Bow)',
    'Hair|C|BO|Hair as weapon or tool; grasping strands',
    'Hammer|C|TO|Smithing, crushing blows',
    'Hand|C|BO|Unarmed strikes, manipulation',
    'Harmonic|E|AR|Resonance, harmony, synergy',
    'Heidel|C|BE|In-world creature aspect (details unconfirmed)',
    'Hook|C|TO|Catching, pulling, reeling',
    'Horse|C|BE|Speed, mounts, endurance',
    'Hunger|R|SH|Like Feast but narrower: consumption and craving',
    'Hunt|C|BE|Tracking, marking prey, predation',
    'Ice|U|EL|Freezing, barriers, slowing',
    'Iron|C|WA|Metal durability and craft',
    'Knife|C|WE|Fast close-range cuts, precision',
    'Knowledge|U|AR|Insight, analysis, lore',
    'Life|U|LI|Healing, vitality',
    'Light|U|EL|Generic light powers; behaves like a confluence (beams, healing, illusions, blinding)',
    'Lightning|U|EL|Shock, speed, chain strikes',
    'Lizard|C|BE|Regrowth, camouflage, cold blood',
    'Locust|C|BE|Devouring swarms, plague',
    'Lurker|?|BE|Hidden predation, stalking',
    'Magic|C|AR|General magical power; spells',
    'Malign|E|SH|Malice, hostile magic',
    'Manatee|C|BE|Gentle bulk, aquatic calm',
    'Might|C|BO|Raw strength and physical power',
    'Mirror|U|AR|Reflection, copying, illusion',
    'Monkey|C|BE|Agility, mischief, climbing',
    'Moon|R|CO|Lunar cycles, transformation, night',
    'Mouse|C|BE|Smallness, evasion, scurrying',
    'Myriad|L|CO|Multiplicity, many-at-once effects',
    'Needle|C|TO|Piercing precision, sewing',
    'Net|C|WA|Entangling, capture',
    'Octopus|C|BE|Grappling arms, ink, camouflage',
    'Omen|E|CO|Omens, symbolism, foresight',
    'Pangolin|C|BE|Armoured scales, rolling defense',
    'Paper|C|AR|Written and folded magic, scrolls',
    'Plant|C|LI|Vegetation growth and control',
    'Potent|E|AR|Raw potency; hybrid magic/melee with Might',
    'Pure|U|LI|Cleansing, purification',
    'Rabbit|C|BE|Speed, leaping, fertility',
    'Rake|C|TO|Gathering, raking strikes, farming',
    'Rat|C|BE|Scavenging, disease, swarms',
    'Renewal|E|LI|Healing and regeneration',
    'Resolute|R|WA|Determination, resisting effects',
    'Rune|E|AR|Runic magic, inscriptions',
    'Sand|U|EL|Shifting sand, desert erosion',
    'Sceptre|C|AR|Authority, command, rulership',
    'Serene|R|AR|Calm, clarity, suppression',
    'Shark|C|BE|Aquatic predation, blood frenzy',
    'Shield|C|WA|Defense and protection',
    'Shimmer|E|AR|Light-bending, illusion, flicker',
    'Ship|C|MO|Seafaring, carrying others',
    'Shovel|C|TO|Digging, earthworks',
    'Sickle|C|TO|Reaping, harvest cuts',
    'Sin|L|SH|Curses, cleansing, holy and unholy attacks',
    'Skunk|C|BE|Noxious sprays, deterrence',
    'Sloth|C|BE|Slowness, patience, endurance',
    'Smoke|U|SH|Obscuring, choking, stealth',
    'Snake|C|BE|Venom, constriction, coils',
    'Song|U|AR|Sound, music, morale',
    'Spear|C|WE|Reach, thrusts, throws',
    'Spider|C|BE|Webs, venom, ambush',
    'Spike|C|WE|Piercing spikes, caltrops, terrain hazards',
    'Staff|C|WE|Staff fighting, channeling focus',
    'Star|R|CO|Starlight, cosmic radiance',
    'Sun|R|CO|Solar radiance, burning light',
    'Swift|C|MO|Speed, movement, evasion',
    'Sword|C|WE|Blade techniques and special attacks',
    'Technology|C|TO|Devices, machinery, systems',
    'Tentacle|E|CO|Grasping eldritch limbs',
    'Thread|C|TO|Threads, binding, weaving',
    'Tooth|C|BO|Bites, tearing',
    'Trap|C|WA|Misdirection, catching enemies unaware',
    'Tree|C|LI|Rooted strength, wood, longevity',
    'Trowel|C|TO|Masonry, construction',
    'Turtle|C|BE|Shell defense, longevity',
    'Vast|L|CO|Scale, immensity, reach',
    'Vehicle|C|MO|Conveyances, transport, momentum',
    'Venom|U|SH|Poisons and toxins',
    'Visage|L|AR|Faces, identity, glamour',
    'Void|L|CO|Like Dimension but focused on physical reality',
    'Wasp|C|BE|Aggressive stings, swarms',
    'Water|C|EL|Water shaping, flow, healing',
    'Whale|C|BE|Immense size, song, depth',
    'Wheel|C|MO|Rolling momentum, cycles',
    'Whip|C|WE|Lashing reach, control',
    'Wind|C|EL|Air blasts and recovery effects',
    'Wing|E|MO|Movement and agility',
    'Wolf|C|BE|Pack hunting, howls',
    'Wood|?|LI|Timber, carving, growth',
    'Zeal|R|AR|Buffs, attacks, and resistances driven by fervour'
  ];

  /* Confluence groups. Format: Name[|R if always restricted]  ::  theme  ::  trios separated by ';'
   * Trio prefixes: '*' = [CANON] row, '!' = this trio is restricted. Everything else [CANON-UNVERIFIED]. */
  var CONF_ROWS = [
    'Doom (Confluence)::Stacking afflictions with delayed payoff::*Blood,Dark,Sin;Balance,Omen,Sin;Blight,Smoke,Venom;Blood,Corrupt,Flesh;Blood,Corrupt,Potent;Blood,Dark,Omen;Corrupt,Feast,Growth;Dark,Hunger,Void;Death,Dimension,Zeal;Death,Dimension,Void;Death,Dimension,Vast;Growth,Hunger,Void;Moon,Omen,Sun',
    'Dragon::Draconic might, breath attacks, flight::*Magic,Might,Wing;Magic,Potent,Wing',
    'Soaring::Flight and aerial mobility::Bird,Swift,Wind;Ship,Water,Wind;Swift,Vehicle,Wind',
    'Vision::Foresight and sight-based powers::Dimension,Knowledge,Magic;Dark,Omen,Serene;Eye,Magic,Mirror',
    'Arsenal::Conjured weapon array; rapid weapon swaps::Myriad,Shield,Sword',
    'Anzu::Giant storm-bird form; wing buffets::Bird,Cat,Vast',
    'Behemoth::Colossal size, trampling, endurance::Cattle,Earth,Vast',
    'Boundary::Barriers and zone denial::Balance,Earth,Shield',
    'Bounty::Shared abundance, feast buffs, knife flourishes::*Dance,Feast,Knife',
    'Desolate::Area decay, drain, attrition::Death,Hunger,Plant;Sand,Sun,Wind;Earth,Ice,Wind;Hunger,Locust,Plant;Blood,Hunger,Locust;Bone,Dust,Sun;Cold,Hammer,Sickle',
    'Discordant::Sonic disruption; corrupting songs::Bow,Corrupt,Song',
    'Doppelganger::Copying forms and abilities::Flesh,Magic,Mirror;Hunger,Magic,Mirror;Adept,Magic,Mirror',
    'Eclipse::Opposing forces in harmony; powerful finales::Balance,Dark,Light;Balance,Death,Life;*Balance,Moon,Sun;Balance,Omen,Zeal;Dimension,Moon,Sun',
    'Edifice::Constructing structures and fortifications::Earth,Trowel,Vast',
    'Effigy::Proxies, dolls, sympathetic links::Blood,Dark,Shimmer;Dance,Glass,Visage;Rune,Star,Tree',
    'Empower::Buffs to self and allies::Balance,Blood,Rune;Balance,Hunger,Magic;Blood,Growth,Hunger;Blood,Hunger,Might;Cat,Magic,Sun;Crystal,Magic,Sword;Elemental,Hunger,Potent;Elemental,Lightning,Sword;Flesh,Growth,Potent;Frog,Hunger,Void;Lightning,Swift,Sword;Magic,Might,Swift;Might,Renewal,Sin',
    'Fertile::Growth, spawning, ally regeneration::Cat,Fungus,Renewal',
    'Fey::Glamour, enchantment, otherworldly trickery::Magic,Pure,Visage',
    'Firebird::Flame flight, burning dives::Bird,Fire,Wind',
    'Action::Gunplay, vehicle stunts, cinematic combat::Gun,Hand,Vehicle',
    'Alchemy::Transmutation of substances, potions, toxin craft::Adept,Venom,Water',
    'Ambush::Traps and burst damage on unaware targets::Earth,Spike,Trap;Fire,Spider,Trap;Iron,Thread,Trap;Rune,Spider,Trap',
    'Animate::Animating objects or remains as minions::!Fungus,Growth,Zeal;Bone,Death,Magic;Cloth,Dance,Magic;Dance,Dust,Echo;Dance,Knowledge,Mirror',
    'Avatar::Summoning, enhancement, transformation, strong buffs::Blood,Bone,Flesh;Lightning,Might,Sword;Blood,Life,Sun;Corrupt,Dimension,Magic;Corrupt,Dimension,Might;Corrupt,Dimension,Potent;Corrupt,Magic,Void;Dark,Tentacle,Void;Dimension,Light,Wing;Dimension,Light,Zeal;Dimension,Might,Renewal;Dimension,Tentacle,Void;Elemental,Harmonic,Potent;Elemental,Might,Resolute;Eye,Fire,Magic;Hammer,Lightning,Might;Magic,Might,Potent;Potent,Vast,Water;Rune,Spear,Tree',
    'Battlefield::Terrain control: spikes and fortifications::Iron,Spike,Vast',
    'Cataclysm::Large-scale destructive areas::Fire,Potent,Water;Dimension,Myriad,Sin;Death,Myriad,Void;Hunger,Vast,Void',
    'Chaotic::Unpredictable power spikes::Balance,Magic,Potent',
    'Charlatan::Deception, misdirection, trick traps::*Adept,Magic,Trap',
    'Chimera::Composite beast traits::Cat,Tentacle,Void;Earth,Pangolin,Shark;Lizard,Spider,Wolf;Rat,Skunk,Snake;Snake,Spider,Venom',
    'Cyborg|R::Body augmentation with metal and technology::Death,Flesh,Iron;Flesh,Iron,Myriad;Flesh,Myriad,Technology;Flesh,Iron,Technology;Flesh,Magic,Water;Flesh,Might,Technology',
    'Cycle::Alternating phases; renewal loops::Balance,Light,Renewal;Corrupt,Pure,Renewal;Moon,Renewal,Sun',
    'Dawn::Radiant healing; purging darkness::Renewal,Sun,Water;Dark,Light,Sun;Fire,Omen,Sun',
    'Force::Kinetic force, shields, telekinesis::Adept,Magic,Might;Balance,Might,Potent;Magic,Potent,Shield',
    'Forge::Crafting and weapon enhancement::Bird,Fire,Iron;*Fire,Hammer,Iron;Fire,Iron,Technology;Fire,Iron,Water;Iron,Lightning,Technology',
    'Fortress::Immovable defense, damage reduction::Earth,Iron,Shield',
    'Garuda::Swift aerial striker::Might,Swift,Wing;Bird,Might,Swift',
    'Gate::Portals and teleportation::Dimension,Magic,Rune;Dimension,Magic,Void;Dimension,Myriad,Rune',
    'Glimeron::Reflective fire-venom creature aspect (details unconfirmed)::Fire,Mirror,Venom',
    'Gorgon::Petrifying gaze, serpent hair::Earth,Hair,Snake',
    'Griffin::Aerial predator; pounces::Bird,Cat,Might',
    'Guardian::Protecting allies; wards::Knowledge,Manatee,Sand;Magic,Shield,Void;Shield,Trap,Void',
    'Harpy::Discordant shrieks; raking flyers::Bird,Discord,Song;Claw,Malign,Song;Discord,Song,Wing',
    'Harvest::Reaping; sustenance from the fallen::Earth,Plant,Sickle;Axe,Hunt,Plant',
    'Hydra::Multiplying attacks; regeneration::Deep,Myriad,Potent;Myriad,Renewal,Snake',
    'Immortal::Extreme survival and regeneration::Blood,Potent,Renewal;Growth,Might,Renewal;Life,Magic,Renewal',
    'Juggernaut::Unstoppable charges; momentum::Iron,Might,Swift;Might,Swift,Vehicle',
    'Karmic::Good and bad karma reciprocity::*Balance,Magic,Rune;Omen,Rune,Star',
    'Kraken::Grappling tentacles; sea dominance::Might,Octopus,Vast;Deep,Might,Octopus',
    'Leviathan::Massive aquatic power::Deep,Might,Vast;Fish,Vast,Water',
    'Lotus::Purification, water-plant harmony, healing::Harmonic,Plant,Water;Plant,Sword,Water',
    'Magitech::Magic-powered devices::Armour,Magic,Technology;Lightning,Magic,Technology',
    'Manticore::Venomous spiked beast::Cat,Spike,Venom',
    'Master::Skill mastery and precision technique::Adept,Swift,Sword;Adept,Bow,Swift;Adept,Cloth,Needle;Adept,Dance,Sword;Adept,Dance,Whip;Adept,Fire,Hammer;Adept,Fire,Iron;Adept,Foot,Hand;Adept,Gun,Hand;Adept,Iron,Technology;Adept,Knife,Smoke;Adept,Magic,Potent;Adept,Magic,Sword;Adept,Needle,Thread;Adept,Thread,Whip;Adept,Gathering,Gun;*Adept,Myriad,Sword;Cloth,Needle,Thread;Dance,Song,Sword;Dance,Sword,Thread;Foot,Knife,Swift',
    'Ministration::Dedicated healing and cleansing::Life,Pure,Renewal',
    'Minotaur::Charging brute; labyrinth control::Cattle,Hunt,Might;Cattle,Might,Trap',
    'Mirage::Illusions and displacement::Dimension,Shimmer,Vast;Fire,Light,Water;Sand,Sun,Visage;Sun,Vast,Visage',
    'Monolith::Unshakeable stone might::Earth,Growth,Might',
    'Mystic::Bolsters the user’s skills; martial self-enhancement::Adept,Water,Wind;Balance,Dimension,Harmonic;Balance,Hand,Iron;*Balance,Swift,Wind;Balance,Swift,Sword;Blood,Renewal,Sword;Dark,Knowledge,Pure;Dark,Song,Vast;Harmonic,Knowledge,Pure;Magic,Might,Staff;Magic,Omen,Vast;Magic,Sword,Wind;Iron,Might,Serene',
    'Nebula::Expansive cosmic clouds; area obscuring::Cloud,Vast,Void',
    'Nemesis::Reflecting harm; marking rivals::Balance,Mirror,Void',
    'Network::Linking allies and systems; information sharing::*Myriad,Technology,Vast',
    'Oasis::Restorative water zones::Earth,Sand,Water',
    'Ocean::Vast water control; naval mobility::Vast,Vehicle,Water',
    'Onslaught::Relentless offense::Adept,Might,Potent;Adept,Might,Swift;Bow,Gathering,Myriad;Fire,Gun,Vehicle;Growth,Might,Zeal;Gun,Might,Potent;Gun,Might,Vehicle;Gun,Vehicle,Wind;Hand,Might,Swift;Might,Potent,Swift;Might,Potent,Vast;Might,Swift,Wind',
    'Phantasmagoria::Mass illusions::Myriad,Vast,Visage',
    'Phoenix::Fire and resurrection::Fire,Renewal,Wing',
    'Predatory::Hunting marks and executes::Bow,Dark,Hunt;Bow,Hunt,Trap;Bow,Spider,Trap;Hunt,Myriad,Wolf;Spear,Spider,Wing',
    'Prison::Containment and binding::Cage,Lightning,Myriad;Cage,Rune,Trap;Chain,Iron,Myriad;*Gathering,Iron,Might;Shield,Trap,Vast',
    'Prosperity::Abundance, support, team sustain::Adept,Balance,Renewal;Balance,Renewal,Rune;Feast,Foot,Rabbit;Growth,Omen,Sun;*Growth,Renewal,Shield;Magic,Rune,Vast',
    'Refracting::Splitting and redirecting effects::Balance,Echo,Ice',
    'Resonating::Vibration; amplified sound::Bird,Needle,Song;Crystal,Harmonic,Serene;Echo,Swift,Wind',
    'Roc::Giant bird; carrying; gusts::Bird,Might,Vast',
    'Sacrifice|R::Power at a cost; blood rites::Blood,Dimension,Goat;Dimension,Knife,Sin;Hunger,Knife,Sun',
    'Scribe::Written magic, scrolls, records::Hand,Paper,Rune;Knowledge,Paper,Serene;Knowledge,Paper,Rune',
    'Serpent::Coiling strikes; elemental serpents::Fire,Iron,Snake;Fire,Snake,Water;Fire,Snake,Wind',
    'Simulacrum::Constructed doubles::Paper,Sword,Visage',
    'Skirmish::Hit-and-run ranged tactics::Adept,Bow,Hunt',
    'Sky::Weather and open-air dominance::Cloud,Swift,Wind;Moon,Star,Sun;Star,Sun,Vast',
    'Sovereign::Command and authority auras::Adept,Balance,Potent;Adept,Potent,Sceptre;Dark,Sin,Water;Flesh,Magic,Thread',
    'Stellar::Starlight power; cosmic radiance::Dark,Star,Sun',
    'Storm::Lightning, wind, weather fury::Cloud,Crystal,Wind;Deep,Vast,Wind;Dust,Ice,Wind;Earth,Fire,Wind;Fire,Gun,Lightning;Fire,Potent,Wind;Hammer,Lightning,Rune;Lightning,Magic,Wind;Lightning,Potent,Wind;Sand,Vast,Wind',
    'Succubus|R::Charm and life drain::Flesh,Sin,Visage;Hunger,Magic,Sin',
    'Swarm::Many small attackers::Bat,Rabbit,Rat;Blood,Myriad,Wing;Dark,Fire,Rat;Duck,Flea,Foot;Fire,Venom,Wasp;Potent,Venom,Wasp',
    'Talisman::Charms and paper wards::Magic,Paper,Rune',
    'Thunderbird::Lightning flight::Bird,Lightning,Vast',
    'Time::Haste, slow, temporal manipulation::Balance,Dimension,Swift;Dimension,Vast,Void',
    'Tranquil::Calming and suppression::Balance,Moon,Water;Corrupt,Death,Serene;Serene,Tree,Vast',
    'Transfiguration::Shapeshifting, transmutation, or both::Adept,Elemental,Magic;Axe,Bear,Moon;Balance,Earth,Iron;Balance,Fire,Ice;Bear,Growth,Hand;Bird,Mouse,Whale;Blood,Fire,Iron;Deer,Earth,Hammer;Flesh,Growth,Water;!Hunger,Moon,Wolf;Hunt,Moon,Wolf',
    'Transgression::Crossing boundaries; forbidden power::Bird,Water,Wind;Fish,Water,Wind;Corrupt,Pure,Sin;Death,Dimension,Magic;Death,Life,Sin;Moon,Myriad,Sun',
    'Troll::Regeneration and brute toughness::Blood,Might,Renewal',
    'Twilight::Light-dark transitions; stealth::Dark,Light,Moon;Moon,Omen,Wind',
    'Undeath|R::Necromantic power::Bat,Blood,Death;Blood,Bone,Corrupt;Blood,Corrupt,Dark;Blood,Dark,Death;Blood,Death,Duck;Blood,Death,Hunger;Blood,Death,Hunt;Blood,Death,Moon;Blood,Death,Sin;Blood,Death,Snake;Blood,Death,Spider;Blood,Death,Visage;Blood,Death,Wolf;Bone,Corrupt,Dance;Bone,Corrupt,Flesh;Corrupt,Dance,Flesh;Death,Flesh,Hunger;Death,Magic,Sand',
    'Unity::Linking many into one::Mirror,Myriad,Technology;Harmonic,Myriad,Vast',
    'Verdant::Plant growth; terrain::Earth,Plant,Rake;Earth,Plant,Vast;Earth,Shovel,Water',
    'Vessel::Containing and channeling power::Balance,Blood,Crystal;Balance,Blood,Hunger;Balance,Life,Needle;Cloud,Growth,Vehicle;Crystal,Magic,Potent;Death,Vehicle,Water;Dimension,Vast,Vehicle;Duck,Iron,Vast;Duck,Iron,Visage;Gathering,Magic,Star;Iron,Sin,Wind;Knowledge,Technology,Vast;Rat,Swift,Water;Technology,Vehicle,Wind',
    'Volcano::Magma and eruptions::*Earth,Fire,Potent;Earth,Fire,Vast',
    'Vortex::Pulling and spatial distortion::Corrupt,Dimension,Void;Dark,Void,Wind;Deep,Vast,Void;Dimension,Hunger,Void;Feast,Magic,Void;Shark,Water,Wind;Trap,Void,Wind',
    'Weave::Thread-based control; fate weaving::Dance,Myriad,Thread;Dance,Needle,Thread;Harmonic,Myriad,Omen',
    'Wendigo|R::Ravenous transformation::Flesh,Hunger,Might',
    'Wrath::High offense; propensity for transcendent damage::Balance,Might,Zeal;Balance,Potent,Zeal;Might,Potent,Zeal;Blood,Might,Potent;Balance,Blood,Might;Fire,Light,Zeal;Fire,Light,Potent;Dimension,Light,Potent;Adept,Fire,Zeal',
    'Ziz::Giant sky beast::Bird,Vast,Wind'
  ];

  // Ch1 §1.3.3 conflicts: the listed result above is the Preferred value; the alternative is offered under Shifting Confluence.
  var CONFLICT_ALT = { 'Balance, Swift, Wind': 'Soaring', 'Deep, Myriad, Potent': 'Kraken', 'Growth, Might, Renewal': 'Onslaught' };

  // Ch1 §1.3.4 derived family confluences [DERIVED]
  var DERIVED = {
    BEAST: ['Menagerie', 'Borrowed beast aspects: summons, partial shapeshifts, natural weapons'],
    WEAPON: ['Panoply', 'Conjured weapon sets; chained special attacks'],
    ELEMENT: ['Maelstrom', 'Multi-element blasts and hazard zones'],
    TOOL: ['Artisan', 'Field crafting, constructs, item empowerment'],
    BODY: ['Visceral', 'Self-empowerment, body reshaping, grapples'],
    ARCANE: ['Arcanum', 'Spell versatility; technique and rune augmentation'],
    COSMIC: ['Firmament', 'Large-area spatial and celestial control'],
    SHADOW: ['Perdition', 'Curses and stacking afflictions'],
    LIFE: ['Wellspring', 'Healing, regeneration fields, growth'],
    MOTION: ['Velocity', 'Mobility and momentum-based damage'],
    WARD: ['Bulwark', 'Protection, retaliation, battlefield control'],
    MIXED: ['Mosaic', 'Hybrid kit: each confluence slot draws its theme from one component essence, chosen at awakening']
  };

  /* Awakening stones (Ch1 §1.4.5). name|canon rarity|grade|lock|grave template|tag(c/u)
   * grade: S Standard, H High-Grade, G Grave, D Divine; trailing p = provisional. */
  var STONE_ROWS = [
    'Earth|Common|S|||u', 'the Eyes|Common|S|Perception||c', 'the Feast|Common|S|Drain||c', 'Feeble|Common|S|||u',
    'Fire|Common|S|||u', 'Fish|Common|S|||u', 'the Foot|Common|S|Special Attack (unarmed) or Movement||c', 'Gun|Common|S|||u',
    'the Hand|Common|S|Special Attack (unarmed)||c', 'the Magus|Common|S|Spell||c', 'Mediocrity|Common|S|||u', 'Plant|Common|S|||u',
    'the Rain|Common|S|||c', 'Rat|Common|S|||u', 'Shield|Common|S|||u', 'Snake|Common|S|||u',
    'Acid|Uncommon|S|||u', 'Anticipation|Uncommon|S|||u', 'Flesh|Uncommon|S|||u', 'Focus|Uncommon|S|Self-Buff||c',
    'Preparation|Uncommon|S|||c', 'Reach|Uncommon|S|||u', 'Song|Uncommon|S|||u', 'the Surge|Uncommon|S|||c',
    'Vision|Uncommon|S|||u', 'Wrath|Uncommon|S|Retribution||c',
    'Adventure|Rare|H|Utility||c', 'Judgement|Rare|H|Debuff or Sentence||c', 'Persistence|Rare|H|||u', 'Ruin|Rare|H|||u',
    'Absolution|Epic|H|Cleanse or Holy Attack||c', 'Calling|Epic|H|||u', 'the Champion|Epic|H|Summon or Ally Buff||c',
    'Inevitability|Epic|H|||u', 'the Moment|Epic|H|Timed Burst||c', 'Omens|Epic|H|Aura||c', 'Purgation|Epic|H|Cleanse||c',
    'the Sky|Epic|H|Flight or Anti-air||c', 'the Stars|Epic|H|Utility or Concealment||c',
    'the Apocalypse|Legendary|G||Annihilation|c', 'the Avatar|Legendary|G|Summon, Transformation, or Buff|Ascendant|c',
    'the Celestials|Legendary|G|Racial Gift Enhancement|Astral|c', 'Dimension|Legendary|G||Threshold|u', 'Gate|Legendary|G||Threshold|u',
    'Karma|Legendary|G|Karma Effect|Ledger|c', 'the Reaper|Legendary|G|Offensive Utility|Reaper|c', 'Rebirth|Legendary|G|Recovery|Undying|c',
    'Air|Unknown|Sp|||u', 'Barrier|Unknown|Sp|||u', 'Bow|Unknown|Sp|||u', 'Death|Unknown|Hp|||u', 'Defiance|Unknown|Sp|||u',
    'Echo|Unknown|Sp|||u', 'Elastic|Unknown|Sp|||u', 'Growth|Unknown|Sp|||u', 'the Hunt|Unknown|Sp|||u', 'Lightning|Unknown|Sp|||u',
    'Might|Unknown|Sp|||u', 'Myriad|Unknown|Hp|||u', 'Potency|Unknown|Sp|||u', 'Radiant|Unknown|Sp|||u', 'Sand|Unknown|Sp|||u',
    'the Spider|Unknown|Sp|||u', 'Swiftness|Unknown|Sp|||u', 'Sword|Unknown|Sp|||u', 'Wall|Unknown|Sp|||u', 'Water|Unknown|Sp|||u',
    'Wheel|Unknown|Sp|||u', 'Wind|Unknown|Sp|||u', 'the Nest|Not found|Sp|||u'
  ];

  // ---- build structures ----
  var essences = ESSENCE_ROWS.map(function (row) {
    var p = row.split('|');
    return { name: p[0], rarity: RARITY[p[1]], family: FAMILY[p[2]], theme: p[3], tag: 'unverified' };
  });
  var essenceByName = {};
  essences.forEach(function (e) { essenceByName[e.name] = e; });

  function trioKey(arr) { return arr.slice().sort().join(', '); }

  var confluenceMap = {};   // key -> {name, tag, theme, restricted}
  var confluenceNames = {}; // name -> {theme, restrictedAll, trios:[]}
  CONF_ROWS.forEach(function (row) {
    var parts = row.split('::');
    var head = parts[0].split('|');
    var name = head[0], restrictedAll = head[1] === 'R';
    var theme = parts[1];
    confluenceNames[name] = { theme: theme, restrictedAll: restrictedAll, trios: [] };
    parts[2].split(';').forEach(function (t) {
      var canon = false, restr = restrictedAll;
      if (t.charAt(0) === '*') { canon = true; t = t.slice(1); }
      if (t.charAt(0) === '!') { restr = true; t = t.slice(1); }
      var key = trioKey(t.split(','));
      confluenceNames[name].trios.push(key);
      if (!confluenceMap[key]) confluenceMap[key] = { name: name, tag: canon ? 'canon' : 'unverified', theme: theme, restricted: restr };
    });
  });

  var GRADE = { S: 'Standard', H: 'High-Grade', G: 'Grave', D: 'Divine' };
  var stones = STONE_ROWS.map(function (row, i) {
    var p = row.split('|');
    var g = p[2];
    return {
      id: 'AS-' + String(i + 1).padStart(3, '0'),
      name: 'Awakening Stone of ' + p[0],
      rarity: p[1],
      grade: GRADE[g.charAt(0)],
      provisional: g.length > 1,
      lock: p[3] || '',
      template: p[4] || '',
      tag: p[5] === 'c' ? 'canon' : 'unverified'
    };
  });
  stones.push({ id: 'AS-072', name: 'Divine Awakening Stone of Persistence', rarity: 'Rare (divine)', grade: 'Divine', lock: 'Fixed result', template: '', tag: 'canon', fixed: 'Curse of Isolation (Dark essence)' });
  stones.push({ id: 'AS-073', name: 'Divine Awakening Stone of Inevitability', rarity: 'Epic (divine)', grade: 'Divine', lock: 'Fixed result', template: '', tag: 'canon', fixed: 'Inevitable Demise (Doom (Confluence) aura)' });

  EA.data = EA.data || {};
  EA.data.essences = essences;
  EA.data.essenceByName = essenceByName;
  EA.data.confluenceMap = confluenceMap;
  EA.data.confluenceNames = confluenceNames;
  EA.data.conflictAlt = CONFLICT_ALT;
  EA.data.derived = DERIVED;
  EA.data.stones = stones;
  EA.data.trioKey = trioKey;
  EA.data.rarityRank = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Unknown: 2, Common: 1 };
})(window.EA = window.EA || {});
