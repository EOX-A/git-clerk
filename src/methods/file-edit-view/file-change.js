import { decodeString, updateSchemaDefaults } from "@/helpers/index.js";
import isEqual from "lodash.isequal";
import { hideHiddenFieldsMethod } from "@/methods/file-edit-view/init-eox-jsonform.js";

export function jsonSchemaFileChangeMethod({
  fileContent,
  detail,
  updatedFileContent,
  debouncedPostMessage,
  jsonFormInstance,
  updateNavButtonConfig,
}) {
  const message = {
    type: "SCHEMA_DATA_EDITOR_UPDATE",
    detail: detail,
  };

  if (!updatedFileContent.value) {
    updatedFileContent.value = fileContent.value;
    debouncedPostMessage(message, "*", true);
  } else if (!isEqual(updatedFileContent.value, detail)) {
    updatedFileContent.value = detail;
    debouncedPostMessage(message, "*");
    updateNavButtonConfig("Save", false);
  } else updateNavButtonConfig();

  if (isEqual(updatedFileContent.value, fileContent.value))
    updateNavButtonConfig();

  hideHiddenFieldsMethod(jsonFormInstance);
}

export function genericFileChangeMethod({
  updatedFileContent,
  file,
  detail,
  updateNavButtonConfig,
}) {
  if (detail.file === decodeString(file.value.content)) {
    updateNavButtonConfig();
  } else {
    updateNavButtonConfig("Save", false);
  }
  updatedFileContent.value = detail.file;
}
