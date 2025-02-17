function getShadowRoot(jsonFormInstance) {
  return (
    jsonFormInstance.value.shadowRoot ||
    jsonFormInstance.value.attachShadow({ mode: "open" })
  );
}

export function hideHiddenFieldsMethod(jsonFormInstance) {
  const shadowRoot = getShadowRoot(jsonFormInstance);

  const checkForElements = () => {
    const elements = shadowRoot.querySelectorAll(".je-indented-panel .row");
    if (elements.length > 0) {
      elements.forEach((element) => {
        if (
          element.querySelector("[data-schematype]")?.style.display === "none"
        ) {
          element.style.display = "none";
        }
      });
      clearInterval(intervalId);
    }
  };

  const intervalId = setInterval(checkForElements, 100);
}

export function initEOXJSONFormMethod(jsonFormInstance) {
  jsonFormInstance.value = document.querySelector("eox-jsonform");
}
