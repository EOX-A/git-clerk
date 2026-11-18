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
import { applyPublishedFile, publishedFile } from "./file-publication.js";

export default function useFileDocuments(
  session,
  changedFiles,
  onSaved,
  snackbar,
  publication = ref(null),
) {
  const documents = ref({});
  const controllers = new Map();
  const dirtyPaths = computed(() =>
    Object.entries(documents.value)
      .filter(([, doc]) => doc.loaded && doc.text !== doc.savedText)
      .map(([path]) => path),
  );
  let disposed = false;
  const loadMethod = async (
    path,
    { force = false, background = false } = {},
  ) => {
    const existing = documents.value[path];
    if (!force && !background && (existing?.loaded || existing?.loading))
      return;
    const refreshing = background && existing?.loaded;
    const previousHead = existing?.headSha;
    controllers.get(path)?.abort();
    const controller = new AbortController();
    controllers.set(path, controller);
    const currentSession = session.value;
    if (!refreshing)
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
    const canUpdate = () => {
      if (disposed || controller.signal.aborted) return false;
      // A delayed refresh cannot restore an older revision or overwrite a draft.
      if (session.value.headSha !== currentSession.headSha) {
        loadMethod(path, { force: force || !background, background });
        return false;
      }
      if (refreshing && (doc.saving || doc.headSha !== previousHead))
        return false;
      if (refreshing && doc.text !== doc.savedText) {
        doc.remoteChanged = true;
        return false;
      }
      return true;
    };
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
            branch: currentSession.baseBranch,
          }
        : currentSession;
      const file =
        publishedFile(publication.value, readSession, path) ||
        (await getFileContent(readSession, path, controller.signal));
      if (!canUpdate()) return;
      if (
        !force &&
        refreshing &&
        file.sha &&
        file.sha === doc.sha &&
        removed === doc.removed
      ) {
        // An unrelated commit should not remount the editor or reload its schema.
        Object.assign(doc, {
          headSha: currentSession.headSha,
          error: "",
          refreshError: "",
          remoteChanged: false,
        });
        return;
      }
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
      if (!canUpdate()) return;
      const preview = previewAddress(meta?.preview, window.location.href);
      Object.assign(doc, {
        ...file,
        text: file.text ?? "",
        savedText: file.text ?? "",
        headSha: currentSession.headSha,
        removed,
        loading: false,
        loaded: true,
        error: "",
        refreshError: "",
        remoteChanged: false,
        saved: false,
        validation: [],
        meta,
        preview,
        schemaError,
        interfaces: config.interfaces,
        mode:
          refreshing && (doc.mode !== "none" || preview)
            ? doc.mode
            : initialFileMode(preview),
        history: [file.text ?? ""],
        historyIndex: 0,
      });
    } catch (cause) {
      if (!canUpdate()) return;
      if (refreshing && cause?.status !== 404)
        doc.refreshError =
          "Could not refresh this file. Showing the last loaded version.";
      else
        Object.assign(doc, {
          loading: false,
          error: "Could not load this file. It may have moved or been deleted.",
        });
    }
  };
  const applyPublicationMethod = (path) => {
    const applied = applyPublishedFile(
      documents.value[path],
      publishedFile(publication.value, session.value, path),
      session.value.headSha,
    );
    if (applied) controllers.get(path)?.abort();
    return applied;
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
            ? "The file changed in the repository. Your draft is preserved; compare it with the latest version before retrying."
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
    applyPublicationMethod,
    changeMethod,
    historyMethod,
    saveMethod,
    forgetMethod,
  };
}
