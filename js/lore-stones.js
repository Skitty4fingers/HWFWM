/* Essence & Ascension — lore
 * lore-stones.js: flavor for awakening stones, stone grades, High-Grade properties and Grave mutations.
 * Written for the game (derived).
 */
(function (EA) {
  'use strict';
  var L = EA.lore = EA.lore || {};

  // keyed by the part of the name after "Awakening Stone of "
  L.stone = {
    Earth: 'A dull brown stone, heavier than it looks. Abilities it wakes tend to stay grounded.',
    'the Eyes': 'Faint rings show in its surface, like an iris. It leans toward sight and perception.',
    'the Feast': 'Warm to the touch, as if recently fed. It turns abilities toward draining and sustenance.',
    Feeble: 'A brittle stone that crumbles slightly when held. Its gifts tend to weaken others.',
    Fire: 'Flickers of orange move inside it. Expect heat, light and burning.',
    Fish: 'Always slightly damp. Its abilities favour water and swimming.',
    'the Foot': 'Shaped vaguely like a heel. It pushes abilities toward kicks and movement.',
    Gun: 'Smells of something sharp and metallic. A rare stone in this world, favoured by outworlders.',
    'the Hand': 'Fits the palm perfectly. It favours unarmed strikes.',
    'the Magus': 'Glows faintly when mana is near. It leans its abilities toward spells.',
    Mediocrity: 'Plain in every respect. It wakes an ability, and that is all it promises.',
    Plant: 'Moss grows on it even in a dry drawer. Expect roots, vines and growth.',
    'the Rain': 'Cool and beaded with water. Its abilities fall like weather.',
    Rat: 'Mottled and gnawed at the edges. It favours scavenging, sickness and swarms.',
    Shield: 'Flat and broad, with a raised rim. It leans toward protection.',
    Snake: 'Scaled patterns cover it. Its abilities coil and bite.',
    Acid: 'Pits and etches whatever it sits on. Corrosion follows.',
    Anticipation: 'Seems to vibrate just before it is touched. It favours readiness and reaction.',
    Flesh: 'Soft and faintly warm, unsettlingly so. Its gifts reshape the body.',
    Focus: 'A perfectly clear stone with one bright point at its heart. It leans toward self-empowerment.',
    Preparation: 'Its surface is lined like a map. Abilities it wakes reward a plan made in advance.',
    Reach: 'Long and narrow. It stretches abilities further than they would go.',
    Song: 'Hums when struck, in a note no instrument quite matches. Expect sound and music.',
    'the Surge': 'Light pulses through it in waves. Its abilities come in bursts.',
    Vision: 'Images drift across its surface if you stare too long. It favours foresight.',
    Wrath: 'Hot and red, like a coal that refuses to cool. It leans toward retribution.',
    Adventure: 'Scuffed, travelled and somehow optimistic. A high-grade stone that favours utility on the road.',
    Judgement: 'Heavy and perfectly balanced. It leans toward debuffs and sentences passed on enemies.',
    Persistence: 'Will not chip, scratch or break. Its abilities keep going.',
    Ruin: 'Cracked across its whole surface yet holding together. Its gifts destroy.',
    Absolution: 'Pale and clean, cool to hold. It leans toward cleansing and holy strikes.',
    Calling: 'Feels like it is pulling toward something far away. Its abilities answer a summons.',
    'the Champion': 'Gold-veined and proud. It favours summons and strengthening allies.',
    Inevitability: 'Rolls back to the same spot however it is set down. Its gifts arrive, sooner or later.',
    'the Moment': 'Seems to flicker in and out of the present. It leans toward one perfectly timed burst.',
    Omens: 'Dark, with shapes like portents drifting beneath its surface. It favours auras.',
    Purgation: 'Burns cold. It leans toward cleansing that does not stop halfway.',
    'the Sky': 'Blue and cloud-flecked, lighter than air would suggest. It favours flight, or striking things that fly.',
    'the Stars': 'Pinpricks of light deep inside. It leans toward utility and concealment.',
    'the Apocalypse': 'A grave stone. Holding it feels like standing at the end of something.',
    'the Avatar': 'A grave stone that seems to have a presence of its own. It favours summoning, transformation and buffs.',
    'the Celestials': 'A grave stone touched by the astral. It enhances the gifts of the bearer’s own kind.',
    Dimension: 'A grave stone that is not quite where your eyes say it is.',
    Gate: 'A grave stone with a hole through it that shows somewhere else.',
    Karma: 'A grave stone that keeps score. Its abilities repay what was done.',
    'the Reaper': 'A grave stone, cold as a sickle’s edge. It favours offensive utility.',
    Rebirth: 'A grave stone that grows warm in the presence of the dying. It favours recovery.',
    Air: 'Light enough to drift on a breath. It favours wind and sky.',
    Barrier: 'Wrapped in a faint shimmering skin. Its gifts keep things out.',
    Bow: 'Curved and taut. Its abilities fly.',
    Death: 'A high-grade stone that drinks the warmth from the hand. Use with care.',
    Defiance: 'Pushes back against the palm that holds it. It favours resistance.',
    Echo: 'Taps on it come back a moment later. Its abilities repeat.',
    Elastic: 'Gives slightly when squeezed, then springs back. Its gifts stretch and rebound.',
    Growth: 'Is a little bigger each time it is measured. It favours strengthening.',
    'the Hunt': 'Marked with claw-scratches. Its abilities track and mark prey.',
    Lightning: 'Crackles faintly in dry air. Expect speed and shock.',
    Might: 'Ridiculously heavy for its size. Its gifts are strength.',
    Myriad: 'A high-grade stone made of many tiny facets. Its abilities multiply.',
    Potency: 'Dense and humming. It makes whatever it wakes stronger.',
    Radiant: 'Glows softly in the dark. Its abilities shine.',
    Sand: 'Grains trickle from it without it ever growing smaller.',
    'the Spider': 'Fine threads cling to it no matter how it is cleaned. It favours webs and ambush.',
    Swiftness: 'Hard to keep hold of. Its gifts are speed.',
    Sword: 'Edged along one side, sharp enough to cut. It favours blade techniques.',
    Wall: 'Square, solid and stackable. Its abilities stand firm.',
    Water: 'Cool and clear as a pool. It favours flow and healing.',
    Wheel: 'Perfectly round, and always rolling slightly. Its gifts come back around.',
    Wind: 'Whistles faintly. Its abilities gust and lift.',
    'the Nest': 'Records of this stone are thin. It is said to favour home, brood and shelter.',
    Persistence_divine: 'A gift from a god. It wakes exactly one ability, the same every time.',
    Inevitability_divine: 'A gift from a god. Its result is fixed, as inevitable as its name.'
  };

  L.grade = {
    Standard: 'Ordinary awakening stones. They come from monsters, markets and dungeon chests. A standard stone nudges a roll: the player may move a few rows up or down the essence’s chart, and the stone’s own nature tips the result toward its lean.',
    'High-Grade': 'Rarer stones that steer a roll further and add a property to the ability they wake. Adventurers save them for the essence they care most about.',
    Grave: 'Legendary stones that wake an ability transformed by a grave mutation: a great power with a real drawback. Few adventurers ever hold one.',
    Divine: 'Stones given by a god, for a reason. They do not roll. They wake exactly the ability the god intends.'
  };

  L.hg = {
    Honed: 'The ability strikes truer than it should, every time.',
    Efficient: 'It asks less of the bearer’s reserves.',
    Quickened: 'It is ready again sooner.',
    Lingering: 'Its effects outstay their welcome.',
    Piercing: 'It finds the gaps in armour.',
    Opportunist: 'It strikes hardest at those already in trouble.',
    'Last Stand': 'It grows stronger as the bearer weakens.',
    Rider: 'It carries a little extra harm along with it.',
    Widened: 'Its reach spreads further.',
    Combo: 'It rewards following one power with another.'
  };

  L.template = {
    Void: 'The ability carries a piece of nothing with it, eating through defences, and leaves a hollow behind.',
    Astral: 'It reaches into the astral, touching what flesh cannot, at a cost in mana.',
    Inexorable: 'Its afflictions cling with impossible stubbornness, but it takes longer to return.',
    Annihilation: 'A grave mutation of total destruction. Nothing about it is restrained.',
    Ascendant: 'The ability lifts the bearer toward something greater, briefly.',
    Reaper: 'It harvests the weakened, and is hungry afterward.',
    Undying: 'It refuses to let its bearer fall, and asks a price for the refusal.',
    Threshold: 'It stands at a door between places, and opens it.',
    Ledger: 'It keeps an account of harm done, and settles it.',
    Primordial: 'Something old and elemental wakes with the ability.'
  };
})(window.EA = window.EA || {});
