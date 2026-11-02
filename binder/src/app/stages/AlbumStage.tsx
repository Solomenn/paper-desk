import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CaseSpec } from "../../book/binder";
import { BookView, type BookViewHandle } from "../../book/BookView";
import type { CoverSpec } from "../../book/cover";
import type { BookState } from "../../book/scene";
import { contentFor } from "../../desk/content";
import { booklet } from "../booklets";
import { play } from "../sound";
import type { StageProps, Tab } from "../types";
import { useWindowLight } from "./light";

/*
 * 纸桌 2026-11-02: the four desk booklets (types.ts Tab) on the author's two ring binders; each booklet's cards come from src/desk
 * (contentFor), drawn by the author's painters. Picking a card lifts it out as before (cards, postcards); tickets stay in their pockets.
 *
 * The author's note — the two ring binders: the card album (2 x 4 ID-card pockets) and the postcard album (2 x 3 A6 pockets, the picture through the
 * front film and the message side through the back film). BookView brings the keyboard path and the flat fallback (no WebGL);
 * the shell's printed controls drive the book through its handle in both. The canvas is full-bleed; `insets`
 * frame the album into the page's book box. Cloth and leather albums carry the booklet's local title on a 題簽 slip inside.
 */

const DEBUG = typeof location !== "undefined" && new URLSearchParams(location.search).has("debug");

function AlbumStage({ tab, profile, material, insets, narrow, slip, labels, ambient, onPickCard, onStage }: StageProps & { tab: Tab }) {
  const b = booklet(tab);
  const kind = b.kind;
  const handle = useRef<BookViewHandle>(null);
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<BookState | null>(null);
  const [ready, setReady] = useState(false);
  const [flat, setFlat] = useState(false);
  const onPick = useCallback((_: number, o: { id: string }) => (kind === "tickets" ? undefined : onPickCard(kind, o.id)), [kind, onPickCard]);
  const title = labels?.region ?? kind;
  const cover = useMemo<CoverSpec>(() => ({ material, color: b.color, foil: b.foil, window: null, title }), [material, b, title]);
  const caseSpec = useMemo<CaseSpec | undefined>(() => (slip ? { slip: { title: slip.title, han: slip.han } } : undefined), [slip]);
  void profile;
  const content = useMemo(() => contentFor(tab), [tab]);
  const onBook = useWindowLight(ambient);

  // BookView draws its flat book when 3D is not possible (or its context is lost): its root says so in data-mode
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const read = () => {
      const book = el.querySelector(".folio-book");
      setFlat(book?.getAttribute("data-mode") === "flat");
      if (book?.hasAttribute("data-ready")) setReady(true);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ["data-mode", "data-ready"], childList: true });
    return () => mo.disconnect();
  }, []);

  const prev = useCallback(() => handle.current?.prev(), []);
  const next = useCallback(() => handle.current?.next(), []);
  const toggle = useCallback(() => handle.current?.toggleCover(), []);
  useEffect(() => {
    onStage?.({ ready, flat, open: state ? !state.closed : true, page: state ? { index: state.index, count: state.count } : { index: 0, count: 1 }, prev, next, toggle });
  }, [onStage, ready, flat, state, prev, next, toggle]);
  useEffect(() => () => onStage?.(null), [onStage]);

  // Harness / debugging handle (?debug): the live book (its screen box, its frames)
  useEffect(() => {
    if (!DEBUG) return;
    const w = window as unknown as { __album?: unknown };
    w.__album = { kind, book: () => handle.current?.book ?? null };
    return () => {
      delete w.__album;
    };
  }, [kind]);

  return (
    <div className="stage-book" data-stage={tab} ref={root}>
      <BookView
        ref={handle}
        content={content}
        {...(b.layout ? { layout: b.layout } : {})}
        cover={cover}
        {...(caseSpec ? { case: caseSpec } : {})}
        // the flat book (no WebGL) lies in the book box, so it needs no insets of its own
        insets={flat ? { top: 0, bottom: 0 } : insets}
        {...(narrow !== undefined ? { narrow } : {})}
        {...(labels ? { labels } : {})}
        onPick={onPick}
        onState={setState}
        onReady={() => setReady(true)}
        onBook={onBook}
        onSound={play}
      />
    </div>
  );
}

export function ProjStage(p: StageProps) {
  return <AlbumStage {...p} tab="proj" />;
}
export function NoteStage(p: StageProps) {
  return <AlbumStage {...p} tab="note" />;
}
export function TicketStage(p: StageProps) {
  return <AlbumStage {...p} tab="ticket" />;
}
export function PostcardStage(p: StageProps) {
  return <AlbumStage {...p} tab="postcard" />;
}
