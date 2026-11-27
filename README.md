# turkey-run-game-01

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/Arik2779/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/Arik2779/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

**Turkey Run — Escape Thanksgiving Dinner.** Thanksgiving dinner is tonight, and YOU are the main course. Sprint across an autumn farm at sunset, jump the ovens, dodge the carving knives, grab the corn, and outrun the farmer all the way to the forest, 1500 metres away. Stumble and he closes in; lose all three lives and it's dinner time.

## How to play

- **Space / ↑ / W / click** — jump (and start / restart); press again mid-air for a double jump
- **P / Esc** — pause
- **M** — mute the synthesised sound effects

Score grows with every metre you run, every obstacle you clear, and every corn cob you grab (+10). The HUD shows score, distance, lives, a FREEDOM progress bar to the forest, and a FARMER meter showing how close he is behind you. Reach 1500m to escape; get caught and the run ends.

## Run it

No build step, no network, no dependencies — plain static files:

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` directly in a desktop browser. Node 22+ is needed only for `main.ts`, which hands the entry in (`MAKEFUN_OUTPUT_DIR=out node main.ts`).

## Layout

- `game/` — the playable game (`index.html` + ES modules in `src/`: `world.js` rules, `render.js` drawing, `input.js`, `audio.js`, `shots.js` screenshot scenes, `main.js` loop)
- `screenshots/` — real renders of the game's own code: title, gameplay, caught, escaped
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's library, unchanged

Original art, sounds and code, made for this competition. MIT licensed.
