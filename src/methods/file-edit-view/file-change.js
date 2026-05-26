import isEqual from "lodash.isequal";
import { CUSTOM_EDITOR_INTERFACES } from "@/enums";

/**
 *
 * @param root0
 * @param root0.fileContent
 * @param root0.detail
 * @param root0.updatedFileContent
 * @param root0.debouncedPostMessage
 * @param root0.customInterfaces
 * @param root0.updateNavButtonConfig
 */
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
  } else if (!isEqual(updatedFileContent.value, detail)) {
    updatedFileContent.value = detail;
    updateNavButtonConfig("Save", false);
  } else {
    updateNavButtonConfig("Save", false);
  }

  if (isEqual(updatedFileContent.value, fileContent.value))
    updateNavButtonConfig();

  debouncedPostMessage(message, "*");
}
