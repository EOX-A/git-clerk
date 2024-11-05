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

export function initEOXJSONFormMethod(jsonFormInstance, isFormJSON) {
  if (isFormJSON.value) {
    jsonFormInstance.value = document.querySelector("eox-jsonform");

    const shadowRoot = getShadowRoot(jsonFormInstance);
    const style = document.createElement("style");

    setTimeout(() => {
      const expandButtons = [
        ...shadowRoot.querySelectorAll(
          ".row:not([style*='display: none']) .je-header .json-editor-btn-collapse.json-editor-btntype-toggle span",
        ),
      ].filter((span) => span.innerText === "Expand");

      expandButtons.forEach((expandButtonEle) => {
        const thirdParentEle =
          expandButtonEle?.parentElement?.parentElement?.parentElement;

        if (thirdParentEle) {
          const displayNoneItems = thirdParentEle.querySelectorAll(
            '.je-indented-panel[style*="display: none"]',
          );

          if (displayNoneItems.length) expandButtonEle.click();
        }
      });
    }, 500);

    style.textContent = `
      .je-indented-panel .row {
        margin-top: 10px;
        padding: 10px;
      }
      .je-indented-panel > div > div:not(.je-child-editor-holder):not(.je-child-editor-holder *) {
        display: grid;
        grid-template-columns: 1fr 1fr; /* Two equal columns */
        gap: 20px 50px;
      }
      form[data-theme="html"] .je-indented-panel {
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .je-indented-panel .row {
        padding: 0 !important;
      }
      input[type="text"], input[type="url"], input[type="email"], input[type="password"], input[type="text"], input[type="number"], input[type="search"], input[type="tel"], select {
        padding: 10px !important;
        font-size: 16px;
        border: 1.5px solid #E0E4E6 !important;
      }
      .EasyMDEContainer {
        margin: 8px 0px;
      }
      .errmsg {
        font-weight: 600;
      }
      .editor-statusbar {
        display: none;
      }
    `;

    shadowRoot.appendChild(style);
  }
}
