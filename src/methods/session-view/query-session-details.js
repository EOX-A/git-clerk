import { RequestError } from "octokit";
import { querySession } from "@/helpers";

export default function querySessionDetailsMethod(sessionDetails, props) {
  if (sessionDetails instanceof RequestError) {
    props.snackbar.value = {
      text: sessionDetails.message,
      status: "error",
    };
    props.navPaginationItems.value = [props.navPaginationItems.value[0]];
  } else {
    props.session.value = querySession(sessionDetails);
    props.navPaginationItems.value = [
      props.navPaginationItems.value[0],
      {
        title: props.session.value.title,
        disabled: true,
        to: { path: `/${props.session.value.number}` },
      },
    ];
  }
}
