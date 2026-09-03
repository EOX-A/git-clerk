import isEqual from "lodash.isequal";
import { CUSTOM_EDITOR_INTERFACES } from "@/enums";
import { editorPreviewPostMessageMethod } from "@/methods/file-edit-view/post-message.js";
let init = false;

export function jsonSchemaFileChangeMethod({
  fileContent,
  detail,
  contentHistory,
  contentHistoryIndex,
  updatedFileContent,
  customInterfaces,
  updateNavButtonConfig,
}) {
  if (!updatedFileContent.value) {
    // Append key which is not present in the fileContent at beginning
    customInterfaces.value = Object.values(CUSTOM_EDITOR_INTERFACES);
    updatedFileContent.value = { ...fileContent.value };
    contentHistory.value.push(fileContent.value);
    contentHistoryIndex.value = 0;
    fileContent.value = updatedFileContent.value;
    init = true;
  } else if (!isEqual(updatedFileContent.value, detail)) {
    updatedFileContent.value = detail;
    const currentContentFromHistory =
      contentHistory.value[contentHistoryIndex.value];
    if (
      !currentContentFromHistory ||
      !isEqual(currentContentFromHistory, detail)
    ) {
      if (contentHistoryIndex.value < contentHistory.value.length - 1) {
        contentHistory.value = contentHistory.value.slice(
          0,
          contentHistoryIndex.value + 1,
        );
      }
      contentHistory.value.push(detail);
      contentHistoryIndex.value = contentHistory.value.length - 1;
    }
    updateNavButtonConfig("Save", false);
  } else {
    updateNavButtonConfig("Save", false);
  }

  if (isEqual(updatedFileContent.value, fileContent.value))
    updateNavButtonConfig();

  const message = {
    type: "SCHEMA_DATA_EDITOR_UPDATE",
    detail: detail,
    undo: Boolean(contentHistoryIndex.value !== 0),
    redo: Boolean(
      contentHistoryIndex.value !== contentHistory.value.length - 1,
    ),
  };

  editorPreviewPostMessageMethod(message, "*");
  init = false;
}
