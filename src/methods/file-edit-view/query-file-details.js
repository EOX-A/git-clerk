import { RequestError } from "octokit";
import { decodeString } from "@/helpers/index.js";

const getFileContent = (content, props) => {
  try {
    const schema = JSON.parse(content);
    return schema;
  } catch (error) {
    return {};
  }
};

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
    const content = decodeString(fileDetails.content);
    props.isSchemaBased.value = props.schemaMetaDetails.value.generic
      ? false
      : true;

    props.fileContent.value = props.isSchemaBased.value
      ? props.schemaMetaDetails.value.output
        ? { [props.schemaMetaDetails.value.output]: content }
        : getFileContent(content)
      : {
          file: content,
        };

    props.previewURL.value = props.schemaMetaDetails.value.preview || null;

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
