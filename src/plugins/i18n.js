import { createI18n } from "vue-i18n";
import merge from "lodash/merge";
import { DEFAULT_I18N, I18N } from "@/enums";

const getDefaultLocale = () => {
  const locale = navigator.language || navigator.userLanguage || "en-US";
  return locale.split("-")[0];
};

DEFAULT_I18N.locale = getDefaultLocale();
const finalI18n = merge(DEFAULT_I18N, I18N);
const i18n = createI18n(finalI18n);

export default i18n;
