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

The handwriting face is LXGW WenKai (SIL Open Font License 1.1). The faces are served from this repository
(`vendor/fonts/`, split into woff2 slices); `fonts-slices.css` names jsDelivr as a fallback source.

The loading fallback in `focus.html` is `assets/snow-day.webp`, a snowy forest photograph shown while the 3D scene loads.

The view from the 雪国线 window (`carview.js`, `assets/view/`, `tools/view_snowfield.py`): one photograph, Poly Haven HDRI
"Passendorf Snow" (CC0, the 8K tonemapped panorama) — its horizon band split into the sky, the sun, the hills and tree line,
and the snowfield, and colour-graded to match the window author's own photos (muted, a teal cast, highlights rolled off).
The carriage window and table on the 雪国线 ride (`assets/frame.webp`) are taken from the author's photographs of a train window; he shares
the frame and table as free material (the views in those photos are his and are not used): the median of six of his frames
(1440×962), the platform watermark removed, the glass punched out.




## Bookshelf Short LOWPOLY — recoloured asset

- Title: **Bookshelf Short LOWPOLY**
- Author: **EFX** — <https://sketchfab.com/evan4129>
- Source: <https://sketchfab.com/3d-models/bookshelf-short-lowpoly-e2eb14aedca24c22a80220e8d72c379c>
- Licence: **Creative Commons Attribution 4.0 International (CC BY 4.0)**.
- Original uploaded file: `bookshelf_short_lowpoly.glb`.
- Modified file: `bookshelf_short_offwhite.glb`; only the shelf-structure UV atlas region was recoloured to warm ivory `#E9E2D6`. Book spines and covers retain the source artwork. The 4K base-colour texture is retained; normal and metallic-roughness textures are resized to 2K for a smaller preview asset.
- Attribution: “Bookshelf Short LOWPOLY” by EFX, licensed under CC BY 4.0. Changes: shelf structure recoloured to warm ivory and PBR textures optimized for browser preview.

## External 3D product previews (reference only)

- **HQ3DMOD POS Receipt Printer**: <https://sketchfab.com/3d-models/pos-receipt-printer-4daf4e22d9d34b949d0ae7cbf3902983> — paid model, not downloaded.
- **LINTEX Silk Wall** official configurator: <https://lintex.com/products/silk-wall/>.
- **LINTEX Textile Noticeboard** official configurator: <https://lintex.com/products/textile-noticeboard/>.

## sasshi ring binder (`binder/`)

- Author: **qzz0518** — <https://github.com/qzz0518/sasshi>
- Licence: **GNU Affero General Public License v3.0** (`binder/LICENSE`); upstream commit recorded in `binder/UPSTREAM`.
- Vendored unchanged for now (stage 1: faithful reproduction), including the author's sample profile and photos; built by `.github/workflows/pages.yml` and served at `/binder/`.

## LINTEX Silk Wall model (`assets/objects/silk-wall-2000x1000.glb`)

- Converted from LINTEX's official Silk Wall 2000×1000 OBJ download (article 41537M, <https://media.lintex.com/?product=silk-wall&type=3d>); glass only, no materials; used for the window-light lab.

## LINTEX Silk Wall configured model (`assets/objects/silk-wall-2000x1000-350.glb`)

- Exported from the LINTEX Silk Wall configurator (<https://lintex.com/products/silk-wall/#configurator>), 2000×1000, colour Silk Glass 350 Crisp; includes glass, painted back, edge, backplate, rails and magnets with LINTEX's materials. The illustrative wall screws are removed at load time. Used in `lab/entry.html`.

## LINTEX Textile Noticeboard model (`assets/objects/textile-noticeboard-2500x1200-lth39.glb`)

- LINTEX's official Textile Noticeboard model with materials, article 27829OMV, 2500×1200×16 mm, fabric Blazer Lite LTH39 (albedo, bump and ambient-occlusion maps by LINTEX), from LINTEX's downloads (<https://media.lintex.com/?product=textile-noticeboard>; product page <https://lintex.com/products/textile-noticeboard/>). Unmodified. Used in `lab/entry.html` and on the notes page of `index.html`.

## Objects from Sketchfab (`assets/objects/`: the boxes in `lab/entry.html`, the shelf in `journal.html`)

Both are licensed CC BY 4.0 (<https://creativecommons.org/licenses/by/4.0/>) and credited on the page that shows them.
Changed for both: textures resized to at most 2048 px and converted to WebP (geometry and materials unchanged).

- `postcard-boxes.glb` — **"2 boxes"** by Cozmoth, <https://sketchfab.com/3d-models/2-boxes-3f920e8fd10c4664b5bd1dea3cf7606e> (the boxes the postcards go in).
- `wooden-shelf.glb` — **"Wooden Shelf"** by Vilson Pistori, <https://sketchfab.com/3d-models/wooden-shelf-67e718a0fc904487a9f735892d9834d3> (the shelf that holds every album). The albums standing in it are generated by the sasshi binder code (`binder/src/shelf.ts`, built to `/binder/shelf.js`), AGPL-3.0 as above.

## BlenderKit model (`assets/objects/wooden-organizer.glb`, used in `lab/entry.html`)

- **"Wooden Organizer"** by Mobolaji_3D Dele-Adelodun, BlenderKit asset `4c76511b-53a3-4d18-b417-44f8361dc917` (<https://www.blendkit.com/get-blendkit/4c76511b-53a3-4d18-b417-44f8361dc917/>), free, BlenderKit **Royalty Free** licence (<https://www.blenderkit.com/docs/licenses/>). Used unchanged (the glTF file BlenderKit provides). The Royalty Free licence does not allow the model to be resold or redistributed as a model; it is here only so the entry page can show it.

## Sunghyun Sans font (`assets/fonts/`)

- Source: <https://github.com/anaclumos/sunghyun-sans> (commit 068baca), files `dist/web/woff2/SunghyunSans-Medium.woff2` and `SunghyunSans-SemiBold.woff2`, unmodified.
- Licence: **SIL Open Font License 1.1**; full text in `assets/fonts/SunghyunSans-OFL.txt`.
