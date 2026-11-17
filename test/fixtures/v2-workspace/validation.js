import validateFileMethod from "@/methods/file-edit-view/validate-file.js";
import schema from "./osc-product-schema.json";
import { checkDraftFiles } from "@/api/draft-files.js";
import { fileConfiguration } from "@/helpers/file-editor.js";
import { schemaMap } from "virtual:example-chat-config";
// Official product schema snapshot, retrieved 2026-11-17 from:
// https://esa-earthcode.github.io/open-science-catalog-validation/schemas/products/children.json
const product = {
  type: "Collection",
  stac_version: "1.0.0",
  id: "synthetic-validation-test",
  title: "Synthetic validation test",
  description:
    "Synthetic metadata used only to test validation; never published.",
  license: "CC0-1.0",
  extent: {
    spatial: { bbox: [[-10, -10, 10, 10]] },
    temporal: { interval: [["2024-01-01T00:00:00Z", "2024-12-31T23:59:59Z"]] },
  },
  "osc:type": "product",
  "osc:status": "completed",
  "osc:project": "synthetic-project",
  themes: [
    {
      scheme: "https://github.com/stac-extensions/osc#theme",
      concepts: [{ id: "oceans" }],
    },
  ],
  links: [{ rel: "parent", href: "../catalog.json", type: "application/json" }],
};

const result = document.querySelector("#result");
document
  .querySelector("#check-files")
  .addEventListener("click", async (event) => {
    const output = document.querySelector("#files-result");
    event.target.disabled = true;
    output.textContent = "Checking draft files…";
    try {
      const files = JSON.parse(document.querySelector("#files").value);
      const entries = checkDraftFiles({
        staged_files: files,
        validation: { valid: true },
      });
      output.textContent = `PASS: ${entries.length} file paths and content types accepted; casing preserved.`;
      for (const [path, value] of entries) {
        const { meta } = fileConfiguration(path, {
          gitClerkConfig: { schemaMap },
        });
        if (!meta?.url) throw new Error(`${path}: no schema mapping`);
        const response = await fetch(meta.url);
        if (!response.ok)
          throw new Error(`${path}: schema HTTP ${response.status}`);
        meta.schema = await response.json();
        const errors = await validateFileMethod(value, meta, []);
        output.textContent += `\n${errors.length ? "INVALID" : "PASS"}: ${path}${errors.length ? ` — ${errors.map((error) => error.message).join("; ")}` : ""}`;
      }
      output.textContent +=
        "\nCheck complete. No GitHub or LLM requests were made.";
    } catch (error) {
      output.textContent += `\nFAIL: ${error.message}`;
    } finally {
      event.target.disabled = false;
    }
  });
window.addEventListener("unhandledrejection", (event) => {
  result.textContent += `\nUnhandled: ${event.reason?.stack || event.reason}`;
});
document.querySelector("#run").addEventListener("click", async () => {
  const button = document.querySelector("#run");
  button.disabled = true;
  result.textContent = "Testing the official OSC product schema…";
  const missing = structuredClone(product);
  delete missing.license;
  const invalidBounds = structuredClone(product);
  invalidBounds.extent.spatial.bbox = [[0, 0, 1]];
  const cases = [
    ["Complete product passes", product, (errors) => !errors.length],
    [
      "Missing license is rejected",
      missing,
      (errors) =>
        errors.some(
          (error) =>
            error.property === "required" && /License/i.test(error.message),
        ),
    ],
    [
      "Invalid spatial extent is rejected",
      invalidBounds,
      (errors) => errors.some((error) => error.path.includes("bbox")),
    ],
    ["Repeated validation passes", product, (errors) => !errors.length],
  ];
  try {
    for (const [label, value, accepts] of cases) {
      const original = JSON.stringify(value);
      const start = performance.now();
      const errors = await validateFileMethod(
        value,
        { schema: structuredClone(schema) },
        [],
      );
      if (!accepts(errors))
        throw new Error(`${label}: ${JSON.stringify(errors)}`);
      if (JSON.stringify(value) !== original)
        throw new Error("Validation mutated the draft");
      if (document.querySelector("eox-jsonform"))
        throw new Error("Validation form was not cleaned up");
      result.textContent += `\nPASS: ${label} (${Math.round(performance.now() - start)} ms)`;
    }
    result.textContent +=
      "\nAll checks passed. No GitHub or LLM requests were made.";
  } catch (error) {
    result.textContent += `\nFAIL: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
