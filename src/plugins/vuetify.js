import "vuetify/styles";
import "@eox/ui/vuetify/style.css";
import { eox } from "@eox/ui/vuetify/blueprint.js";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const vuetify = createVuetify({
  components,
  directives,
  blueprint: eox,
});

export default vuetify;
