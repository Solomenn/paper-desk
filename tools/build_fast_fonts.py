"""Rebuild the first-screen font subsets (vendor/fonts/fast-*.woff2) and the block at the end of fonts.css.

The character list in tools/fast-font-chars.txt is what the pages actually render (DOM text, canvas
text, input values, title/aria labels, captured with the page at its normal state plus the main tabs).
Characters outside it still come from the per-slice rules in fonts-slices.css, so user-typed text keeps
the same glyphs.

Run: python tools/build_fast_fonts.py
Needs: fonttools[woff] (pip install fonttools brotli)
"""

import glob
import os
import re

from fontTools.merge import Merger
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, "vendor", "fonts")
CHARS = os.path.join(ROOT, "tools", "fast-font-chars.txt")

FACES = [
    ("lxgwwenkai-regular-subset-*.woff2", "LXGW WenKai", 400, "fast-lxgw-regular.woff2"),
    ("lxgwwenkai-bold-subset-*.woff2", "LXGW WenKai", 700, "fast-lxgw-bold.woff2"),
    ("noto-serif-sc-*-400-normal.woff2", "Noto Serif SC", 400, "fast-noto-serif-400.woff2"),
    ("noto-serif-sc-*-500-normal.woff2", "Noto Serif SC", 500, "fast-noto-serif-500.woff2"),
    ("noto-serif-sc-*-700-normal.woff2", "Noto Serif SC", 700, "fast-noto-serif-700.woff2"),
    ("noto-sans-sc-*-400-normal.woff2", "Noto Sans SC", 400, "fast-noto-sans-400.woff2"),
    ("noto-sans-sc-*-500-normal.woff2", "Noto Sans SC", 500, "fast-noto-sans-500.woff2"),
]


def unicode_ranges(font):
    codepoints = sorted(font.getBestCmap())
    spans, start, prev = [], None, None
    for cp in codepoints:
        if start is None:
            start = prev = cp
        elif cp == prev + 1:
            prev = cp
        else:
            spans.append((start, prev))
            start = prev = cp
    if start is not None:
        spans.append((start, prev))
    return ",".join(
        "U+%X" % a if a == b else "U+%X-U+%X" % (a, b) for a, b in spans
    )


def main():
    with open(CHARS, encoding="utf-8") as f:
        chars = " " + f.read().strip()   # the space is the first character of the set; strip() would eat it

    rules = []
    for pattern, family, weight, out_name in FACES:
        paths = sorted(glob.glob(os.path.join(FONT_DIR, pattern)))
        if not paths:
            raise SystemExit("no slices for " + pattern)
        font = Merger().merge(paths)
        options = Options()
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.name_legacy = True
        options.notdef_outline = True
        subsetter = Subsetter(options=options)
        subsetter.populate(text=chars)
        subsetter.subset(font)
        font.flavor = "woff2"
        out = os.path.join(FONT_DIR, out_name)
        font.save(out)
        rules.append(
            "@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;"
            "src:url(vendor/fonts/%s) format('woff2');unicode-range:%s}"
            % (family, weight, out_name, unicode_ranges(TTFont(out)))
        )
        print("%-32s %7d bytes" % (out_name, os.path.getsize(out)))

    css_path = os.path.join(ROOT, "fonts.css")
    with open(css_path, encoding="utf-8") as f:
        css = f.read()
    marker = "/* 首屏快取"
    head = css[: css.index(marker)] if marker in css else css.rstrip() + "\n"
    block = (
        "/* 首屏快取：把本站在用的字集合成每个字重一个文件，先下这个；集合外的字（用户自己打的）仍走上面的分片。 */\n"
        + "\n".join(rules)
        + "\n"
    )
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(head + block)
    print("fonts.css", os.path.getsize(css_path), "bytes")


if __name__ == "__main__":
    main()
