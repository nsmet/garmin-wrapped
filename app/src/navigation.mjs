export function allowViewerNavigation(value, development = false, devHost) {
  if (value === "about:blank") return true;
  try {
    const url = new URL(value);
    if (url.protocol === "file:")
      return !url.host && url.pathname.includes("/www.bundle/");
    if (development && devHost) {
      const expected = new URL("http://" + devHost);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        url.host === expected.host &&
        url.pathname.startsWith("/_expo/@dom/")
      );
    }
  } catch {}
  return false;
}
