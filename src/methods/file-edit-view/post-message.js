import { updateSchemaDefaults, useLoader } from "@/helpers/index.js";
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
  updatedFileContent,
  jsonFormInstance,
  isSchemaBased,
}) {
  const loader = useLoader();
  let loaderInstance = null;
  window.addEventListener("message", function (event) {
    if (
      event.data &&
      event.data.type === "SCHEMA_DATA_PREVIEW_UPDATE" &&
      event.data.detail
    ) {
      if (previewURL.value) {
        if (!isEqual(updatedFileContent.value, event.data.detail)) {
          jsonFormInstance.value.editor.setValue(event.data.detail);
          initEOXJSONFormMethod(jsonFormInstance, isSchemaBased, previewURL);
        }
      }
    }
    if (event.data && event.data.type === "EDITOR_FILE_UPLOADING")
      loaderInstance = loader.show();
    if (event.data && event.data.type === "EDITOR_FILE_UPLOADED")
      loaderInstance?.hide();
  });
}
