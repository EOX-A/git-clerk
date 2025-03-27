import { decodeString, updateSchemaDefaults } from "@/helpers/index.js";
import isEqual from "lodash.isequal";
import { CUSTOM_EDITOR_INTERFACES } from "@/enums";
let init = false;

export function jsonSchemaFileChangeMethod({
  fileContent,
  detail,
  updatedFileContent,
  debouncedPostMessage,
  jsonFormInstance,
  customInterfaces,
  updateNavButtonConfig,
}) {
  const message = {
    type: "SCHEMA_DATA_EDITOR_UPDATE",
    detail: detail,
  };

  if (!updatedFileContent.value) {
    // Append key which is not present in the fileContent at beginning
    updatedFileContent.value = { ...detail, ...fileContent.value };
    fileContent.value = updatedFileContent.value;
    jsonFormInstance.value.editor.setValue(updatedFileContent.value);
    customInterfaces.value = Object.values(CUSTOM_EDITOR_INTERFACES);
    init = true;
  } else if (!isEqual(updatedFileContent.value, detail)) {
    updatedFileContent.value = detail;
    updateNavButtonConfig("Save", false);
  } else {
    updateNavButtonConfig("Save", false);
  }

  if (isEqual(updatedFileContent.value, fileContent.value))
    updateNavButtonConfig();

  if (jsonFormInstance.value.editor.validate().length > 0)
    updateNavButtonConfig("Save", true);

  debouncedPostMessage(message, "*");
  init = false;
}
