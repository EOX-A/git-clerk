import { RequestError } from "octokit";
import { isValidFormJSON } from "@/helpers/index.js";

export default function queryFileDetailsMethod(fileDetails, props) {
  if (fileDetails instanceof RequestError) {
    props.snackbar.value = {
      text: fileDetails.message,
      status: "error",
    };
    props.navPaginationItems.value = [
      props.navPaginationItems.value[0],
      {
        ...props.navPaginationItems.value[1],
        disabled: false,
      },
    ];
  } else {
    props.file.value = fileDetails;
    props.fileContent.value = atob(fileDetails.content);
    props.isFormJSON.value = isValidFormJSON(props.fileContent.value);
    props.navPaginationItems.value = [
      props.navPaginationItems.value[0],
      {
        ...props.navPaginationItems.value[1],
        disabled: false,
      },
      {
        title: fileDetails.path,
        disabled: true,
      },
    ];
  }
}
