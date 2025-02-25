import { updateSchemaDefaults, useLoader } from "@/helpers/index.js";
import isEqual from "lodash.isequal";
import { initEOXJSONFormMethod } from "@/methods/file-edit-view/init-eox-jsonform.js";

export function debouncePostMessageMethod(message, origin, init = false) {
  const data = JSON.parse(JSON.stringify(message));
  const previewFrame = document.getElementById("previewFrame");
  if (previewFrame && previewFrame.contentWindow) {
    previewFrame.onload = () => {
      previewFrame.contentWindow.postMessage(data, origin);
    };
    previewFrame.contentWindow.postMessage(data, origin);
  }
}

export function addPostMessageEventMethod({
  previewURL,
  updatedFileContent,
  jsonFormInstance,
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
          initEOXJSONFormMethod(jsonFormInstance);
        }
      }
    }
    if (event.data && event.data.type === "ENABLE_LOADER_POSTMESSAGE")
      loaderInstance = loader.show();
    if (event.data && event.data.type === "DISABLE_LOADER_POSTMESSAGE")
      loaderInstance?.hide();
  });
}
