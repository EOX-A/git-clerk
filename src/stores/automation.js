import { defineStore } from "pinia";
import { ref } from "vue";

const useAutomationStore = defineStore("automation", () => {
  const automation = ref(false);
  const externalAutomationData = ref({});
  const selectedAutomation = ref(null);
  const automationDialog = ref(false);

  function setExternalAutomation(data) {
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;
    if (parsedData.automation) {
      externalAutomationData.value = parsedData;
      automation.value = true;
    }
  }

  function resetExternalAutomation() {
    automation.value = false;
    externalAutomationData.value = {};
  }

  function handleAutomationClick(automation) {
    selectedAutomation.value = automation;
    automationDialog.value = true;
  }

  function handleAutomationClose() {
    selectedAutomation.value = null;
    automationDialog.value = false;
  }

  return {
    automation,
    externalAutomationData,
    selectedAutomation,
    automationDialog,
    setExternalAutomation,
    handleAutomationClick,
    handleAutomationClose,
    resetExternalAutomation,
  };
});

export default useAutomationStore;
