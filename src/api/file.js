import { getTotalPages, encodeString } from "@/helpers/index.js";
import { Base64 } from "js-base64";
import axios from "axios";

export async function filesListFromSession(
  octokit,
  githubConfig,
  prNumber,
  currPage,
  cache,
) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response = await octokit.rest.pulls.listFiles({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      pull_number: prNumber,
      per_page: 10,
      page: currPage,
      headers: {
        ...(cache ? {} : { "If-None-Match": "" }),
      },
    });

    const totalPages = getTotalPages(response.headers.link) || currPage;

    return {
      data: response.data,
      total: totalPages,
      curr: currPage,
      next: totalPages === currPage ? null : currPage + 1,
      prev: currPage > 1 ? currPage - 1 : null,
    };
  } catch (error) {
    return error;
  }
}

export async function deleteFile(
  octokit,
  githubConfig,
  owner,
  repo,
  path,
  message,
  sha,
  ref,
) {
  try {
    await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha,
      branch: ref,
    });

    return {
      text: `Successfully Deleted ${path}`,
      status: "success",
    };
  } catch (error) {
    return {
      text: error.message,
      status: "error",
    };
  }
}

export async function fileDetails(octokit, owner, repo, ref, filePath, cache) {
  try {
    if (!cache) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      ref,
      path: filePath,
      headers: {
        "If-None-Match": "",
      },
    });

    return data;
  } catch (error) {
    return {
      text: error.message,
      status: "error",
    };
  }
}

export async function branchFileStructure(
  octokit,
  githubConfig,
  owner,
  repo,
  ref,
  path,
) {
  const dirStructure = [];

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      ref,
      path,
    });

    for (const item of data) {
      dirStructure.push({
        ...item,
        icon: item.type === "dir" ? "folder" : "file",
      });
    }

    return dirStructure;
  } catch (error) {
    return [];
  }
}

export async function updateFile(
  octokit,
  githubConfig,
  owner,
  repo,
  ref,
  path,
  fileName,
  content,
  sha,
) {
  try {
    const base64Content =
      typeof content === "string"
        ? encodeString(content)
        : Base64.fromUint8Array(content.bytes);

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `chores: file updated - ${path}`,
      content: base64Content,
      branch: ref,
      ...(sha ? { sha } : {}),
    });

    return {
      text: `File updated: ${fileName}`,
      status: "success",
    };
  } catch (error) {
    return {
      text: error.message,
      status: "error",
    };
  }
}

export async function schemaFromURL(url) {
  try {
    const res = await axios.get(url);
    return res.data;
  } catch (error) {
    return {
      text: "Failed to fetch schema: Please manually add appropriate schema for the file.",
      status: "error",
    };
  }
}
