"use dom";
import React, { useEffect, useRef, useState } from "react";
import type { DOMProps } from "expo/dom";
import type { Presentation, ExportRequest, ExportPacket } from "./src/types";
// @ts-ignore App-owned adapters preserve the pinned website's drawing algorithms.
import { createViewer, loadViewerFonts } from "./src/viewer/controller.mjs";
// @ts-ignore
import {
  validPresentation,
  describe,
  exportSpec,
  colorways,
} from "./src/presentation.mjs";
// @ts-ignore
import { renderShareCard } from "./src/viewer/share-card.mjs";
// @ts-ignore
import { CHUNK_SIZE } from "./src/export-transfer.mjs";
import "./src/viewer/fonts.css";
import "./src/viewer/assets.css";
import "./src/viewer/viewer.css";

type Props = {
  presentation: Presentation;
  active: boolean;
  reducedMotion: boolean;
  initialIndex: number;
  exportRequest: ExportRequest | null;
  onSelect: (message: {
    generation: string;
    id: string;
    index: number;
  }) => Promise<void>;
  onShare: (message: { generation: string; id: string }) => Promise<void>;
  onPrivacy: () => Promise<void>;
  onRead: () => Promise<void>;
  dismissDialog: number;
  onDialogChange: (message: {
    generation: string;
    open: boolean;
  }) => Promise<void>;
  onOffer: () => Promise<void>;
  onExportChunk: (message: ExportPacket) => Promise<boolean>;
  onExportError: (message: {
    generation: string;
    requestId: string;
  }) => Promise<void>;
  dom?: DOMProps;
};
export default function Viewer({
  presentation,
  active,
  reducedMotion,
  initialIndex,
  exportRequest,
  onSelect,
  onShare,
  onPrivacy,
  onRead,
  dismissDialog,
  onDialogChange,
  onOffer,
  onExportChunk,
  onExportError,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    background = useRef<HTMLCanvasElement>(null),
    labels = useRef<HTMLCanvasElement>(null);
  const controller = useRef<any>(null),
    pointer = useRef<{ x: number; y: number } | null>(null),
    processed = useRef("");
  const [index, setIndex] = useState(initialIndex),
    [paused, setPaused] = useState(false),
    [chapters, setChapters] = useState(false),
    [error, setError] = useState(""),
    [renderer, setRenderer] = useState("loading");
  const callbacks = useRef({
    onSelect,
    onExportChunk,
    onExportError,
    onDialogChange,
  });
  callbacks.current = {
    onSelect,
    onExportChunk,
    onExportError,
    onDialogChange,
  };
  useEffect(() => {
    setChapters(false);
  }, [dismissDialog]);
  useEffect(() => {
    void callbacks.current
      .onDialogChange({ generation: presentation.generation, open: chapters })
      .catch(() => {});
  }, [chapters, presentation.generation]);
  const valid = validPresentation(presentation),
    story = presentation.stories[index];
  useEffect(() => {
    if (!valid || !presentation.stories.length) return;
    const instance = createViewer({
      container: container.current,
      background: background.current,
      labels: labels.current,
      presentation,
      initialIndex,
      onSelect: (selected: number) => {
        setIndex(selected);
        void callbacks.current
          .onSelect({
            generation: presentation.generation,
            id: presentation.stories[selected].id,
            index: selected,
          })
          .catch(() => {});
      },
      onError: setError,
      onRenderer: setRenderer,
    });
    controller.current = instance;
    instance.configure({ active, paused, reduced: reducedMotion });
    return () => {
      instance.dispose();
      controller.current = null;
    };
  }, [presentation.generation]);
  useEffect(() => {
    controller.current?.configure({
      active: active && !chapters,
      paused,
      reduced: reducedMotion,
    });
  }, [active, paused, reducedMotion, chapters]);
  useEffect(() => {
    const request = exportRequest;
    if (
      !request ||
      request.generation !== presentation.generation ||
      processed.current === request.requestId
    )
      return;
    processed.current = request.requestId;
    let cancelled = false;
    let canvas: HTMLCanvasElement | null = null;
    (async () => {
      if (
        request.version !== 1 ||
        !colorways.includes(request.colorway) ||
        request.id !== request.card.id ||
        !presentation.stories.some((s) => s.id === request.id && !s.promotional)
      )
        throw Error("Invalid export request");
      await loadViewerFonts();
      if (cancelled) return;
      canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const context = canvas.getContext("2d");
      if (!context) throw Error("Canvas unavailable");
      renderShareCard(context, 1080, 1920, {
        spec: exportSpec(request.card, presentation),
        colorway: request.colorway,
      });
      const data = canvas.toDataURL("image/png").split(",")[1];
      if (!data || data.length > 16000000) throw Error("Export too large");
      for (
        let offset = 0, part = 0;
        offset < data.length;
        offset += CHUNK_SIZE, part++
      ) {
        if (cancelled) return;
        const accepted = await callbacks.current.onExportChunk({
          version: 1,
          generation: request.generation,
          id: request.id,
          requestId: request.requestId,
          index: part,
          data: data.slice(offset, offset + CHUNK_SIZE),
          final: offset + CHUNK_SIZE >= data.length,
        });
        if (!accepted) return;
      }
    })()
      .catch(() => {
        if (!cancelled)
          void callbacks.current
            .onExportError({
              generation: request.generation,
              requestId: request.requestId,
            })
            .catch(() => {});
      })
      .finally(() => {
        if (canvas) canvas.width = canvas.height = 0;
      });
    return () => {
      cancelled = true;
    };
  }, [exportRequest?.requestId, presentation.generation]);
  function go(next: number) {
    if (controller.current?.go(next)) setChapters(false);
  }
  if (!valid || !story)
    return (
      <div role="alert" className="viewer-error">
        The recap could not be opened safely. Return and reconnect.
      </div>
    );
  return (
    <div
      ref={container}
      className="recap-viewer"
      data-story={story.id}
      data-renderer={renderer}
      onKeyDown={(event) => {
        if (chapters || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(index - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(index + 1);
        }
      }}
    >
      <canvas ref={background} className="dot-layer" aria-hidden="true" />
      <canvas
        ref={labels}
        className="dot-layer story-labels"
        aria-hidden="true"
      />
      <header className="viewer-header">
        <button
          onClick={() => setChapters(true)}
          aria-haspopup="dialog"
          aria-expanded={chapters}
        >
          Chapters
        </button>
        <button onClick={() => void onRead()}>Read card</button>
        <span>
          {index + 1} / {presentation.stories.length}
        </span>
        <button onClick={() => void onPrivacy()}>Coverage</button>
      </header>
      <div className="story-progress" aria-hidden="true">
        {Array.from(
          { length: Math.min(24, presentation.stories.length) },
          (_, i) => (
            <i
              key={i}
              className={
                i <=
                Math.floor(
                  (index / presentation.stories.length) *
                    Math.min(24, presentation.stories.length),
                )
                  ? "passed"
                  : ""
              }
            />
          ),
        )}
      </div>
      <main
        className="story-surface"
        tabIndex={0}
        aria-label="Recap story"
        onPointerDown={(event) => {
          pointer.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = pointer.current;
          pointer.current = null;
          if (
            !start ||
            chapters ||
            (event.target as HTMLElement).closest("button")
          )
            return;
          const dx = event.clientX - start.x,
            dy = event.clientY - start.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4)
            go(index + (dx < 0 ? 1 : -1));
          else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            const bounds = event.currentTarget.getBoundingClientRect();
            go(
              index +
                (event.clientX - bounds.left < bounds.width * 0.35 ? -1 : 1),
            );
          }
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
      >
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          <h1>{story.title.join(" ")}</h1>
          <p>
            {describe(story)} {presentation.notice}.
          </p>
        </div>
        {story.promotional && (
          <section className="promotion">
            <div className="rider" aria-hidden="true" />
            <p>ONE MORE RIDE?</p>
            <h2>Keep riding indoors.</h2>
            <p>
              Put your bike on a smart trainer. MINI WATT gives you structured
              workouts and real routes to ride.
            </p>
            <button onClick={() => void onOffer()}>Try MINI WATT free ↗</button>
            <p>
              14 days free, then $1.99/month · Mac + Windows. Works with any
              Bluetooth FTMS smart trainer.
            </p>
          </section>
        )}
      </main>
      <footer className="viewer-footer">
        <p className="dataset-notice">
          {presentation.exampleOnly
            ? "FICTIONAL DATA · DESIGN PREVIEW"
            : presentation.notice}
        </p>
        <nav aria-label="Story navigation">
          <button
            disabled={index === 0}
            onClick={() => go(index - 1)}
            aria-label="Previous story"
          >
            ←
          </button>
          <button
            disabled={reducedMotion}
            aria-pressed={paused || reducedMotion}
            onClick={() => setPaused((p) => !p)}
          >
            {reducedMotion ? "Still" : paused ? "Play" : "Pause"}
          </button>
          <button
            disabled={story.promotional}
            onClick={() =>
              void onShare({
                generation: presentation.generation,
                id: story.id,
              })
            }
          >
            Share card ↗
          </button>
          <button
            disabled={index === presentation.stories.length - 1}
            onClick={() => go(index + 1)}
            aria-label="Next story"
          >
            →
          </button>
        </nav>
      </footer>
      {error && (
        <div role="alert" className="viewer-error">
          {error}
        </div>
      )}
      {chapters && (
        <ChapterPicker
          stories={presentation.stories}
          index={index}
          onChoose={go}
          onClose={() => setChapters(false)}
        />
      )}
    </div>
  );
}
function ChapterPicker({
  stories,
  index,
  onChoose,
  onClose,
}: {
  stories: Presentation["stories"];
  index: number;
  onChoose: (i: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="chapter-picker"
      aria-label="Choose a chapter"
    >
      <div className="picker-heading">
        <h2>Your stories</h2>
        <button autoFocus onClick={onClose}>
          Close
        </button>
      </div>
      <ol>
        {stories.map((s, i) => (
          <li key={s.id}>
            <button
              aria-current={i === index ? "step" : undefined}
              onClick={() => {
                onChoose(i);
                onClose();
              }}
            >
              {s.title.join(" ")}
              {s.health ? " · Health card" : ""}
            </button>
          </li>
        ))}
      </ol>
    </dialog>
  );
}
