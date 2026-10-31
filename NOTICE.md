# Notice

纸桌 (paper-desk) is licensed under the GNU Affero General Public License v3.0 (see `LICENSE`).

Parts of it are adapted from **sasshi** by qzz0518 — <https://github.com/qzz0518/sasshi>, AGPL-3.0:

- `room.js` / `room.css` and the room in `index.html`: the morning room (washi fibres, the sun patch and
  its glow, the window bar and the twig with its leaves), from `src/app/Room.tsx`, `src/app/app.css` and
  `src/app/layout.ts` (`lightOf`).
- the postmark on stamped project cards: after `src/book/content/postcards.ts` (`postmark`).
- `sounds/`: the sound effects and the room's ambience, with their `manifest.json` / `ambient.json`,
  copied unchanged from `public/sounds/` (generated with the ElevenLabs Sound Effects API, as described there).
- `sound.js`: playback after `src/sound` (one take picked at random per play, its gain trim, lead and length
  from the manifest; the leaves loop with birds dropped in now and then).

The handwriting face is LXGW WenKai (SIL Open Font License 1.1), loaded from jsDelivr.

The carriage in `focus.html` (雪国线) is a photograph, `assets/car.webp` — an AI-generated image from **ぱくたそ (PAKUTASO)**,
"Vintage train compartment — purple velvet armchairs, round table, wall sconce, snowy window" (<https://www.pakutaso.com/en/20230345090post-28949.html>).
PAKUTASO images are free for commercial and non-commercial use; because this repository is public, the file can be downloaded from it,
which PAKUTASO counts as redistribution, so the source is named here — see the terms of use on <https://www.pakutaso.com/>.
The file in `assets/` is the picture re-encoded as WebP; the window is cut out of it in code and the live scene is drawn behind it.

