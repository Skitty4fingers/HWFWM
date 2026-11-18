/* Essence & Ascension — lore
 * lore-rules.js: lore and plain-language rules for ranks, stats, afflictions, keywords, heritages,
 * and flavor for the Blood chart, rulebook examples and starter abilities. Written for the game.
 */
(function (EA) {
  'use strict';
  var L = EA.lore = EA.lore || {};

  L.rank = [
    { q: 'Everyone starts somewhere. Iron is where the dying usually happens.', lore: 'The rank of the newly awakened. An Iron adventurer is already beyond any ordinary person: a single Iron-rank monster can kill a squad of mundane soldiers. Iron teams take contracts on lesser monsters, clear monster surges at the edges of civilisation and learn, quickly, what their abilities really do.', rules: 'Fights use turns and Action Points. Abilities are measured in Rounds. No aura combat.' },
    { q: 'The world slows down. You do not.', lore: 'Bronze is where adventurers stop being promising and start being dangerous. Their bodies shrug off what would kill an Iron, and the speed of their thought and reflexes changes how a fight feels from inside.', rules: 'Fights move to the Tick track: each Round has six Ticks, faster characters act more often, and cooldowns count in Ticks.' },
    { q: 'Now the air itself is a weapon.', lore: 'At Silver the aura becomes something more than presence. Adventurers can press their aura onto enemies, contest each other’s will directly, and shut down weaker auras entirely. Silver adventurers are the backbone of any city’s defence.', rules: 'Aura combat begins: Press, Strain, Aura Clash and Suppression fields.' },
    { q: 'Cities ask Gold adventurers for help. Kingdoms ask them for favours.', lore: 'Gold adventurers are rare and influential. Their power is on a scale that changes the outcome of wars and disasters, and their auras can be felt across a room before they enter it.', rules: 'Aura combat continues with larger radii and higher stakes. Rank Barriers make lower-rank attacks nearly harmless.' },
    { q: 'At Diamond, the line between adventurer and force of nature is mostly a formality.', lore: 'Diamond is the peak most will ever see. Diamond adventurers are near-immortal, and diamond-rank monsters cannot be destroyed for good: they return when the magic is dense enough.', rules: 'Domains: a Diamond aura can impose a law on the area around it. Rank pressure presses foes one rank below automatically.' }
  ];

  L.stat = {
    Power: { lore: 'Strength, toughness and the force behind a blow.', rules: 'Sets Health and the damage of most physical attacks. Resists Bleed.' },
    Speed: { lore: 'Quickness of body and reflex.', rules: 'Sets Stamina, Initiative, movement and how often a Bronze-rank character acts. Used for dodging strikes.' },
    Spirit: { lore: 'Strength of will and magic.', rules: 'Sets Mana, spell power and aura strength. Resists Necrosis and Doom.' },
    Recovery: { lore: 'How quickly the body and spirit bounce back.', rules: 'Sets regeneration of every pool each Upkeep and resists Poison.' }
  };

  L.heritage = {
    native: { title: 'Native', lore: 'Born in this world, raised among essences and monsters. Natives know how things work: which essences fetch a good price, what the Adventure Society expects, and which monsters to run from.', rules: '54 stat points at creation, two more than an outworlder, and no special traits.' },
    outworlder: { title: 'Outworlder', lore: 'Arrived from another world, often with no idea how anything works. Outworlders carry an astral quirk that lets them steer awakenings further and draw unusual results, and the universe seems to hand them more trouble than anyone else.', rules: '52 stat points instead of 54. Spoils of the Fallen: once per session, an extra essence, stone or core after beating a worthy monster. Anomalous Soul: steers every awakening one row further. Foreign Mind: +2 edge to resist mind-reading, charm and control. Outsider: −2 on local customs, lore and reading people, until Bronze.' }
  };

  L.affliction = {
    Bleed: { q: 'A wound that will not close is a clock counting down.', lore: 'Open wounds that keep losing blood. Bleed hits hard and fast, then fades as the body clots.', rules: 'Deals damage to Health and Stamina at each Upkeep. Resisted with Power. Lasts 3 Upkeeps, up to 10 stacks.' },
    Poison: { q: 'Patient, quiet, and in no hurry to finish.', lore: 'Toxins in the blood that weaken slowly and stubbornly.', rules: 'Deals steady damage at each Upkeep and lasts longer than Bleed. Resisted with Recovery. Lasts 4 Upkeeps, up to 10 stacks.' },
    Necrosis: { q: 'The flesh forgets how to be alive.', lore: 'Living tissue dying in place. Necrosis is feared because it stops healing.', rules: 'Damages Health each Upkeep and stops Health regeneration while it lasts. Resisted with Spirit. Lasts 3 Upkeeps, up to 5 stacks.' },
    'Doom (status)': { q: 'It does nothing. It does nothing. Then it does everything.', lore: 'A gathering curse that waits for the right moment. Doom builds up quietly and then lands all at once.', rules: 'Deals nothing while it lasts. Each Upkeep it counts every other affliction tick on the target, then bursts when it runs out or is triggered: the more it counted, the bigger the burst. Ordinary cleanses do not touch it. Resisted with Spirit. Lasts 3 Upkeeps, up to 5 stacks.' }
  };

  L.keyword = {
    Area: 'Hits everyone in a 3 m radius, a 6 m cone or a 10 m line. One roll, read against each target\u2019s area defense. Against a target of the same rank or lower, an area attack never misses outright: a Miss counts as a Graze.',
    Execute: 'Deals 50% more damage to a target at 25% Health or less.',
    Drain: 'The attacker heals half the damage dealt.',
    Amplify: 'For 3 Rounds, one affliction type on the target deals 25% more.',
    Elongate: 'Adds Upkeeps to an affliction already on the target.',
    Detonate: 'Ends one affliction type on the target at once: it deals its remaining harm plus a quarter, then is gone.',
    Trigger: 'Sets off a Doom immediately instead of waiting for it to run out.',
    Reaction: 'Used outside your turn, when its trigger happens.',
    Control: 'On a Hit, the target loses its next Major action. A control add-on can also take its next Move.',
    Shield: 'Temporary Health that soaks damage first and fades after 3 Rounds.',
    Cleanse: 'Removes affliction stacks, or a whole affliction.',
    Rider: 'An affliction carried by an attack. The same roll is read a second time against the target’s resistance to see how many stacks land.'
  };

  L.ability = {
    // Blood chart
    'Crimson Lance': 'Blood drawn from the bearer’s own veins, hardened into a spear and thrown.',
    'Bloodletting Strike': 'A cut placed exactly where the blood runs closest to the skin.',
    'Vein Drinker': 'Every wound you open feeds you a little.',
    'Open Veins': 'A curse that makes every cut on the target bleed twice as long.',
    'Blood Ward': 'A shell of hardened blood that cracks instead of you.',
    'Sanguine Mend': 'Your own blood flows back where it belongs, carrying healing with it.',
    'Red Tide': 'A wave of blood that drags across everyone in front of you.',
    'Clotting Flesh': 'Your wounds close faster than they should.',
    'Blood Price': 'Pay in blood instead of mana, and hit harder for the price.',
    'Iron Blood': 'Blood that runs thick and strong, and a body that holds more of it.',
    'Scent of Blood': 'You can smell every wound on the battlefield.',
    'Crimson Whip': 'A lash of blood that reaches further than any arm.',
    Thrombus: 'A clot in the wrong place, at the worst time.',
    Exsanguinate: 'Pulls the blood out of a target that has already lost too much.',
    'Blood Puppet': 'With enough of their blood in your control, their limbs follow your will.',
    'Hemoglobin Surge': 'Your blood surges, and so does everything you do.',
    'Pact of Veins': 'A bond in blood between allies: what hurts one is shared by all.',
    'Crimson Rain': 'Blood falls from the sky, and it cuts.',
    'Blood Wisp': 'A small spirit of blood that follows you and does as it is told.',
    'Crimson Heart': 'Your heart becomes the centre of a storm of blood.',
    // Rulebook examples
    'Guarding Pulse': 'A pulse of protective magic over a nearby ally.',
    Interpose: 'Step in front of the blow meant for someone else.',
    Quickstep: 'Two strides covered in one heartbeat.',
    'Rapid Flurry': 'Strikes too fast to count.',
    'Withering Mark': 'A mark that makes the flesh beneath it die slowly.',
    'Creeping Ruin': 'A curse that gathers on its target and waits.',
    'Lacerating Sigil': 'A rune carved in the air that carves the skin beneath it.',
    'Burst Vessels': 'Every bleeding wound bursts at once.',
    'Venom Lash': 'A whip coated in something that keeps working long after.',
    'Prolong Suffering': 'The poison in them forgets how to stop.',
    // Starter characters
    'Crushing Blow': 'Everything behind one swing.',
    'Iron Skin': 'Skin that hardens to turn a blade.',
    'Raise Shield': 'A shield of force over an ally who needs it.',
    Unbroken: 'You do not go down while there is fight left in you.',
    'Ground Slam': 'The ground answers your fist and knocks everyone near you off balance.',
    Rivet: 'Pin them in place. They are not going anywhere.',
    Firebolt: 'The first spell every fire mage learns, and the one they use most.',
    Updraft: 'A rising column of hot air that lifts you out of reach.',
    'Arcane Missile': 'Unshaped magic, thrown hard.',
    Firestorm: 'Fire everywhere you point.',
    'Searing Ray': 'A beam of concentrated heat.',
    Gust: 'A blast of wind that knocks enemies back.',
    'Mending Touch': 'A hand on a wound, and the wound closes.',
    'Cleansing Wave': 'Clear water that washes away what should not be there.',
    'Warding Bubble': 'A bubble of water that turns aside harm.',
    'Font of Life': 'A spring of healing that keeps flowing.',
    'Deep Wellspring': 'Mana that never quite runs dry.',
    'Water Whip': 'A lash of water that stings like a whip.',
    'Flickering Cut': 'A blade that is there, then not, then in you.',
    'Piercing Arrow': 'An arrow that goes through the first target and keeps going.',
    Blur: 'Too fast to see clearly.',
    Arsenal: 'Weapons appear in your hands as you need them.',
    Riposte: 'Their attack opens a gap. Your answer fills it.',
    'Arrow Rain': 'A sky full of arrows over a whole area.'
  };
})(window.EA = window.EA || {});
