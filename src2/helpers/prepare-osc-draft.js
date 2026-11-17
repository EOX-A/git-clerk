// Prepare the transport bundle only. OSC schema validation is deferred.
export function prepareOscDraft(draft, signal) {
  signal?.throwIfAborted();
  if (
    !draft ||
    typeof draft.title !== "string" ||
    !draft.title.trim() ||
    !draft.files
  )
    throw new Error(
      "The response did not include a session title and complete OSC files. Ask for complete files.",
    );
  const bundle = { draft, staged_files: draft.files };
  return bundle;
}
