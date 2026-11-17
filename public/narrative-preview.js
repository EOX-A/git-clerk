// Adapt the supplied storytelling preview to Git Clerk's existing iframe protocol.
export function mountNarrativePreview(window) {
  const { document } = window;
  const preview = document.querySelector("#storytelling-preview");
  const status = document.querySelector("#preview-status");
  const source = document.querySelector("#preview-source");
  const parentOrigin = new URL(document.referrer || window.location.href)
    .origin;
  let markdown = null;
  let readOnly = true;
  let ready = false;
  let unavailable = false;
  const send = (message) => window.parent.postMessage(message, parentOrigin);
  const update = () => {
    if (markdown === null) return;
    status.hidden = ready;
    source.hidden = !unavailable;
    source.textContent = markdown;
    if (!ready) return;
    preview.showEditor = readOnly ? undefined : "";
    preview.toggleAttribute("show-editor", !readOnly);
    if (preview.markdown !== markdown) preview.markdown = markdown;
    send({ type: "DISABLE_LOADER_POSTMESSAGE" });
  };
  const receive = (event) => {
    if (
      event.source !== window.parent ||
      event.origin !== parentOrigin ||
      event.data?.type !== "SCHEMA_DATA_EDITOR_UPDATE"
    )
      return;
    if (typeof event.data.detail?.Story !== "string") return;
    markdown = event.data.detail.Story;
    readOnly = Boolean(event.data.readOnly);
    update();
  };
  const changed = (event) => {
    if (
      !ready ||
      readOnly ||
      markdown === null ||
      typeof event.detail !== "string" ||
      event.detail === markdown
    )
      return;
    markdown = event.detail;
    send({ type: "SCHEMA_DATA_PREVIEW_UPDATE", detail: { Story: markdown } });
  };
  const upload = (event) => {
    // Git Clerk v2 has no FILE_UPLOAD/FILE_UPLOADED host handler yet.
    event.detail?.update?.(
      null,
      new Error(
        "File uploads are not connected in Git Clerk yet. Use an existing image URL.",
      ),
    );
  };
  window.addEventListener("message", receive);
  preview.addEventListener("changed", changed);
  preview.addEventListener("upload:file", upload);
  return {
    ready() {
      ready = true;
      status.hidden = markdown !== null;
      status.textContent =
        "Open a narrative file in Git Clerk to see its preview.";
      update();
    },
    showUnavailable() {
      unavailable = true;
      status.hidden = false;
      status.textContent =
        "The EOX preview could not load. Showing the narrative source.";
      update();
      send({ type: "DISABLE_LOADER_POSTMESSAGE" });
    },
    dispose() {
      window.removeEventListener("message", receive);
      preview.removeEventListener("changed", changed);
      preview.removeEventListener("upload:file", upload);
    },
  };
}
