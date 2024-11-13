import { decodeString, updateSchemaDefaults } from "@/helpers/index.js";
import isEqual from "lodash.isequal";
import { hideHiddenFieldsMethod } from "@/methods/file-edit-view/init-eox-jsonform.js";

export function jsonSchemaFileChangeMethod({
  fileContent,
  detail,
  updatedFileContent,
  initValue,
  debouncedPostMessage,
  jsonFormInstance,
  updateNavButtonConfig,
}) {
  const newSchema = updateSchemaDefaults(JSON.parse(fileContent.value), detail);

  const message = {
    type: "SCHEMA_DATA_EDITOR_UPDATE",
    detail: detail,
  };

  if (!updatedFileContent.value) {
    initValue.value = detail;
    updatedFileContent.value = newSchema;
    fileContent.value = JSON.stringify(newSchema);
    debouncedPostMessage(message, window.location.origin, true);
  } else if (!isEqual(updatedFileContent.value, newSchema)) {
    updatedFileContent.value = newSchema;
    debouncedPostMessage(message, window.location.origin);

    updateNavButtonConfig("Save", false);
  } else updateNavButtonConfig();

  if (isEqual(updatedFileContent.value, JSON.parse(fileContent.value)))
    updateNavButtonConfig();

  hideHiddenFieldsMethod(jsonFormInstance);
}

export function genericFileChangeMethod({
  updatedFileContent,
  initValue,
  fileContent,
  file,
  detail,
  updateNavButtonConfig,
}) {
  if (updatedFileContent.value === null) {
    initValue.value = detail;
    fileContent.value = detail.file;
  }
  if (e.detail.file === decodeString(file.value.content)) {
    updateNavButtonConfig();
  } else {
    updateNavButtonConfig("Save", false);
  }
  updatedFileContent.value = detail.file;
}
