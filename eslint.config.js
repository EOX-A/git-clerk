import eox from "@eox/eslint-config";
import pluginVue from "eslint-plugin-vue";

export default [
  ...eox,
  ...pluginVue.configs["flat/recommended"],
  {
    ignores: ["public/", "dist/"],
  },
  {
    files: ["src/**/*.vue"],
    rules: {
      "vue/no-deprecated-html-element-is": "warn",
      "vue/multi-word-component-names": "off",
      "vue/no-deprecated-slot-attribute": ["error"],
    },
  },
];
