import eox from "@eox/eslint-config";

export default [
  ...eox,
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
