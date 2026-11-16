/* Essence & Ascension — Character Forge
 * library.js: starter characters (Adventurer's Handbook ch. VII), rulebook example abilities (Ch3, Ch5)
 * and the Blood capability chart (Ch3 §3.3.3, GM material).
 */
(function (EA) {
  'use strict';

  function ab(name, type, scaling, cd, items, extra) {
    var a = { name: name, type: type, scaling: scaling, cd: cd, resource: null, grade: 'Common', stone: '', keywords: '', items: items, hg: [], template: '', evo: [], text: '' };
    if (type === 'Special Attack') a.resource = 'SP';
    else if (type === 'Transformation' || type === 'Reaction') a.resource = 'SP';
    else a.resource = 'MP';
    return Object.assign(a, extra || {});
  }
  var I = {
    dmg: function (x) { return { k: 'dmg', x: x }; },
    rider: function (aff, n) { return { k: 'rider', aff: aff, n: n }; },
    area: { k: 'area' }, drain: { k: 'drain' }, execute: { k: 'execute' }, move: { k: 'move' },
    heal: function (x) { return { k: 'heal', x: x }; },
    shield: function (x) { return { k: 'shield', x: x }; },
    buff: function (pts, what) { return { k: 'buff', pts: pts, what: what }; },
    debuff: function (pts, what) { return { k: 'debuff', pts: pts, what: what }; },
    dur: function (n) { return { k: 'dur', n: n }; },
    react: function (trigger) { return { k: 'react', trigger: trigger }; },
    passive: function (pick, extra) { return Object.assign({ k: 'passive', pick: pick }, extra || {}); },
    control: function (vs) { return { k: 'control', vs: vs || 'Power' }; },
    controlMove: { k: 'controlMove' }, redirect: { k: 'redirect' },
    cleanseInst: { k: 'cleanseInst' }, weapon: { k: 'weapon' }, familiar: { k: 'familiar' },
    transform: function (a, b) { return { k: 'transform', stats: [a, b] }; },
    aura: function (effect) { return { k: 'aura', effect: effect }; },
    amplify: function (aff) { return { k: 'amplify', aff: aff }; },
    elongate: function (aff, n) { return { k: 'elongate', aff: aff, n: n }; },
    detonate: function (aff) { return { k: 'detonate', aff: aff }; }
  };

  var innate = { grade: 'Innate' };

  // ---- starter characters (gen_ah.py STARTERS) ----
  var STARTERS = [
    {
      name: 'Kael Dunmore', concept: 'Front-line guardian. Hits hard, holds the line, and keeps enemies off his friends.',
      heritage: 'native', stats: { Power: 18, Speed: 12, Spirit: 8, Recovery: 16 }, essences: ['Might', 'Iron', 'Shield'], confluence: 'Bulwark', basicStat: 'Power',
      abilities: {
        'E1-1': ab('Crushing Blow', 'Special Attack', 'Power', 3, [I.dmg(100)], innate),
        'E2-1': ab('Iron Skin', 'Transformation', 'Power', 5, [I.transform('Power', 'Recovery')], innate),
        'E3-1': ab('Raise Shield', 'Reaction', 'Power', 2, [I.react('When you or an ally next to you is attacked'), I.shield(80)], innate),
        'C-1': ab('Unbroken', 'Passive', null, null, [I.passive('hpmax'), I.passive('sit', { note: '+1 edge to Brace while an ally is within 2 m' })], innate),
        'E1-2': ab('Ground Slam', 'Special Attack', 'Power', 4, [I.area, I.dmg(60)]),
        'E2-2': ab('Rivet', 'Special Attack', 'Power', 2, [I.dmg(70), I.debuff(1, 'its attack rolls'), I.dur(1)])
      }
    },
    {
      name: 'Ilse Varro', concept: 'Storm caster. Fragile up close, devastating at range, and hard to pin down.',
      heritage: 'native', stats: { Power: 8, Speed: 12, Spirit: 20, Recovery: 14 }, essences: ['Fire', 'Wind', 'Magic'], confluence: 'Maelstrom', basicStat: 'Power',
      abilities: {
        'E1-1': ab('Firebolt', 'Spell', 'Spirit', 2, [I.dmg(100)], innate),
        'E2-1': ab('Updraft', 'Reaction', 'Spirit', 3, [I.react('When you are attacked'), I.move, I.buff(2, 'Dodge'), I.dur(2)], Object.assign({ resource: 'MP' }, innate)),
        'E3-1': ab('Arcane Missile', 'Spell', 'Spirit', 1, [I.dmg(100)], innate),
        'C-1': ab('Firestorm', 'Spell', 'Spirit', 5, [I.area, I.dmg(60)], innate),
        'E1-2': ab('Searing Ray', 'Spell', 'Spirit', 4, [I.dmg(80), I.execute]),
        'E2-2': ab('Gust', 'Spell', 'Spirit', 5, [I.control('Power'), I.controlMove])
      }
    },
    {
      name: 'Tamsin Reed', concept: 'Healer and protector. Keeps the party standing and washes away what ails them.',
      heritage: 'native', stats: { Power: 10, Speed: 12, Spirit: 18, Recovery: 14 }, essences: ['Life', 'Water', 'Shield'], confluence: 'Wellspring', basicStat: 'Power',
      abilities: {
        'E1-1': ab('Mending Touch', 'Spell', 'Spirit', 2, [I.heal(100)], innate),
        'E2-1': ab('Cleansing Wave', 'Spell', 'Spirit', 3, [I.cleanseInst, I.heal(60)], innate),
        'E3-1': ab('Warding Bubble', 'Spell', 'Spirit', 4, [I.shield(100)], innate),
        'C-1': ab('Font of Life', 'Aura', 'Spirit', null, [I.aura('regen')], innate),
        'E1-2': ab('Deep Wellspring', 'Passive', null, null, [I.passive('mpmax'), I.passive('mpreg')]),
        'E2-2': ab('Water Whip', 'Spell', 'Spirit', 2, [I.dmg(100)])
      }
    },
    {
      name: 'Vessa Thorne', concept: 'Outworlder duelist. Fast, slippery, and always where the enemy least wants her.',
      heritage: 'outworlder', stats: { Power: 12, Speed: 20, Spirit: 8, Recovery: 12 }, essences: ['Sword', 'Bow', 'Swift'], confluence: 'Panoply', basicStat: 'Speed',
      abilities: {
        'E1-1': ab('Flickering Cut', 'Special Attack', 'Speed', 2, [I.dmg(70), I.rider('Bleed', 3)], innate),
        'E2-1': ab('Piercing Arrow', 'Special Attack', 'Speed', 3, [I.dmg(100)], Object.assign({ text: 'Shoot a target up to 60 m away for {dmg} damage.' }, innate)),
        'E3-1': ab('Blur', 'Reaction', 'Speed', 3, [I.react('When you are attacked'), I.move, I.buff(2, 'Dodge'), I.buff(1, 'your attacks')], innate),
        'C-1': ab('Arsenal', 'Conjuration', 'Speed', 5, [I.weapon], innate),
        'E1-2': ab('Riposte', 'Reaction', 'Speed', 3, [I.react('When an enemy within reach attacks you'), I.dmg(80)]),
        'E2-2': ab('Arrow Rain', 'Special Attack', 'Speed', 5, [I.area, I.dmg(50), I.rider('Bleed', 1)])
      }
    }
  ];

  // ---- Blood capability chart (GM material) ----
  var BLOOD = [
    ab('Crimson Lance', 'Spell', 'Spirit', 3, [I.dmg(100)], { keywords: 'Blood, ranged' }),
    ab('Bloodletting Strike', 'Special Attack', 'Power', 2, [I.dmg(80), I.rider('Bleed', 2)], { keywords: 'Blood, melee, Bleed' }),
    ab('Vein Drinker', 'Spell', 'Spirit', 4, [I.dmg(70), I.drain], { keywords: 'Blood, Drain' }),
    ab('Open Veins', 'Spell', 'Spirit', 5, [I.dmg(50), I.rider('Bleed', 5)], { keywords: 'Blood, curse, Bleed' }),
    ab('Blood Ward', 'Spell', 'Spirit', 5, [I.shield(100)], { keywords: 'Blood, shield' }),
    ab('Sanguine Mend', 'Spell', 'Spirit', 4, [I.heal(100)], { keywords: 'Blood, healing' }),
    ab('Red Tide', 'Spell', 'Spirit', 6, [I.area, I.dmg(60)], { keywords: 'Blood, Area' }),
    ab('Clotting Flesh', 'Passive', null, null, [I.passive('hpreg'), I.passive('rmit', { aff: 'Bleed' })], { keywords: 'Blood' }),
    ab('Blood Price', 'Passive', null, null, [I.passive('utility', { note: 'You may pay any Blood ability’s cost in Health, one for one' }), I.passive('dmgcond', { note: '+10% damage while you are at half Health or less' })], { keywords: 'Blood, sacrifice' }),
    ab('Iron Blood', 'Passive', null, null, [I.passive('hpmax'), I.passive('hpmax')], { keywords: 'Blood' }),
    ab('Scent of Blood', 'Passive', null, null, [I.passive('utility', { note: 'Sense bleeding creatures within 30 m' }), I.passive('sit', { note: '+1 edge on attacks against targets carrying your Bleed' })], { keywords: 'Blood, sense' }),
    ab('Crimson Whip', 'Conjuration', 'Power', 10, [I.weapon], { keywords: 'Blood, weapon' }),
    ab('Thrombus', 'Spell', 'Spirit', 4, [I.dmg(60), I.debuff(2, 'its Dodge')], { keywords: 'Blood, debuff' }),
    ab('Exsanguinate', 'Special Attack', 'Power', 5, [I.dmg(80), I.execute], { keywords: 'Blood, melee, execute' }),
    ab('Blood Puppet', 'Spell', 'Spirit', 8, [I.control('Power'), I.controlMove], { keywords: 'Blood, control' }),
    ab('Hemoglobin Surge', 'Aura', 'Spirit', null, [I.aura('regen')], { keywords: 'Blood, healing' }),
    ab('Pact of Veins', 'Spell', 'Spirit', 6, [I.redirect], { keywords: 'Blood, link' }),
    ab('Crimson Rain', 'Spell', 'Spirit', 6, [I.area, I.rider('Bleed', 3), I.dur(1), I.dmg(20)], { keywords: 'Blood, Area, Bleed' }),
    ab('Blood Wisp', 'Familiar', 'Spirit', null, [I.familiar], { keywords: 'Blood, familiar' }),
    ab('Crimson Heart', 'Transformation', null, 10, [I.transform('Power', 'Recovery')], { keywords: 'Blood, self' })
  ];
  // lock categories per row (Inclination Lock matching)
  var BLOOD_LOCKS = ['Spell', 'Special Attack', 'Spell Drain', 'Spell', 'Spell', 'Spell', 'Spell', 'Passive Recovery', 'Passive', 'Passive Recovery', 'Passive Perception', 'Conjuration', 'Spell Debuff', 'Special Attack', 'Spell Debuff', 'Aura', 'Spell', 'Spell', 'Familiar Summon', 'Transformation Self-Buff Buff'];

  // ---- rulebook examples (Ch3 §3.5, Ch5 §5.3) ----
  var EXAMPLES = [
    ab('Guarding Pulse', 'Spell', 'Spirit', 4, [I.shield(100)], { keywords: 'Shield' }),
    ab('Interpose', 'Reaction', 'Spirit', 3, [I.react('When an ally within 10 m is attacked'), I.move, I.shield(60)], { keywords: 'Shield' }),
    ab('Quickstep', 'Special Attack', 'Speed', 3, [I.move, I.buff(2, 'Dodge'), I.react('When you are attacked'), I.buff(1, 'your next attack')], { keywords: 'Swift' }),
    ab('Rapid Flurry', 'Special Attack', 'Speed', 2, [I.dmg(100)], { keywords: 'Swift, melee' }),
    ab('Withering Mark', 'Spell', 'Spirit', 3, [I.dmg(50), I.rider('Necrosis', 2), I.rider('Doom (status)', 1), I.dur(2)], { keywords: 'Curse' }),
    ab('Creeping Ruin', 'Spell', 'Spirit', 6, [I.area, I.dmg(30), I.rider('Poison', 3)], { keywords: 'Area, Poison' }),
    ab('Lacerating Sigil', 'Spell', 'Spirit', 3, [I.dmg(40), I.rider('Bleed', 4), I.amplify('Bleed')], { keywords: 'Bleed, Amplify' }),
    ab('Burst Vessels', 'Spell', 'Spirit', 4, [I.detonate('Bleed'), I.dmg(70)], { keywords: 'Bleed, Detonate' }),
    ab('Venom Lash', 'Special Attack', 'Speed', 2, [I.dmg(70), I.rider('Poison', 3)], { keywords: 'Poison' }),
    ab('Prolong Suffering', 'Spell', 'Spirit', 3, [I.elongate('Poison', 2), I.dmg(80)], { keywords: 'Poison, Elongate' })
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  EA.library = {
    starters: STARTERS,
    blood: BLOOD,
    bloodLocks: BLOOD_LOCKS,
    examples: EXAMPLES,
    starterAbilities: function () {
      var out = [];
      STARTERS.forEach(function (s) {
        Object.keys(s.abilities).forEach(function (k) { out.push({ from: s.name.split(' ')[0], ab: s.abilities[k] }); });
      });
      return out;
    },
    clone: clone
  };
})(window.EA = window.EA || {});
