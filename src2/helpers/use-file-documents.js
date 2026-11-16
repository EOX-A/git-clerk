import { computed, onUnmounted, ref } from "vue";
import { fetchFileSchema, getFileContent, saveFile } from "@/api/index.js";
import {
  fileConfiguration,
  formValue,
  initialFileMode,
  legacySession,
  previewAddress,
} from "./file-editor.js";
import { validateFileMethod } from "@/methods/file-edit-view";

export default function useFileDocuments(
  session,
  changedFiles,
  onSaved,
  snackbar,
) {
  const documents = ref({});
  const controllers = new Map();
  const dirtyPaths = computed(() =>
    Object.entries(documents.value)
      .filter(([, doc]) => doc.loaded && doc.text !== doc.savedText)
      .map(([path]) => path),
  );
  let disposed = false;
  const loadMethod = async (path, force = false) => {
    if (
      !force &&
      (documents.value[path]?.loaded || documents.value[path]?.loading)
    )
      return;
    controllers.get(path)?.abort();
    const controller = new AbortController();
    controllers.set(path, controller);
    const currentSession = session.value;
    documents.value[path] = {
      loading: true,
      loaded: false,
      error: "",
      text: "",
      savedText: "",
      mode: "source",
      meta: null,
      preview: null,
      interfaces: [],
      saving: false,
      validation: [],
      history: [],
      historyIndex: 0,
    };
    const doc = documents.value[path];
    try {
      const removed =
        changedFiles.value.find((file) => file.path === path)?.status ===
        "removed";
      const readSession = removed
        ? {
            ...currentSession,
            headOwner: currentSession.owner,
            headRepo: currentSession.repo,
            headSha: currentSession.baseSha,
          }
        : currentSession;
      const file = await getFileContent(readSession, path, controller.signal);
      const config = fileConfiguration(path);
      let meta = config.meta;
      let schemaError = "";
      if (meta) {
        try {
          if (!meta.schema && meta.url)
            meta.schema = await fetchFileSchema(meta.url, controller.signal);
          if (config.generateEnums)
            meta = await config.generateEnums(
              meta,
              legacySession(currentSession),
              true,
              {
                getFileDetails: (_session, relatedPath) =>
                  getFileContent(
                    currentSession,
                    relatedPath,
                    controller.signal,
                  ),
              },
            );
        } catch (cause) {
          if (controller.signal.aborted) throw cause;
          schemaError =
            "The configured editor schema could not be loaded. Source is still available.";
          meta = { ...meta, schema: null };
        }
      }
      if (disposed || controller.signal.aborted) return;
      const preview = previewAddress(meta?.preview, window.location.href);
      Object.assign(doc, {
        ...file,
        text: file.text ?? "",
        savedText: file.text ?? "",
        headSha: currentSession.headSha,
        removed,
        loading: false,
        loaded: true,
        meta,
        preview,
        schemaError,
        interfaces: config.interfaces,
        mode: initialFileMode(preview),
        history: [file.text ?? ""],
        historyIndex: 0,
      });
    } catch {
      if (!disposed && !controller.signal.aborted)
        Object.assign(doc, {
          loading: false,
          error: "Could not load this file. It may have moved or been deleted.",
        });
    }
  };
  const changeMethod = (path, text) => {
    const doc = documents.value[path];
    if (
      !doc?.loaded ||
      doc.saving ||
      !session.value.canEdit ||
      doc.removed ||
      text === doc.text
    )
      return;
    doc.text = text;
    doc.validation = [];
    doc.history = doc.history.slice(0, doc.historyIndex + 1);
    doc.history.push(text);
    if (doc.history.length > 100) doc.history.shift();
    doc.historyIndex = doc.history.length - 1;
    doc.saved = false;
  };
  const historyMethod = (path, direction) => {
    const doc = documents.value[path];
    if (!doc || doc.saving || !session.value.canEdit || doc.removed) return;
    const index = doc.historyIndex + direction;
    if (index < 0 || index >= doc.history.length) return;
    doc.historyIndex = index;
    doc.text = doc.history[index];
    doc.validation = [];
  };
  const saveMethod = async (path) => {
    const doc = documents.value[path];
    if (
      !doc?.loaded ||
      doc.saving ||
      !session.value.canEdit ||
      doc.unavailable ||
      doc.removed
    )
      return false;
    if (doc.text === doc.savedText) return true;
    if (doc.schemaError) {
      doc.validation = [
        { message: "Reload the configured schema before saving this file." },
      ];
      return false;
    }
    doc.saving = true;
    doc.validation = [];
    const text = doc.text;
    try {
      if (doc.meta?.schema) {
        let value;
        try {
          value = formValue(text, doc.meta);
        } catch {
          doc.validation = [
            {
              message:
                "This file isn't valid JSON. Fix it in Source before saving.",
            },
          ];
          return false;
        }
        doc.validation = await validateFileMethod(
          value,
          doc.meta,
          doc.interfaces,
        );
        if (doc.validation.length) return false;
      }
      const result = await saveFile(session.value, path, text, doc.sha);
      doc.sha = result.sha;
      doc.headSha = result.commitSha;
      doc.savedText = text;
      doc.saved = true;
      doc.remoteChanged = false;
      snackbar.value = {
        text: "Changes saved",
        description: `Saved ${path} to PR #${session.value.number}`,
        status: "success",
      };
      await onSaved();
      return true;
    } catch (cause) {
      snackbar.value = {
        text:
          cause.status === 409 || cause.status === 422
            ? "The file changed on GitHub. Your draft is preserved; compare it with the latest version before retrying."
            : "Could not save this file. Your draft is preserved. Check your access and try again.",
        status: "error",
      };
      return false;
    } finally {
      doc.saving = false;
    }
  };
  const forgetMethod = (path) => {
    controllers.get(path)?.abort();
    controllers.delete(path);
    delete documents.value[path];
  };
  onUnmounted(() => {
    disposed = true;
    controllers.forEach((controller) => controller.abort());
  });
  return {
    documents,
    dirtyPaths,
    loadMethod,
    changeMethod,
    historyMethod,
    saveMethod,
    forgetMethod,
  };
}
