export const CHECK_STATUS = {
  success: {
    tooltip: "Validation Successful",
    icon: "mdi-check-bold",
    color: "green",
    status: "success",
    success: true,
  },
  failed: {
    tooltip: "Validation Failed",
    icon: "mdi-alert-outline",
    color: "red-accent-4",
    status: "failure",
    success: false,
  },
};

export const CUSTOM_EDITOR_INTERFACES = globalThis.customEditorInterfaces || {};
export const GENERATE_ENUMS = globalThis.generateEnums;
export const BASE_PATH = globalThis.basePath || "/";
