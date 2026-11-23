import "./assets/main.css";

import app, { luigiReady } from "./app.js";

luigiReady.then(() => app.mount("#app"));
