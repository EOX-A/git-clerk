import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Load the actual example preset without the unrelated remote editor import.
const source = readFileSync(
  new URL("../public/config.js", import.meta.url),
  "utf8",
);
// Test each example independently of which assignment the developer has enabled.
const oscSource = source
  .slice(
    source.indexOf("// V2 chat:"),
    source.indexOf("// Alternative narrative"),
  )
  .split("\n")
  .slice(1)
  .join("\n")
  .replace(/^\/\/ ?/gm, "")
  .trim()
  .replace(/^\/\*|\*\/$/g, "");
const root = { gitClerkConfig: {} };
runInNewContext(oscSource, root);
runInNewContext(
  source.slice(
    source.indexOf("const schemaMap ="),
    source.indexOf("// Define automations"),
  ) + "\nglobalThis.schemaMap = schemaMap;",
  root,
);
export const exampleSchemaMap = JSON.parse(JSON.stringify(root.schemaMap));
const narrativeRoot = { gitClerkConfig: {} };
const narrativeSource = source
  .split("/* NARRATIVE_CHAT_CONFIG\n")[1]
  ?.split("NARRATIVE_CHAT_CONFIG */")[0];
if (!narrativeSource) throw new Error("Narrative chat example is missing.");
runInNewContext(narrativeSource, narrativeRoot);
export const narrativeChatConfig = JSON.parse(
  JSON.stringify(narrativeRoot.gitClerkConfig.chat),
);
export default JSON.parse(JSON.stringify(root.gitClerkConfig.chat));
