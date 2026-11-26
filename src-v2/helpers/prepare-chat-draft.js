// Prepare the transport bundle only; content validation belongs to the backend.
export function prepareChatDraft(draft, signal) {
  signal?.throwIfAborted();
  if (
    !draft ||
    typeof draft.title !== "string" ||
    !draft.title.trim() ||
    !draft.files
  )
    throw new Error(
      "The response did not include a session title and complete files. Ask for complete files.",
    );
  const bundle = { draft, staged_files: draft.files };
  return bundle;
}
