import { test, expect } from "@playwright/test";
import sharp from "sharp";
async function ready(page) {
  await page.goto("/");
  await expect(page.locator(".recap-viewer")).not.toHaveAttribute(
    "data-renderer",
    "loading",
  );
}
test("bundled fonts, navigation, chapters, reduced motion and accessibility descriptions", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  expect(await page.evaluate(() => document.fonts.check("800 40px Sora"))).toBe(
    true,
  );
  await expect(page.locator(".recap-viewer")).toHaveAttribute(
    "data-story",
    "cover",
  );
  await page.getByRole("button", { name: "Next story" }).click();
  await expect(page.locator(".recap-viewer")).toHaveAttribute(
    "data-story",
    "year-summary",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "THE WHOLE YEAR, IN VIEW.",
  );
  await expect(page.getByRole("button", { name: "Still" })).toBeDisabled();
  await page.getByRole("button", { name: "Chapters", exact: true }).click();
  await page
    .getByRole("button", {
      name: "YOUR OVERNIGHT HRV. · Health card",
      exact: true,
    })
    .click();
  await expect(page.locator(".recap-viewer")).toHaveAttribute(
    "data-story",
    "hrv-median",
  );
  await page.getByRole("button", { name: "Share card" }).click();
  expect(
    await page.evaluate(() => window.testResults.shareRequests.length),
  ).toBe(1);
  expect(await page.evaluate(() => window.testResults.chunks)).toBe(0);
  expect(errors).toEqual([]);
});
test("all four PNG colourways exactly match the pinned web renderer", async ({
  page,
}) => {
  await ready(page);
  for (const colorway of ["original", "paper", "cobalt", "ember"]) {
    await page.evaluate(
      (color) => window.authorizeExport("year-summary", color),
      colorway,
    );
    await expect
      .poll(() => page.evaluate(() => window.testResults.png.length), {
        timeout: 30000,
      })
      .toBeGreaterThan(1000);
    const mobile = await page.evaluate(() => window.testResults.png),
      reference = await page.evaluate(
        (color) => window.referencePng("year-summary", color),
        colorway,
      );
    const a = await sharp(Buffer.from(mobile.split(",")[1], "base64"))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const b = await sharp(Buffer.from(reference.split(",")[1], "base64"))
      .raw()
      .toBuffer();
    expect(a.info.width).toBe(1080);
    expect(a.info.height).toBe(1920);
    expect(a.data.equals(b)).toBe(true);
  }
});
test("Canvas fallback, interrupted transfer and unmount recover without stale exports", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "webgl" || type === "webgl2") return null;
      return get.call(this, type, ...args);
    };
  });
  await ready(page);
  await expect(page.locator(".recap-viewer")).toHaveAttribute(
    "data-renderer",
    "2d",
  );
  await page.evaluate(() => {
    window.authorizeExport("running-sessions", "paper");
    window.revokeExport();
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.testResults.png)).toBe("");
  await page.evaluate(() =>
    window.authorizeExport("running-sessions", "paper"),
  );
  await expect
    .poll(() => page.evaluate(() => window.testResults.png.length), {
      timeout: 30000,
    })
    .toBeGreaterThan(1000);
  await page.evaluate(() => window.unmountViewer());
  await expect(page.getByText("Viewer removed")).toBeVisible();
  expect(await page.locator("canvas").count()).toBe(0);
});
test("each reachable story draws and exports with no non-finite geometry or errors", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const ids = await page.evaluate(() =>
    window.testPresentation.stories
      .filter((s) => !s.promotional)
      .map((s) => s.id),
  );
  for (const id of ids) {
    await page.evaluate((id) => window.authorizeExport(id, "original"), id);
    await expect
      .poll(() => page.evaluate(() => window.testResults.png.length), {
        timeout: 15000,
      })
      .toBeGreaterThan(1000);
    expect(await page.evaluate(() => window.testResults.error)).toBe(false);
    const actual = await page.evaluate(() => window.testResults.png);
    const expected = await page.evaluate(
      (id) => window.referencePng(id, "original"),
      id,
    );
    expect(actual).toBe(expected);
  }
});

test("exported iOS DOM bundle boots with bundled fonts and no remote assets", async ({
  page,
}) => {
  const { readdirSync } = await import("node:fs");
  const { makePresentation } = await import("../../src/presentation.mjs");
  const { dataset } = await import("../../vendor/public/sample-data.mjs");
  const presentation = makePresentation(
    dataset,
    "session-exported",
  ).presentation;
  await page.addInitScript((p) => {
    window.ReactNativeWebView = {
      injectedObjectJson: () =>
        JSON.stringify({
          EXPO_DOM_HOST_OS: "android",
          initialProps: {
            props: {
              presentation: p,
              active: true,
              reducedMotion: true,
              initialIndex: 0,
              exportRequest: null,
              dismissDialog: 0,
            },
            names: [
              "onSelect",
              "onShare",
              "onRead",
              "onDialogChange",
              "onPrivacy",
              "onOffer",
              "onExportChunk",
              "onExportError",
            ],
          },
        }),
      postMessage: (raw) => {
        const message = JSON.parse(raw);
        if (message.type === "$$native_action")
          queueMicrotask(() =>
            window.dispatchEvent(
              new CustomEvent("$$dom_event", {
                detail: {
                  type: "$$native_action_result",
                  data: {
                    uid: message.data.uid,
                    actionId: message.data.actionId,
                    result: null,
                  },
                },
              }),
            ),
          );
      },
    };
  }, presentation);
  const remote = [];
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !request.url().startsWith("http://127.0.0.1:4176/")
    )
      remote.push(request.url());
  });
  for (const platform of ["ios"]) {
    const file = readdirSync(`.build/${platform}/www.bundle`).find((name) =>
      name.endsWith(".html"),
    );
    await page.goto(`/release-${platform}/www.bundle/${file}`);
    await expect(page.locator(".recap-viewer")).toHaveAttribute(
      "data-renderer",
      "webgl",
    );
    expect(
      await page.evaluate(() => document.fonts.check("800 40px Sora")),
    ).toBe(true);
    await expect(page.locator(".recap-viewer")).toHaveAttribute(
      "data-story",
      "cover",
    );
    await page.getByRole("button", { name: "Next story" }).click();
    await expect(page.locator(".recap-viewer")).toHaveAttribute(
      "data-story",
      "year-summary",
    );
  }
  expect(remote).toEqual([]);
});

test("WebGL loss falls back and inactive viewers stop animation frames", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.frameCount = 0;
    const original = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) =>
      original((time) => {
        window.frameCount++;
        callback(time);
      });
  });
  await ready(page);
  await expect(page.locator(".recap-viewer")).toHaveAttribute(
    "data-renderer",
    "webgl",
  );
  await page.evaluate(() => {
    const canvas = document.querySelectorAll("canvas")[1];
    canvas
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context")
      .loseContext();
  });
  await expect(page.locator(".recap-viewer")).toHaveAttribute(
    "data-renderer",
    "2d",
  );
  await page.evaluate(() => window.setTestActive(false));
  await page.waitForTimeout(150);
  const count = await page.evaluate(() => window.frameCount);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.frameCount)).toBe(count);
  await page.evaluate(() => window.setTestActive(true));
  await expect
    .poll(() => page.evaluate(() => window.frameCount))
    .toBeGreaterThan(count);
});

test("story controls remain reachable on small, large and landscape surfaces", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 430, height: 850 },
    { width: 667, height: 300 },
  ]) {
    await page.setViewportSize(viewport);
    for (const label of ["Chapters", "Read card", "Coverage", "Next story"]) {
      const button = page.getByRole("button", { name: label, exact: true });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }
  }
  await page.setViewportSize({ width: 390, height: 760 });
  await page.screenshot({ path: ".build/validation/fictional-recap.png" });
});

test("the live GPU layer preserves the reference navy background", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await expect(page.locator(".recap-viewer")).toHaveAttribute(
    "data-renderer",
    "webgl",
  );
  const { data, info } = await sharp(await page.screenshot())
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const offset = (150 * info.width + 2) * 3;
  expect(data[offset] + data[offset + 1] + data[offset + 2]).toBeGreaterThan(
    20,
  );
  expect(data[offset + 2]).toBeGreaterThan(data[offset]);
});

test("settled static typography is not repainted during ambient dot animation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.textPaints = 0;
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      window.textPaints++;
      return fill.apply(this, args);
    };
  });
  await ready(page);
  await page.waitForTimeout(4000);
  const paints = await page.evaluate(() => window.textPaints);
  expect(paints).toBeGreaterThan(0);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.textPaints)).toBe(paints);
});
