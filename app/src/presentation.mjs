import {
  datasetFromPlan,
  displayFields,
  validChart,
  chartDescription,
  canRequestShare,
  sanitizedCard,
} from "../vendor/public/story-model.mjs";
import { recapSequence } from "../vendor/public/recap-sequence.mjs";
import { recapContext, cardSpec } from "../vendor/public/dot-spec.mjs";

const fields = new Set([
  "id",
  "template",
  "title",
  "value",
  "unit",
  "caption",
  "chart",
  "geometry",
  "presentation",
  "health",
  "promotional",
  "chapterId",
]);
const id = (v) => typeof v === "string" && /^[a-z][a-z0-9:_-]{0,99}$/.test(v);
function safeDisplay(story) {
  const display = displayFields(story),
    out = {};
  for (const [key, value] of Object.entries(display))
    if (fields.has(key) && value !== undefined) out[key] = value;
  if (
    (out.geometry !== undefined &&
      (typeof out.geometry !== "string" || out.geometry.length > 80)) ||
    (out.presentation !== undefined &&
      (typeof out.presentation !== "string" || out.presentation.length > 40))
  )
    throw Error("Unsupported presentation fields.");
  return out;
}
export function describe(story) {
  return `${story.title.join(" ")}. ${story.value} ${story.unit}. ${story.caption.replaceAll("\n", " ")} ${chartDescription(story.chart)}`;
}
export function makePresentation(plan, generation) {
  const dataset = datasetFromPlan(plan);
  const stories = recapSequence(dataset).map((story) => {
    const out = safeDisplay(story);
    return {
      ...out,
      health: !!story.health,
      promotional: !!story.promotional,
      chapterId: story.chapterId || "year_overview",
    };
  });
  const presentation = {
    version: 1,
    generation,
    year: dataset.year,
    exampleOnly: !!dataset.exampleOnly,
    notice: dataset.notice,
    stories,
  };
  if (!validPresentation(presentation))
    throw Error("The recap could not be prepared safely.");
  return { dataset, presentation };
}
export function validPresentation(p) {
  if (
    !p ||
    Object.keys(p).some(
      (k) =>
        ![
          "version",
          "generation",
          "year",
          "exampleOnly",
          "notice",
          "stories",
        ].includes(k),
    ) ||
    p.version !== 1 ||
    !id(p.generation) ||
    !Number.isInteger(p.year) ||
    p.year < 2000 ||
    p.year > 2100 ||
    typeof p.exampleOnly !== "boolean" ||
    typeof p.notice !== "string" ||
    p.notice.length > 500 ||
    !Array.isArray(p.stories) ||
    p.stories.length > 256
  )
    return false;
  const seen = new Set();
  for (const s of p.stories) {
    if (
      !s ||
      Object.keys(s).some((k) => !fields.has(k)) ||
      !id(s.id) ||
      seen.has(s.id) ||
      !id(s.template) ||
      !id(s.chapterId) ||
      typeof s.health !== "boolean" ||
      typeof s.promotional !== "boolean" ||
      !Array.isArray(s.title) ||
      s.title.length < 1 ||
      s.title.length > 8 ||
      !s.title.every((t) => typeof t === "string" && t.length <= 120) ||
      typeof s.value !== "string" ||
      s.value.length > 100 ||
      typeof s.unit !== "string" ||
      s.unit.length > 180 ||
      typeof s.caption !== "string" ||
      s.caption.length > 500
    )
      return false;
    if (
      s.chart &&
      (!validChart(s.chart) ||
        JSON.stringify(displayFields(s).chart) !== JSON.stringify(s.chart))
    )
      return false;
    if (
      (s.geometry !== undefined &&
        (typeof s.geometry !== "string" || s.geometry.length > 80)) ||
      (s.presentation !== undefined &&
        (typeof s.presentation !== "string" || s.presentation.length > 40))
    )
      return false;
    if (
      s.promotional &&
      (s.id !== "mini-watt" ||
        s.template !== "miniwatt" ||
        s !== p.stories.at(-1))
    )
      return false;
    seen.add(s.id);
  }
  return JSON.stringify(p).length <= 1000000;
}
export const colorways = ["original", "paper", "cobalt", "ember"];
export function exportSpec(card, presentation) {
  const spec = cardSpec(card, recapContext(presentation.stories));
  return {
    ...spec,
    notice: presentation.exampleOnly ? "Fictional data" : presentation.notice,
    right:
      spec.right === "GARMIN WRAPED"
        ? `GARMIN WRAPED · ${presentation.year}`
        : spec.right,
  };
}

// Only native code owns this object. A grant is scoped to one share interaction.
export function createShareAuthority(dataset, generation) {
  let grant = null;
  const revoke = () => {
    if (grant) dataset.shareConsents.delete(grant.id);
    grant = null;
  };
  return {
    revoke,
    begin(
      storyId,
      requestId,
      { healthConsent = false, colorway = "original" } = {},
    ) {
      revoke();
      const story = dataset.stories.find((s) => s.id === storyId);
      if (
        !story ||
        !canRequestShare(story, dataset) ||
        !id(requestId) ||
        !colorways.includes(colorway)
      )
        throw Error("This card cannot be shared.");
      if (story.health && !dataset.exampleOnly && !healthConsent)
        throw Error("Choose whether to share this health card first.");
      if (healthConsent) dataset.shareConsents.add(story.id);
      const card = safeDisplay(sanitizedCard(story, dataset));
      // Validate the export renderer's display allowlist independently of the source.
      grant = {
        version: 1,
        generation,
        id: storyId,
        requestId,
        colorway,
        card,
      };
      return grant;
    },
    accepts(packet) {
      return (
        !!grant &&
        packet?.generation === generation &&
        packet.requestId === grant.requestId &&
        packet.id === grant.id
      );
    },
  };
}
