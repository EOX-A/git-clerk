import { updateSchemaDefaults } from "@/helpers/index.js";
import isEqual from "lodash.isequal";
import { initEOXJSONFormMethod } from "@/methods/file-edit-view/init-eox-jsonform.js";

export function debouncePostMessageMethod(message, origin, init = false) {
  const previewFrame = document.getElementById("previewFrame");
  if (previewFrame && previewFrame.contentWindow) {
    if (init)
      previewFrame.onload = () =>
        previewFrame.contentWindow.postMessage(message, origin);
    previewFrame.contentWindow.postMessage(message, origin);
  }
}

export function addPostMessageEventMethod({
  previewURL,
  fileContent,
  updatedFileContent,
  jsonFormInstance,
  isFormJSON,
}) {
  window.addEventListener("message", function (event) {
    if (
      event.origin === window.location.origin &&
      event.data &&
      event.data.type === "SCHEMA_DATA_PREVIEW_UPDATE" &&
      event.data.detail
    ) {
      if (previewURL.value) {
        const newSchema = updateSchemaDefaults(
          JSON.parse(fileContent.value),
          event.data.detail,
        );

        if (!isEqual(updatedFileContent.value, newSchema)) {
          jsonFormInstance.value.editor.setValue(event.data.detail);
          initEOXJSONFormMethod(jsonFormInstance, isFormJSON, previewURL);
        }
      }
    }
  });
}
