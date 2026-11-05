import React, { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import Viewer from "../../Viewer";
import type { Presentation } from "../../src/types";
import { dataset as example } from "../../vendor/public/sample-data.mjs";
import {
  makePresentation,
  createShareAuthority,
  exportSpec,
} from "../../src/presentation.mjs";
import { displayFields } from "../../vendor/public/story-model.mjs";
import { createTransfer } from "../../src/export-transfer.mjs";
import { renderShareCard as referenceRender } from "../../vendor/public/share-card.mjs";
import { loadThree as referenceThree } from "../../vendor/public/dot-scene.mjs";
import { loadViewerFonts } from "../../src/viewer/controller.mjs";
const { dataset, presentation: rawPresentation } = makePresentation(
  example,
  "session-browser",
);
const presentation = rawPresentation as Presentation;
function Harness() {
  const [active, setActive] = useState(true),
    [exportRequest, setExportRequest] = useState<any>(null),
    [mount, setMount] = useState(true);
  const authority = useRef(
    createShareAuthority(dataset, presentation.generation),
  ).current;
  const transfer = useRef<any>(null);
  const results: any = useRef({
    chunks: 0,
    bytes: 0,
    lastId: "",
    png: "",
    error: false,
    shareRequests: [],
  }).current;
  Object.assign(window, {
    testResults: results,
    testPresentation: presentation,
    setTestActive: setActive,
    unmountViewer: () => setMount(false),
    async referencePng(id: string, colorway: string) {
      await Promise.all([loadViewerFonts(), referenceThree()]);
      const story = dataset.stories.find((s: any) => s.id === id);
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      referenceRender(canvas.getContext("2d"), 1080, 1920, {
        spec: exportSpec(displayFields(story), presentation),
        colorway,
      });
      const result = canvas.toDataURL("image/png");
      canvas.width = canvas.height = 0;
      return result;
    },
    authorizeExport(id: string, colorway: string) {
      results.png = "";
      results.error = false;
      const request = authority.begin(
        id,
        `share-browser-${Date.now().toString(36)}`,
        { colorway, healthConsent: true },
      );
      transfer.current = createTransfer((packet: any) =>
        authority.accepts(packet),
      );
      setExportRequest(request);
    },
    revokeExport() {
      authority.revoke();
      transfer.current?.clear();
      setExportRequest(null);
    },
  });
  return mount ? (
    <Viewer
      presentation={presentation}
      active={active}
      reducedMotion={matchMedia("(prefers-reduced-motion:reduce)").matches}
      initialIndex={0}
      exportRequest={exportRequest}
      onSelect={async (event) => {
        results.lastId = event.id;
      }}
      onShare={async (event) => {
        results.shareRequests.push(event);
      }}
      onPrivacy={async () => {}}
      onRead={async () => {}}
      dismissDialog={0}
      onDialogChange={async () => {}}
      onOffer={async () => {}}
      onExportChunk={async (packet) => {
        results.chunks++;
        const bytes = transfer.current?.receive(packet);
        if (bytes) {
          results.bytes = bytes.length;
          let text = "";
          for (const value of bytes) text += String.fromCharCode(value);
          results.png = "data:image/png;base64," + btoa(text);
        }
        return true;
      }}
      onExportError={async () => {
        results.error = true;
      }}
    />
  ) : (
    <p>Viewer removed</p>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
