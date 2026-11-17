/* Essence & Ascension — GM desk
 * bestiary.js: canon creatures. Names and ranks come from the novels (via the series wiki);
 * stats, Steps, threat tiers and kits are game builds made with the Ch3 pricing rules.
 *
 * Entry: [name, rank (-1 = Normal), Step, threat (0.5 Minion, 1 Standard, 2 Elite, 4 Solo),
 *         stats [Power, Speed, Spirit, Recovery], Basic Attack stat, description, kit]
 * Kit item: [name, kind, stat, CD, flags]
 *   kind: S Special Attack, M Spell, H healing spell, G shield spell, R Reaction, P Passive
 *   flags (space separated): a area, B2/P3/N2/D3 affliction rider (Bleed, Poison, Necrosis, Doom) with stacks,
 *   drain, exec, ctl (lose next Major), ctlm (and next Move), debuff, move, react,
 *   amp:Aff, det:Aff, elo:Aff, hpreg, mpreg, spreg, hpmax, dr (5% damage reduction)
 */
(function (EA) {
  'use strict';
  var G = EA.gm, A = EA.abilities;

  var ROWS = [
    // ---------------- Normal rank (lesser monsters; play as Iron 0) ----------------
    ['Carnivorous Mandrake', -1, 0, 0.5, [8, 6, 12, 10], 'Power', 'A rooted plant monster with a mouth where its flower should be. Its shriek carries.',
      [['Root Bite', 'S', 'Power', 2, ''], ['Shriek', 'M', 'Spirit', 4, 'a']]],
    ['Flying Eel', -1, 0, 0.5, [8, 14, 8, 8], 'Speed', 'Swims through the air as if it were water. Fast, slippery, and bitey.',
      [['Darting Bite', 'S', 'Speed', 2, ''], ['Coil and Shock', 'S', 'Speed', 4, 'debuff']]],
    ['Malicious Hedgehog', -1, 0, 0.5, [8, 12, 6, 12], 'Speed', 'Small, spiteful and covered in quills it is happy to share.',
      [['Quill Burst', 'S', 'Speed', 4, 'a B1'], ['Spiteful Nip', 'S', 'Speed', 2, '']]],
    ['Potent Hamster', -1, 0, 0.5, [10, 14, 6, 8], 'Speed', 'Far stronger than anything that size has a right to be.',
      [['Frenzied Nibble', 'S', 'Speed', 2, 'B1'], ['Cheek-Pouch Barrage', 'S', 'Speed', 4, '']]],
    ['Tyrannical Pheasant', -1, 0, 0.5, [10, 12, 8, 8], 'Power', 'A bird that believes the forest floor belongs to it, and enforces the belief.',
      [['Imperious Peck', 'S', 'Power', 2, ''], ['Wing Buffet', 'S', 'Power', 4, 'debuff']]],
    ['Sparkle Worms', -1, 0, 0.5, [6, 10, 10, 8], 'Speed', 'Glittering burrowers that spit shimmering muck at anything that steps on them.',
      [['Glitter Spit', 'M', 'Spirit', 3, 'debuff'], ['Burrow Bite', 'S', 'Speed', 2, '']]],
    ['Stone Chewer Rats', -1, 0, 0.5, [10, 12, 6, 10], 'Power', 'Rats that eat through rock, and through boots.',
      [['Gnaw', 'S', 'Power', 2, 'B1'], ['Swarm Up', 'S', 'Power', 4, '']]],

    // ---------------- Iron ----------------
    ['Ratlings', 0, 1, 0.5, [10, 16, 6, 10], 'Speed', 'Upright rat-folk monsters that come in packs. Dangerous in numbers, flimsy alone.',
      [['Swarm Bite', 'S', 'Speed', 2, 'B1'], ['Rusty Shank', 'S', 'Speed', 3, '']]],
    ['Shab', 0, 1, 0.5, [10, 16, 6, 10], 'Speed', 'Lean scavenger monsters that harry the edges of a fight.',
      [['Snapping Bite', 'S', 'Speed', 2, ''], ['Hamstring', 'S', 'Speed', 4, 'debuff']]],
    ['Sand Shab', 0, 3, 0.5, [10, 16, 8, 12], 'Speed', 'A desert shab that hides under the sand and bites from below.',
      [['Under-Sand Bite', 'S', 'Speed', 2, 'P1'], ['Sand Spray', 'S', 'Speed', 4, 'debuff']]],
    ['Belch Bug', 0, 2, 1, [8, 12, 16, 12], 'Power', 'A bloated insect that weaponises its digestion.',
      [['Acid Belch', 'M', 'Spirit', 3, 'a P2'], ['Mandible Snap', 'S', 'Power', 2, '']]],
    ['Pixelax', 0, 2, 1, [8, 14, 18, 10], 'Speed', 'A flickering, light-bending monster that dazzles before it strikes.',
      [['Prism Bolt', 'M', 'Spirit', 3, ''], ['Dazzle', 'M', 'Spirit', 5, 'ctl']]],
    ['Fergax', 0, 3, 1, [14, 14, 10, 14], 'Power', 'A quick, all-round predator. Pounces, rends, retreats.',
      [['Rend', 'S', 'Power', 3, 'B2'], ['Pounce', 'S', 'Speed', 4, 'move']]],
    ['Trap Weavers', 0, 3, 1, [10, 16, 12, 10], 'Speed', 'Spider monsters that string trap lines before they show themselves. Their silk makes fine armour.',
      [['Venom Fang', 'S', 'Speed', 3, 'P2'], ['Snare Line', 'S', 'Speed', 4, 'ctl']]],
    ['Bark Lurker', 0, 3, 1, [18, 10, 8, 16], 'Power', 'Looks like a tree trunk until it moves. Waits beside game trails.',
      [['Ambush Strike', 'S', 'Power', 3, 'B2'], ['Bark Hide', 'P', '', 0, 'dr hpmax']]],
    ['Margoll', 0, 4, 1, [14, 12, 12, 14], 'Power', 'A heavy-set brawler monster with a bellow that rattles teeth.',
      [['Club Swing', 'S', 'Power', 3, ''], ['Bellow', 'M', 'Spirit', 5, 'a debuff']]],
    ['Earth Elemental (lesser)', 0, 4, 1, [18, 8, 10, 18], 'Power', 'Animate stone, slow and patient. Hard to hurt, harder to move.',
      [['Stone Fist', 'S', 'Power', 3, ''], ['Tremor', 'S', 'Power', 5, 'a'], ['Stone Body', 'P', '', 0, 'dr hpmax']]],
    ['Sand Elemental (lesser)', 0, 4, 1, [12, 14, 16, 12], 'Speed', 'A walking sandstorm that strips skin and blinds.',
      [['Sandblast', 'M', 'Spirit', 3, 'B1'], ['Dust Devil', 'M', 'Spirit', 5, 'a debuff']]],
    ['Spotted Tree Cat', 0, 5, 1, [14, 20, 8, 10], 'Speed', 'Drops from the canopy onto whatever looks weakest.',
      [['Drop Pounce', 'S', 'Speed', 3, 'exec'], ['Raking Claws', 'S', 'Speed', 4, 'B3']]],
    ['Mangrove Snatcher', 0, 5, 1, [14, 18, 8, 12], 'Speed', 'A tangle of root-limbs in the mangroves that grabs and drags prey into the water.',
      [['Snatch', 'S', 'Speed', 3, 'ctl'], ['Root Lash', 'S', 'Power', 4, 'B2']]],
    ['Rat Gorger', 0, 5, 2, [18, 12, 8, 16], 'Power', 'A bloated rat monster that leads ratling packs and eats what they bring down.',
      [['Gorge', 'S', 'Power', 3, 'drain'], ['Trample', 'S', 'Power', 5, 'a']]],
    ['Bog Shambler', 0, 4, 2, [16, 8, 12, 18], 'Power', 'A heap of mud and rot that pulls itself back together.',
      [['Mire Slam', 'S', 'Power', 3, ''], ['Rot Spores', 'M', 'Spirit', 5, 'a N2'], ['Reknit', 'P', '', 0, 'hpreg hpreg']]],
    ['Demon Sloth', 0, 6, 2, [20, 6, 12, 18], 'Power', 'Enormous, slow and lazy until it decides you are worth the effort.',
      [['Lazy Maul', 'S', 'Power', 5, ''], ['Soporific Yawn', 'M', 'Spirit', 6, 'ctl']]],
    ['Rune Tortoise', 0, 6, 2, [14, 6, 16, 20], 'Power', 'A slow, rune-carved tortoise. Magic flows along its shell. Some adventurers keep one as a familiar.',
      [['Rune Bolt', 'M', 'Spirit', 3, ''], ['Rune Shell', 'G', 'Spirit', 5, ''], ['Carved Shell', 'P', '', 0, 'dr dr']]],
    ['Marbula', 0, 6, 2, [10, 12, 18, 14], 'Power', 'A marbled, stone-skinned caster monster that cracks the ground with pulses of force.',
      [['Marbled Ray', 'M', 'Spirit', 3, 'N2'], ['Shatterpulse', 'M', 'Spirit', 5, 'a']]],
    ['Giant Desert Maw Spider', 0, 7, 4, [18, 14, 10, 16], 'Power', 'A spider the size of a cart that waits in a funnel of sand with its mouth open.',
      [['Maw Lunge', 'S', 'Power', 3, 'P2'], ['Burrow Burst', 'S', 'Power', 5, 'a'], ['Web Spray', 'S', 'Speed', 4, 'debuff']]],
    ['Marsh Wyrm', 0, 8, 4, [18, 12, 12, 16], 'Power', 'A long, armoured serpent of the marshes. The biggest thing an Iron team should pick a fight with.',
      [['Wyrm Bite', 'S', 'Power', 3, 'B2'], ['Swamp Breath', 'M', 'Spirit', 5, 'a P3'], ['Tail Sweep', 'S', 'Power', 4, 'a']]],

    // ---------------- Bronze ----------------
    ['Grizzard', 1, 4, 1, [18, 14, 8, 14], 'Power', 'A scaled, bear-sized brute that charges first and thinks never.',
      [['Maul', 'S', 'Power', 3, 'B2'], ['Charge', 'S', 'Speed', 4, 'move']]],
    ['Tidal Troll', 1, 3, 2, [18, 10, 8, 18], 'Power', 'A coastal troll that heals almost as fast as you can cut it, and hits like a breaking wave.',
      [['Pummel', 'S', 'Power', 3, ''], ['Crushing Wave', 'S', 'Power', 5, 'a'], ['Troll Blood', 'P', '', 0, 'hpreg hpreg']]],
    ['Tartarian Brute', 1, 5, 2, [20, 10, 8, 16], 'Power', 'Pure muscle. Finishes what it starts.',
      [['Brutal Smash', 'S', 'Power', 3, 'exec'], ['Ground Pound', 'S', 'Power', 5, 'a']]],
    ['Sanguine Horror', 1, 5, 2, [12, 12, 18, 14], 'Power', 'A thing of living blood. Opens wounds, drinks from them, then bursts them.',
      [['Blood Lash', 'M', 'Spirit', 3, 'B3 drain'], ['Hemorrhage Burst', 'M', 'Spirit', 5, 'a det:Bleed']]],
    ['Marsh Hydra', 1, 6, 4, [18, 12, 12, 18], 'Power', 'Many heads, many bites, and the necks grow back.',
      [['Many Heads', 'S', 'Power', 2, ''], ['Venom Spit', 'M', 'Spirit', 4, 'a P3'], ['Regrowth', 'P', '', 0, 'hpreg hpmax']]],
    ['Siege Golem', 1, 7, 4, [20, 6, 8, 20], 'Power', 'A construct built to knock down walls. Shrugs off most of what hits it.',
      [['Ram', 'S', 'Power', 3, ''], ['Quake', 'S', 'Power', 6, 'a debuff'], ['Siege Plating', 'P', '', 0, 'dr dr']]],
    ['Mountain Wyrm', 1, 8, 4, [20, 12, 12, 16], 'Power', 'A wyrm of the high passes, armoured in stone-like scale.',
      [['Rending Bite', 'S', 'Power', 3, 'B2'], ['Rockslide Breath', 'M', 'Spirit', 5, 'a'], ['Coil', 'S', 'Power', 4, 'ctl']]],

    // ---------------- Silver ----------------
    ['Stormspire Drakes', 2, 3, 1, [12, 18, 14, 10], 'Speed', 'Flights of small lightning-breathing drakes that nest on storm-struck peaks.',
      [['Talon Dive', 'S', 'Speed', 3, ''], ['Lightning Breath', 'M', 'Spirit', 4, 'a']]],
    ['Energy Ghoul', 2, 3, 1, [12, 18, 14, 10], 'Speed', 'A ghoul that feeds on mana and vitality rather than flesh.',
      [['Siphon Claw', 'S', 'Speed', 3, 'drain'], ['Mana Leech', 'M', 'Spirit', 4, 'N2']]],
    ['Vortex Elemental', 2, 4, 2, [10, 16, 18, 12], 'Speed', 'A spinning column of wind that pulls everything toward its centre.',
      [['Gale Lance', 'M', 'Spirit', 3, ''], ['Vortex', 'M', 'Spirit', 5, 'a debuff']]],
    ['Jungle Troll (Earth)', 2, 4, 2, [18, 10, 8, 18], 'Power', 'An earth-aspected troll of the deep jungle. Stone-skinned and regenerating.',
      [['Stone Club', 'S', 'Power', 3, ''], ['Earthen Slam', 'S', 'Power', 5, 'a'], ['Troll Blood', 'P', '', 0, 'hpreg dr']]],
    ['Storm Shard Pangolin', 2, 5, 2, [16, 14, 12, 18], 'Power', 'Rolls into a ball of charged crystal scales and bowls through a line.',
      [['Shard Roll', 'S', 'Power', 4, 'a'], ['Static Scales', 'R', 'Power', 3, 'react'], ['Crystal Scales', 'P', '', 0, 'dr hpmax']]],
    ['Blood Weaver', 2, 5, 2, [10, 14, 20, 12], 'Speed', 'Weaves webs of blood between its victims and draws on all of them at once.',
      [['Crimson Thread', 'M', 'Spirit', 3, 'B3'], ['Web of Veins', 'M', 'Spirit', 5, 'a B2'], ['Sanguine Pull', 'M', 'Spirit', 4, 'drain']]],
    ['Amalgeth', 2, 6, 2, [14, 14, 14, 14], 'Power', 'A composite monster made of whatever it has absorbed. It can rank up if left to feed.',
      [['Absorb', 'S', 'Power', 3, 'drain'], ['Amalgam Lash', 'S', 'Power', 4, 'a']]],
    ['River Hydra', 2, 6, 4, [18, 12, 14, 18], 'Power', 'A river-dwelling hydra. Every head is a separate problem.',
      [['Snapping Heads', 'S', 'Power', 2, ''], ['Torrent', 'M', 'Spirit', 5, 'a'], ['Regrowth', 'P', '', 0, 'hpreg hpmax']]],
    ['Oasis Tyrant', 2, 7, 4, [16, 12, 18, 16], 'Power', 'The master of a desert oasis. Mirages lure travellers in; scalding springs finish them.',
      [['Mirage Lash', 'M', 'Spirit', 3, 'debuff'], ['Scalding Spring', 'M', 'Spirit', 5, 'a P2'], ['Tyrant’s Grasp', 'S', 'Power', 4, 'ctl']]],

    // ---------------- Gold ----------------
    ['Spider Moles', 3, 3, 1, [12, 18, 10, 12], 'Speed', 'Burrowing hunters with too many legs. They come up underneath you.',
      [['Burrowing Bite', 'S', 'Speed', 3, 'P2'], ['Tunnel Ambush', 'S', 'Speed', 5, 'a']]],
    ['Springclaw Gorillas', 3, 4, 1, [18, 18, 8, 12], 'Speed', 'Great apes with coiled legs that cross a battlefield in one bound.',
      [['Spring Pounce', 'S', 'Speed', 3, 'move'], ['Pummel', 'S', 'Power', 4, '']]],
    ['Reef Giant', 3, 5, 2, [20, 10, 10, 16], 'Power', 'A giant crusted in living coral that wades in from the reef.',
      [['Coral Maul', 'S', 'Power', 3, 'B2'], ['Tide Stomp', 'S', 'Power', 5, 'a']]],
    ['Mud Lord', 3, 6, 4, [14, 8, 20, 18], 'Power', 'A sovereign of the swamps that rises out of the mud itself.',
      [['Mudslide', 'M', 'Spirit', 5, 'a'], ['Engulf', 'M', 'Spirit', 4, 'ctl'], ['Sinking Ground', 'P', '', 0, 'hpreg hpmax']]],
    ['Sloth Demon', 3, 6, 4, [16, 8, 20, 18], 'Power', 'A demon of torpor whose presence makes limbs heavy and thoughts slow.',
      [['Languid Ruin', 'M', 'Spirit', 3, 'D3'], ['Torpor', 'M', 'Spirit', 5, 'a debuff'], ['Crushing Indolence', 'M', 'Spirit', 6, 'ctl']]],
    ['Emperor Ooze', 3, 7, 4, [18, 8, 14, 20], 'Power', 'An ooze so large it fills a cavern. It dissolves what it touches.',
      [['Dissolve', 'S', 'Power', 3, 'P3'], ['Acid Flood', 'M', 'Spirit', 5, 'a P2'], ['Endless Mass', 'P', '', 0, 'hpmax hpmax']]],
    ['Reef Kraken', 3, 8, 4, [18, 12, 16, 18], 'Power', 'A kraken of the outer reef. Ink, tentacles, and the sea floor waiting below.',
      [['Tentacle Lash', 'S', 'Power', 2, ''], ['Ink Cloud', 'M', 'Spirit', 5, 'a debuff'], ['Drag Under', 'S', 'Power', 4, 'ctl']]],
    ['King of the Dinosaurs', 3, 9, 4, [22, 14, 12, 18], 'Power', 'King: the apex of a prehistoric monster ecosystem, and well aware of it.',
      [['Tyrant Bite', 'S', 'Power', 3, 'exec B2'], ['Roar', 'M', 'Spirit', 5, 'a debuff'], ['Tail Smash', 'S', 'Power', 4, 'a']]],

    // ---------------- Diamond ----------------
    ['Nightmare Hag', 4, 6, 4, [10, 14, 22, 16], 'Power', 'A Diamond-rank horror that feeds on fear. Like every Diamond monster, it returns when the magic is dense enough.',
      [['Dread Hex', 'M', 'Spirit', 3, 'D3'], ['Nightmare Wave', 'M', 'Spirit', 5, 'a debuff'], ['Terror', 'M', 'Spirit', 6, 'ctl']]],
    ['Smoke Dragon', 4, 7, 4, [18, 18, 18, 16], 'Speed', 'A dragon of choking smoke, gone before the blade lands. Diamond monsters cannot be permanently killed.',
      [['Vanishing Strike', 'S', 'Speed', 3, 'exec'], ['Choking Breath', 'M', 'Spirit', 5, 'a P3'], ['Smoke Form', 'P', '', 0, 'dr dr']]],
    ['Shadow Dragon', 4, 8, 4, [20, 14, 20, 18], 'Power', 'A dragon of living darkness. Destroy it and it re-forms when the magic rises again.',
      [['Rending Claws', 'S', 'Power', 3, 'B2'], ['Shadow Breath', 'M', 'Spirit', 5, 'a N2'], ['Umbral Grasp', 'M', 'Spirit', 6, 'ctl']]]
  ];

  var AFFK = { B: 'Bleed', P: 'Poison', N: 'Necrosis', D: 'Doom (status)' };
  var COST = { drain: 30, exec: 20, ctl: 80, ctlm: 20, debuff: 20, move: 20, react: 20, amp: 20, det: 30, elo: 10, area: 40, pass: 50, dr: 50 };
  var KIND = { S: 'Special Attack', M: 'Spell', H: 'Spell', G: 'Spell', R: 'Reaction', P: 'Passive' };

  function ability(spec) {
    var name = spec[0], kind = spec[1], stat = spec[2] || 'Power', cd = spec[3], flags = (spec[4] || '').split(/\s+/).filter(Boolean);
    var items = [], used = 0, kw = [];
    flags.forEach(function (f) {
      var m = f.match(/^([BPND])(\d)$/);
      if (m) { items.push({ k: 'rider', aff: AFFK[m[1]], n: +m[2] }); used += 10 * m[2]; kw.push(AFFK[m[1]].replace(' (status)', '')); return; }
      var p = f.split(':');
      switch (p[0]) {
        case 'a': items.push({ k: 'area' }); used += 40; kw.push('Area'); break;
        case 'drain': items.push({ k: 'drain' }); used += 30; break;
        case 'exec': items.push({ k: 'execute' }); used += 20; kw.push('Execute'); break;
        case 'ctl': items.push({ k: 'control', vs: stat === 'Spirit' ? 'Spirit' : 'Power' }); used += 80; break;
        case 'ctlm': items.push({ k: 'controlMove' }); used += 20; break;
        case 'debuff': items.push({ k: 'debuff', pts: 1, what: 'attack rolls' }); used += 20; break;
        case 'move': items.push({ k: 'move' }); used += 20; break;
        case 'react': items.push({ k: 'react', trigger: 'When it is hit by a melee attack' }); used += 20; break;
        case 'amp': items.push({ k: 'amplify', aff: p[1] }); used += 20; kw.push('Amplify'); break;
        case 'det': items.push({ k: 'detonate', aff: p[1] }); used += 30; kw.push('Detonate'); break;
        case 'elo': items.push({ k: 'elongate', aff: p[1], n: 1 }); used += 10; kw.push('Elongate'); break;
        case 'dr': items.push({ k: 'drPassive' }); used += 50; break;
        case 'hpreg': case 'mpreg': case 'spreg': case 'hpmax': case 'mpmax': case 'spmax': items.push({ k: 'passive', pick: p[0] }); used += 50; break;
      }
    });
    var left = 100 - used;
    if (left > 0 && kind !== 'P') items.unshift({ k: kind === 'H' ? 'heal' : kind === 'G' ? 'shield' : 'dmg', x: left });
    return { name: name, type: KIND[kind], scaling: kind === 'P' ? '' : stat, cd: kind === 'P' ? 0 : cd, resource: kind === 'M' || kind === 'H' || kind === 'G' ? 'MP' : 'SP',
      grade: 'Common', stone: '', keywords: kw.join(', '), items: items, hg: [], template: '', evo: [], text: '' };
  }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function archetypeOf(st) {
    var best = null, bd = 1e9;
    Object.keys(G.ARCHETYPES).forEach(function (k) {
      var a = G.ARCHETYPES[k], d = Math.abs(a.Power - st[0]) + Math.abs(a.Speed - st[1]) + Math.abs(a.Spirit - st[2]) + Math.abs(a.Recovery - st[3]);
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  }

  var list = ROWS.map(function (r) {
    var f = G.newFoe(r[0]);
    f.id = 'cb-' + slug(r[0]); f.canon = true;
    f.normal = r[1] < 0; f.rank = Math.max(0, r[1]); f.rs = r[2]; f.hpMult = r[3];
    f.stats = { Power: r[4][0], Speed: r[4][1], Spirit: r[4][2], Recovery: r[4][3] };
    f.archetype = archetypeOf(r[4]); f.basicStat = r[5]; f.desc = r[6];
    r[7].forEach(function (spec, i) { f.abilities[A.SLOTS[i]] = ability(spec); });
    return f;
  });
  var byId = {};
  list.forEach(function (f) { byId[f.id] = f; });

  EA.bestiary = {
    list: list, byId: byId,
    RANKS: ['Normal', 'Iron', 'Bronze', 'Silver', 'Gold', 'Diamond'],
    rankKey: function (f) { return f.normal ? 'Normal' : EA.rules.RANKS[f.rank]; },
    find: function (id) { return byId[id] || null; },
    /** An editable copy for the GM's own bestiary. */
    copy: function (id) { var f = JSON.parse(JSON.stringify(byId[id])); f.id = 'f' + Date.now().toString(36); f.canon = false; f.copiedFrom = id; return f; }
  };
})(window.EA = window.EA || {});
