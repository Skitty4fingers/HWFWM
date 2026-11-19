# Essence & Ascension: table tools

Browser tools for the *Essence & Ascension* tabletop RPG
(an unofficial, non-commercial fan game inspired by *He Who Fights with Monsters* by Travis Deverell / Shirtaloon).

The landing page (`index.html`) offers two doors:

- **Adventurer** (`adventurer.html`): the Character Forge. Pick a heritage, spend stats, bond three essences and build
  ability cards. It works out every bonus, pool, regeneration value, cost and cooldown from the rulebook formulas,
  then lets you play from the sheet or print it / save it as a PDF.
- **Game Master** (`gm.html`): the GM desk. Run encounters, build foes, run awakenings and loot, and look up the numbers.

## Deploy to GitHub Pages

1. Create a repository (for example `HWFWM`) and copy the contents of this folder into its root.
2. Commit and push to `main`.
3. Repository **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, Branch **main**, folder **/ (root)**. Save.
4. The site appears at `https://<user>.github.io/<repo>/` within a minute or two.

The `.nojekyll` file stops GitHub from running Jekyll over the site. There is no build step.

To run it locally, serve the folder (opening `index.html` straight from disk also works):

```powershell
python -m http.server 8000   # then browse to http://localhost:8000
```

## What it does

| Mode | Contents |
|---|---|
| Roster | Saved characters, the four Handbook starters, import |
| Forge | 1 Heritage · 2 Stats (point-buy 54 / 52, 6–20) · 3 Essences (147) and confluence (368 known trios + Uncovered Trio Procedure, Shifting Confluence) · 4 Abilities (20-slot grid, row gates, APB card forge, stones, High-Grade properties, Grave templates, evolutions, library, Blood chart roller in GM view) · 5 Rank, Step, table scale, checks |
| Play | Health / Mana / Stamina with shields and Death Marks, Iron Action Points, Bronze+ Tick engine (Tempo, Ready Tick, Anchor, Surge), ability use with automatic cost, cooldown and d20 roll plus a damage-by-result picker, the full Upkeep (afflictions, regeneration, stack shed, durations, Doom eruption), afflictions on you (Bleed, Poison, Necrosis, Doom), Silver+ aura Press, Strain and Collapse, rest, log |
| Sheet | Two-page printable sheet. **Print or save as PDF** uses the browser print dialog |

### Game Master's desk

| Page | Contents |
|---|---|
| Play | The at-the-table hub. Party at a glance (pools, defenses, resistances, the number a strike needs, afflictions, Downed and Exhausted), the fight in brief, group rolls (everyone rolls initiative or a check), random adventurer picker, an hour of rest; dice and table log with secret rolls; quick reference; trackers (alarms, surges, rituals); in-world clock; session notes |
| Encounter | Party rank and table scale; add adventurers and foes (counts, shared group initiative); roll initiative with RC-11 tie-breaks; Iron turn order with Upkeep on end of turn, or the Bronze+ Tick track with Anchors, Ready Ticks and "next ready Tick"; combatant cards with pools, defenses, resistances, afflictions, effects and cooldowns; manual damage, healing, shields and spending; **Act**: pick an ability, targets and edge, roll (or enter the player's roll), see each target's result read against its real defense with Rank Wall, area floor, Rank Barrier, damage reduction and the second read for affliction stacks, then apply it all (cost, cooldown, damage, afflictions); log |
| Foes | **From the novels:** 54 canon creatures from Normal to Diamond rank (names and ranks from the series; stats, Steps and kits are game builds), sorted by rank and threat, ready to add to the encounter or copy and edit. **Your foes:** bestiary with archetypes (Heavy melee, Caster, Skirmisher, Balanced), stats, rank and Step, threat (Minion ×0.5, Standard, Elite ×2, Solo ×4 Health), quick attacks priced from the APB budget, abilities from the library, live stat block with damage by result |
| Party | Adventurers from the Character Forge on the same device plus imported character files, as stat lines at the encounter's table scale |
| Awakening | Awakening roller with the rows each stone can reach (Blood chart in full), stone lean, High-Grade property and Grave Mutation rolls; confluence lookup for any trio with the Uncovered Trio Procedure and Shifting Confluence roll; loot rarity rolls for essences and stones |
| Codex | Search every entity and open any of them: lore, rules, numbers and links onward |
| Reference | Hit-odds bar for any attacker and defender, hazard ratings, Table A ability costs at any rank, effective stat and pool tables, searchable essence and stone indexes |

### Table tools (both sides)

- **Dice:** tap dice into a pool (d4 to d100) with a modifier, or type any expression (`2d6+3`, `4d6kh3`, `d20+7`, `d%`). Kept and dropped dice, maximums and ones are marked. Give a target number and a d20 roll is read as Miss to Devastating Hit. History is kept per browser; the GM can roll in secret. On the Character Forge, rolls also go into the character's log.
- **Quick reference:** your turn at Iron, the Tick track, reading the roll, afflictions, the Upkeep, Downed and pool states, rest, aura and rank gaps, searchable and linked into the codex. The GM also gets hazards, building a fight and loot.
- Table state is stored under `ea-table-v1`.

### Codex (drill-in lore)

Nearly every name on both sides of the site opens a codex page in a side drawer: essences, confluences, essence families, rarities, awakening stones and grades, High-Grade properties, Grave mutations, creatures and their abilities, adventurers and their abilities, library abilities, afflictions, keywords, ranks, stats and heritages. Each page has flavor text, lore, the rules in plain language, live numbers, and links to related entries, with a back button to retrace your steps. Both the GM desk and the Character Forge have a **Codex** page to search everything.

Players see only what the Adventurer's Handbook gives them. Confluence tables, stone leans, mutation tables, essence families and the bestiary stay on the GM side; a player can read about a confluence once one of their own revealed characters carries it. Abilities have an optional **Flavor text** field that shows on the card and in the codex.

All lore is written for the game (marked with the derived dot); no novel text is reproduced.

GM data is stored separately (`ea-gm-v1`). Encounters use copies of the adventurers, so a fight never changes a player's saved sheet.

Characters are stored in the browser (`localStorage`). Use **Save a copy** to download a `.ea-character.json`
file; load it on another device from the roster or the save dialog.

## Campaign sync (Firebase)

The GM starts a campaign and sends players one invite link. From then on, every device stays in step through a Firebase Realtime Database:

- **Characters** players bring to the table appear on the GM's Party and Play pages, live. Changes from either side reach the other within a second, field by field, so the GM applying damage while a player spends Mana keeps both.
- **Fights** are run from the GM desk. A player character added to an encounter is the player's own sheet, not a copy: damage, healing, afflictions, Upkeep, turns and Ticks land on it. Players use abilities from their sheet (it pays the cost and starts the cooldown); the roll appears in the GM's **Table feed** with a **Resolve** button that applies it without charging the cost again.
- **Rolls** from players and the GM's non-secret rolls go to a shared feed. The GM's **Secret roll** keeps a roll private.
- **Players see** the initiative order, whose turn it is or who is ready, the party's numbers, and foes as a condition word (unhurt, hurt, bloodied, near death, down), never their numbers.
- **GM-only data** (bestiary, encounter internals, notes, trackers, clock, secret rolls) lives under the campaign's `gm` branch, which the rules let only the GM read. It also follows the GM between devices.
- **Offline:** local storage stays the working copy. The SDK queues writes while disconnected and sends them when the connection returns.

Sign-in is anonymous, so there are no accounts. Each browser gets its own identity; a player on a new device opens the invite link again. Characters stay owned by the browser that brought them.

### One-time setup (Firebase console, project `hwfwm-54ecc`)

1. **Realtime Database:** Build > Realtime Database > Create Database. Choose **United States (us-central1)** and start in **locked mode**. If you pick another region, copy the database URL shown at the top of the page into `databaseURL` in `js/firebase-config.js`.
2. **Rules:** on the Realtime Database **Rules** tab, replace everything with the contents of `database.rules.json` and select **Publish**.
3. **Anonymous sign-in:** Build > Authentication > Get started > Sign-in method > **Anonymous** > Enable > Save.

The web config is already in `js/firebase-config.js`. It is not a secret; the rules control access. The free Spark plan allows 100 simultaneous connections, far more than a table needs.

### Files

```
js/firebase-config.js   the project's web config
js/sync-firebase.js     Firebase backend (loads the bundled SDK on first use)
js/sync.js              campaigns, membership, live character sync, fight view, table feed, campaign dialogs
js/vendor/              Firebase JS SDK 13.4.0 compat builds (app, auth, database), Apache-2.0
database.rules.json     Realtime Database security rules
```

## Files

```
index.html           landing page: Adventurer or Game Master
adventurer.html      Character Forge
gm.html              Game Master's desk
css/forge.css        screen styles
css/print.css        the paper sheet (preview and print)
js/data-index.js     Ch1 canon index: essences, confluences, derived families, stones
js/rules.js          Ch0, Ch2, Ch4 formulas: multiplier, stat bonus, pools, regen, defenses, tempo, aura, confluence lookup
js/abilities.js      Ch3 APB pricing, Table A, High-Grade properties, Grave templates, evolutions, Ch5 keywords
js/library.js        starter characters, rulebook example abilities, Blood capability chart
js/store.js          character model, roster, import / export
js/play-engine.js    live play: damage, healing, Upkeep, afflictions, AP, ticks, strain
js/ui-core.js        render loop, binding, modal, toast, dice
js/sigil.js          the soul-constellation graphic
js/ui-forge.js       roster and the five build steps
js/ui-ability.js     ability forge, library, awakening roller
js/ui-play.js        play mode
js/ui-sheet.js       printable sheet, save and share
js/app.js            boot and hash routing (adventurer.html)
js/bestiary.js       canon creatures by rank, with kits built from the Ch3 pricing rules
js/lore-essences.js  flavor for essences, families, rarities and family confluences
js/lore-confluences.js flavor for named confluences
js/lore-stones.js    flavor for stones, grades, High-Grade properties and Grave mutations
js/lore-rules.js     ranks, stats, heritages, afflictions, keywords, library and starter abilities
js/lore-bestiary.js  creature lore (habitat, tactics, loot, essence drops) and creature ability flavor
js/table-tools.js    dice engine and tray, quick reference, trackers, clock, notes
js/gm-play.js        GM Play page
js/codex.js          entity resolver, search index, drawer and Codex page
js/gm-engine.js      GM state, foes, encounters, initiative, turn and tick flow, attack resolution, odds, loot
js/gm-ui.js          GM pages
js/gm-app.js         boot and hash routing (gm.html)
```

Scripts are plain browser scripts sharing one `window.EA` namespace (no modules, so the page also runs from `file://`).
The rules modules (`data-index`, `rules`, `abilities`, `library`, `play-engine`) do not touch the DOM and can be loaded
in Node for testing:

```js
global.window = global;
['data-index', 'rules', 'abilities', 'library'].forEach(f => require('./js/' + f + '.js'));
const S = EA.rules.computeSheet({ heritage: 'native', rank: 1, rs: 0,
  stats: { Power: 18, Speed: 12, Spirit: 8, Recovery: 14 }, essences: [], abilities: {}, options: { tableScale: false }, confluence: {} });
console.log(S.pool.HP.max); // 484 (Ch2 worked example)
```

## Rules sources and choices

Numbers follow `HWFWM/Rulebook` Chapters 0–5. Interpretations made where the rulebook is silent:

- Rank multiplier M is rounded to three decimals (RC-4).
- Passive pool picks add +6% each to the maximum; regeneration picks multiply the per-Upkeep amount by 1.25 each (floor).
- Quickened at Iron rounds the cooldown to the nearest whole Round (minimum 1).
- Familiar call cost is `floor(30 × M)` Mana once, as on the Blood chart.
- Temporary Health absorbs direct damage only; affliction ticks go straight to Health (Ch5 §5.0.1 vs §5.0.2).
- Afflictions on you are entered with the attacker's raw stat and rank; the forge snapshots Recovery Mitigation at application.
- Foe threat tiers multiply maximum Health only (Minion ×0.5, Elite ×2, Solo ×4); actions are unchanged.
- Normal-rank (lesser) monsters from the novels play as Iron 0 with weak stats and the Minion tier.
- Canon creatures: the novels give names and ranks; descriptions, stats, Steps and kits are game builds (marked with the derived dot).
- In the GM desk a quick attack spends 40 APB on area and 10 per affliction stack; the rest goes to damage.
- Only the Blood capability chart exists in the rulebook. For other essences the GM describes the row and the player builds it in the card forge.

## Updating data

- New confluence trios: add to `CONF_ROWS` in `js/data-index.js` (`*` marks a [CANON] trio, `!` a restricted one).
- New capability charts: add an array like `BLOOD` in `js/library.js` and its lock categories.
- Formula changes (errata): `js/rules.js` and `js/abilities.js` only.
