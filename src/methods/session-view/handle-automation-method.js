import { runAutomation, useLoader } from "@/helpers";
import { h } from "vue";

export default async function handleAutomationMethod(
  props,
  value,
  validate,
  snackbar,
) {
  if (validate.length) {
    snackbar.value = {
      text: "Please fill in all the required fields correctly",
      status: "error",
    };
  } else {
    const loader = useLoader().show(
      {},
      {
        after: h("h5", { class: "loader-text", id: "loader-text" }, ""),
      },
    );
    try {
      await runAutomation(props, value);
      loader.hide();
      props.handleAutomationClose();
      props.updateDetails();
    } catch (error) {
      loader.hide();
      snackbar.value = {
        text: error.message,
        status: "error",
      };
    }
  }
}
