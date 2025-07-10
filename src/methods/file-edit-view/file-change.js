import { decodeString, updateSchemaDefaults } from "@/helpers/index.js";
import isEqual from "lodash.isequal";
import { CUSTOM_EDITOR_INTERFACES } from "@/enums";
let init = false;

export function jsonSchemaFileChangeMethod({
  fileContent,
  detail,
  updatedFileContent,
  debouncedPostMessage,
  customInterfaces,
  updateNavButtonConfig,
}) {
  const message = {
    type: "SCHEMA_DATA_EDITOR_UPDATE",
    detail: detail,
  };

  if (!updatedFileContent.value) {
    // Append key which is not present in the fileContent at beginning
    customInterfaces.value = Object.values(CUSTOM_EDITOR_INTERFACES);
    updatedFileContent.value = { ...fileContent.value };
    fileContent.value = updatedFileContent.value;
    init = true;
  } else if (!isEqual(updatedFileContent.value, detail)) {
    updatedFileContent.value = detail;
    updateNavButtonConfig("Save", false);
  } else {
    updateNavButtonConfig("Save", false);
  }

  if (isEqual(updatedFileContent.value, fileContent.value))
    updateNavButtonConfig();

  debouncedPostMessage(message, "*");
  init = false;
}
