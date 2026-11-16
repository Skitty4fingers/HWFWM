# Essence & Ascension: Character Forge

An interactive character builder and live play sheet for the *Essence & Ascension* tabletop RPG
(an unofficial, non-commercial fan game inspired by *He Who Fights with Monsters* by Travis Deverell / Shirtaloon).

Pick a heritage, spend stats, bond three essences and build ability cards. The forge works out every bonus,
pool, regeneration value, cost and cooldown from the rulebook formulas, then lets you play from the sheet
or print it / save it as a PDF.

## Deploy to GitHub Pages

1. Create a repository (for example `ea-character-forge`) and copy the contents of this folder into its root.
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

Characters are stored in the browser (`localStorage`). Use **Save a copy** to download a `.ea-character.json`
file; load it on another device from the roster or the save dialog.

## Files

```
index.html
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
js/app.js            boot and hash routing
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
- Only the Blood capability chart exists in the rulebook. For other essences the GM describes the row and the player builds it in the card forge.

## Updating data

- New confluence trios: add to `CONF_ROWS` in `js/data-index.js` (`*` marks a [CANON] trio, `!` a restricted one).
- New capability charts: add an array like `BLOOD` in `js/library.js` and its lock categories.
- Formula changes (errata): `js/rules.js` and `js/abilities.js` only.
