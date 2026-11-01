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

The loading fallback in `focus.html` is `assets/snow-day.webp`, a snowy forest path from Poly Haven (CC0).

The 3D carriage in `focus.html` (`carriage.js`, `assets/3d/cabin.glb`) is **"1930s Train Cabin"** by thomas.rynne,
<https://sketchfab.com/3d-models/2f109ba713fe455b959e4d79676b5c2d>, licensed CC BY 4.0. Changed: the landscape plane and the
animation removed, textures converted to WebP, the mesh compressed (meshopt). Its lighting and post-processing follow the model's
own Sketchfab scene settings; `assets/3d/sky_day.hdr` is decoded from Sketchfab's default environment "Gareoult" for that purpose.
The forest outside the window (`assets/3d/snow_forest.jpg`) is cut from **snowy_forest_path_01** by Poly Haven (CC0).
