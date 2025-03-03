function getShadowRoot(jsonFormInstance) {
  return (
    jsonFormInstance.value.shadowRoot ||
    jsonFormInstance.value.attachShadow({ mode: "open" })
  );
}

export function initEOXJSONFormMethod(jsonFormInstance) {
  jsonFormInstance.value = document.querySelector("eox-jsonform");
}
