import "vuetify/styles";
import { eox } from "@eox/ui/vuetify/blueprint.js";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const vuetify = createVuetify({
  components,
  directives,
  blueprint: eox,
  theme: {
    themes: {
      light: {
        dark: false,
        colors: {
          grey: "#8A969E",
          violet: "#6F42C1",
        },
      },
    },
  },
});

export default vuetify;
