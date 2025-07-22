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

export const GIT_CLERK_CONFIG = globalThis.gitClerkConfig || {};
export const CUSTOM_EDITOR_INTERFACES =
  globalThis.customEditorInterfaces ||
  GIT_CLERK_CONFIG.customEditorInterfaces ||
  {};
export const GENERATE_ENUMS =
  globalThis.generateEnums || GIT_CLERK_CONFIG.generateEnums;
export const BASE_PATH =
  globalThis.basePath || GIT_CLERK_CONFIG.basePath || "/";
export const SCHEMA_MAP =
  globalThis.schemaMap || GIT_CLERK_CONFIG.schemaMap || [];
export const AUTOMATION =
  globalThis.automation || GIT_CLERK_CONFIG.automation || [];
export const DEPLOYED_PREVIEW_LINK =
  globalThis.deployedPreviewLink ||
  GIT_CLERK_CONFIG.deployedPreviewLink ||
  (() => null);
export const DISABLE_MANUAL_FILE_CREATION =
  globalThis.disableManualFileCreation ||
  GIT_CLERK_CONFIG.disableManualFileCreation ||
  false;

export const DEFAULT_I18N = {
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en: {
      buttonText: {
        automation: "Automation",
      },
    },
    de: {
      buttonText: {
        automation: "Automatisierung",
      },
    },
  },
};

export const I18N = globalThis.i18n || GIT_CLERK_CONFIG.i18n || {};
