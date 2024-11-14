function getShadowRoot(jsonFormInstance) {
  return (
    jsonFormInstance.value?.shadowRoot ||
    jsonFormInstance.value?.attachShadow({ mode: "open" })
  );
}

export function hideHiddenFieldsMethod(jsonFormInstance) {
  const shadowRoot = getShadowRoot(jsonFormInstance);
  if (!shadowRoot) return;

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

export function initEOXJSONFormMethod(
  jsonFormInstance,
  isSchemaBased,
  previewURL,
) {
  jsonFormInstance.value = document.querySelector("eox-jsonform");
  const shadowRoot = getShadowRoot(jsonFormInstance);
  if (!shadowRoot) return;

  const mainDivClass =
    ".je-indented-panel > div > div:not(.je-child-editor-holder):not(.je-child-editor-holder *)";

  const style = document.createElement("style");

  setTimeout(() => {
    const expandButtons = [
      ...shadowRoot.querySelectorAll(
        ".row:not([style*='display: none']) .je-header .json-editor-btn-collapse.json-editor-btntype-toggle span",
      ),
    ].filter((span) => span.innerText === "Expand");

    const editorValue = jsonFormInstance.value.value;
    if (
      editorValue &&
      Object.keys(editorValue).length === 1 &&
      previewURL.value
    ) {
      shadowRoot.querySelector(mainDivClass).style.display = "block";
      shadowRoot.querySelector(`${mainDivClass} .row`).style.marginTop = "0px";

      const bodyWrapperSelector = `${mainDivClass} .row .EasyMDEContainer`;
      shadowRoot.querySelector(bodyWrapperSelector).style.margin = "0px";

      const bodySelector = `${mainDivClass} .row .EasyMDEContainer .CodeMirror`;
      shadowRoot.querySelector(bodySelector).style.height =
        "calc(100vh - 194px)";
      shadowRoot.querySelector(bodySelector).style.borderRadius = "0px";
      shadowRoot.querySelector(bodySelector).style.backgroundColor = "#fafafa";

      const toolbarSelector = `${mainDivClass} .row .EasyMDEContainer .editor-toolbar`;
      shadowRoot.querySelector(toolbarSelector).style.borderRadius = "0px";
      shadowRoot.querySelector(toolbarSelector).style.backgroundColor =
        "#EEF0F1";
    }

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
    ${
      isSchemaBased.value
        ? `
          ${mainDivClass} {
            display: grid;
            grid-template-columns: 1fr 1fr; /* Two equal columns */
            gap: 20px 50px;
          }
          .je-indented-panel .row {
            margin-top: 10px;
            padding: 10px;
          }
        `
        : ``
    }
    .je-object__controls,
    .je-form-input-label {
      display: none !important;
    }
    .je-textarea {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.5;
      padding: 12px;
      tab-size: 2;
      background-color: #ffffff;
      color: #000000;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      width: 100%;
      height: calc(100vh - 240px) !important;
      resize: vertical;
      white-space: pre;
      overflow-wrap: normal;
      overflow-x: auto;
      resize: none;
    }
    .je-textarea:focus {
      outline: none;
    }
    .je-textarea {
      background-image: linear-gradient(to right, #f5f5f5 30px, #ffffff 30px);
      background-size: 100% 24px;
      background-repeat: repeat-y;
      padding-left: 45px;
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
