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

The loading fallback in `focus.html` is `assets/snow-day.webp`, a snowy forest photograph shown while the 3D scene loads.

The repository also retains `assets/car.webp` as an unused reference photograph — an AI-generated image from **ぱくたそ (PAKUTASO)**,
"Vintage train compartment — purple velvet armchairs, round table, wall sconce, snowy window" (<https://www.pakutaso.com/en/20230345090post-28949.html>).
PAKUTASO images are free for commercial and non-commercial use; because this repository is public, the file can be downloaded from it,
which PAKUTASO counts as redistribution, so the source is named here — see the terms of use on <https://www.pakutaso.com/>.

The 3D carriage in `focus.html` (`carriage.js`, `assets/3d/cabin.glb`) is **"1930s Train Cabin"** by thomas.rynne,
<https://sketchfab.com/3d-models/2f109ba713fe455b959e4d79676b5c2d>, licensed CC BY 4.0. Changed: the landscape plane and the
animation removed, textures converted to WebP, the mesh compressed (meshopt). Its lighting and post-processing follow the model's
own Sketchfab scene settings; `assets/3d/sky_day.hdr` is decoded from Sketchfab's default environment "Gareoult" for that purpose.
The forest outside the window (`assets/3d/snow_forest.jpg`) is cut from **snowy_forest_path_01** by Poly Haven (CC0).

On the table in the ride still: **classic_laptop**, **tea_set_01** (a cup), **office_notepads** and **stationery_supplies** (a pen), all Poly Haven (CC0).
