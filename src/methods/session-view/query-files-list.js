import { RequestError } from "octokit";
import { queryFile } from "@/helpers";

export default function queryFilesListMethod(fileLists, props) {
  if (fileLists instanceof RequestError) {
    props.snackbar.value = {
      text: fileLists.message,
      status: "error",
    };
    props.fileChangesList.value = [];
    props.totalPage.value = 0;
  } else {
    let files = [];
    fileLists.data.forEach((file) => files.push(queryFile(file)));

    props.fileChangesList.value = files;
    props.totalPage.value = fileLists.total;
  }
}
