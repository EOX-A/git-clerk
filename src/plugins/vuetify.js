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
          grey: "#8A969E",
          violet: "#6F42C1",
          "btn-primary": "#D6EEFF",
          "light-secondary": "#CCD9E2",
        },
      },
    },
  },
});

export default vuetify;
