import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    themes: {
      light: {
        dark: false,
        colors: {
          primary: "#002742",
          secondary: "#EEF0F1",
          background: "#F7F8F8",
          "btn-primary": "#D6EEFF"
        },
      },
    },
  },
});

export default vuetify;
