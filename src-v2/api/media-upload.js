import { brokerAuthor } from "./git-broker.js";
import { getMediaUploadConfig } from "../helpers/chat-config.js";

// Maps uploaded remote URLs (e.g. raw.githubusercontent.com) to instant local
// preview URLs (blob: or /api/git/raw) so previews render with zero CDN delay.
export const mediaPreviewUrls = new Map();

export function registerMediaPreview(url, previewUrl) {
  if (url && previewUrl) mediaPreviewUrls.set(url, previewUrl);
}

export function getMediaPreviewMap() {
  return Object.fromEntries(mediaPreviewUrls);
}

export function sanitizeMediaFilename(filename, suffix) {
  const raw = String(filename || "file")
    .split(/[/\\]/)
    .pop();
  const dotIndex = raw.lastIndexOf(".");
  const hasExt = dotIndex > 0 && dotIndex < raw.length - 1;
  const rawStem = hasExt ? raw.slice(0, dotIndex) : raw;
  const rawExt = hasExt ? raw.slice(dotIndex + 1) : "";
  const stem =
    rawStem
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "file";
  const ext = rawExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);
  const unique = suffix || crypto.randomUUID().slice(0, 8);
  return ext ? `${stem}-${unique}.${ext}` : `${stem}-${unique}`;
}

export function buildMediaPath(directory, uploadedName) {
  const dir = String(directory ?? "").replace(/^\/+|\/+$/g, "");
  return dir ? `${dir}/${uploadedName}` : uploadedName;
}

export async function blobToBase64(blob) {
  if (typeof blob?.base64Content === "string") {
    return blob.base64Content.replace(/^data:[^;]+;base64,/, "");
  }
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x4000; // 16 KiB chunks prevent call stack overflow
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function formatSizeMb(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

export function validateMediaFiles(files, config = getMediaUploadConfig()) {
  if (!Array.isArray(files) || !files.length) return;
  if (files.length > config.maxFiles) {
    throw new Error(`Attach at most ${config.maxFiles} files at a time.`);
  }
  for (const file of files) {
    const size = Number(file?.size ?? 0);
    if (size > config.maxFileSize) {
      throw new Error(
        `"${file?.name || "File"}" exceeds the ${formatSizeMb(config.maxFileSize)} size limit.`,
      );
    }
  }
}

function buildBrokerRawUrl(context, path, ref) {
  const baseUrl = context?.config?.baseUrl;
  if (!baseUrl) return null;
  const params = new URLSearchParams({ path });
  if (ref) params.set("ref", ref);
  const repo = context.repository?.repo || context.config?.repo;
  const provider = context.repository?.provider || context.config?.provider;
  if (repo) params.set("repo", repo);
  if (provider) params.set("provider", provider);
  return `${baseUrl}/api/git/raw?${params.toString()}`;
}

function createLocalPreviewUrl(file) {
  if (
    typeof Blob !== "undefined" &&
    file instanceof Blob &&
    typeof URL?.createObjectURL === "function"
  ) {
    return URL.createObjectURL(file);
  }
  return null;
}

export async function uploadMediaToBucket(/* files, context, config */) {
  // TODO: Wire EOxHub generic bucket upload endpoint (presigned PUT / multipart POST)
  // once the bucket API contract is finalized:
  //   1. Request presigned upload URL(s) or POST multipart form data to config.bucket.endpointUrl.
  //   2. Return normalized descriptors { name, uploadedName, path, url, previewUrl, mediaType, size }.
  throw Object.assign(
    new Error(
      "Bucket media upload is not configured yet. Set mediaUpload.target to 'repo' or provide mediaUpload.customUpload.",
    ),
    { status: 400, code: "MEDIA_BUCKET_NOT_CONFIGURED" },
  );
}

function normalizeCustomDescriptor(item, originalFile) {
  const name = item?.name || originalFile?.name || "file";
  const url = item?.url || "";
  const previewUrl =
    item?.previewUrl || createLocalPreviewUrl(originalFile) || url;
  if (url && previewUrl) registerMediaPreview(url, previewUrl);
  return {
    name,
    uploadedName: item?.uploadedName || name,
    path: item?.path || name,
    url,
    previewUrl,
    brokerRawUrl: item?.brokerRawUrl || null,
    mediaType:
      item?.mediaType ||
      item?.media_type ||
      originalFile?.type ||
      "application/octet-stream",
    size: item?.size ?? originalFile?.size ?? 0,
    sha: item?.sha || null,
    commitSha: item?.commitSha || null,
  };
}

export async function uploadMediaFiles(
  files,
  { context, session, config = getMediaUploadConfig(), commitMessage } = {},
) {
  if (!files?.length) {
    return {
      target: config.target,
      commitSha: session?.headSha ?? null,
      branch: session?.branch ?? null,
      files: [],
    };
  }
  validateMediaFiles(files, config);

  if (
    config.target === "custom" ||
    (config.target !== "repo" && config.customUpload)
  ) {
    if (!config.customUpload) {
      throw new Error(
        "mediaUpload.customUpload function is required when mediaUpload.target is 'custom'.",
      );
    }
    const rawResults = await config.customUpload(files, {
      session,
      repository: context?.repository,
      user: context?.user,
    });
    const normalized = (Array.isArray(rawResults) ? rawResults : []).map(
      (item, index) => normalizeCustomDescriptor(item, files[index]),
    );
    return {
      target: "custom",
      commitSha: session?.headSha ?? null,
      branch: session?.branch ?? null,
      files: normalized,
    };
  }

  if (config.target === "bucket") {
    return uploadMediaToBucket(files, context, config);
  }

  if (!context?.request) {
    throw new Error("Connect to the Git broker before uploading files.");
  }
  if (!session?.branch) {
    throw new Error("A session branch is required before uploading files.");
  }

  const prepared = await Promise.all(
    files.map(async (file) => {
      const uploadedName = sanitizeMediaFilename(file.name);
      const path = buildMediaPath(config.path, uploadedName);
      const mediaType = file.type || "application/octet-stream";
      const contentBase64 = await blobToBase64(file);
      const previewUrl = createLocalPreviewUrl(file);
      return {
        originalName: file.name || uploadedName,
        uploadedName,
        path,
        mediaType,
        size: Number(file.size ?? 0),
        contentBase64,
        previewUrl,
      };
    }),
  );

  const result = await context.request("/upload", {
    method: "POST",
    branch: session.branch,
    body: {
      target_branch: session.branch,
      base_branch: session.baseBranch || context.repository?.default_branch,
      commit_message:
        commitMessage ||
        `chore(assets): upload ${prepared.length} media ${prepared.length === 1 ? "file" : "files"}`,
      url_template: config.urlTemplate ?? null,
      author: brokerAuthor(context),
      files: prepared.map((item) => ({
        path: item.path,
        content_base64: item.contentBase64,
        content_type: item.mediaType,
      })),
    },
  });

  const repo = result.repo || context.repository?.repo;
  const commitSha = result.commit_sha || session.headSha || "";
  const uploadedFiles = prepared.map((item, index) => {
    const remote =
      result.files?.find((entry) => entry.path === item.path) ||
      result.files?.[index] ||
      {};
    const path = remote.path || item.path;
    const url =
      remote.url ||
      remote.raw_url ||
      (repo && commitSha
        ? `https://raw.githubusercontent.com/${repo}/${commitSha}/${path}`
        : "");
    const brokerRawUrl = buildBrokerRawUrl(context, path, commitSha);
    const previewUrl = item.previewUrl || brokerRawUrl;
    registerMediaPreview(url, previewUrl || brokerRawUrl);
    return {
      name: item.originalName,
      uploadedName: remote.name || item.uploadedName,
      path,
      url,
      previewUrl,
      brokerRawUrl,
      mediaType: remote.content_type || item.mediaType,
      size: remote.size ?? item.size,
      sha: remote.sha || null,
      commitSha: commitSha || null,
    };
  });

  return {
    target: "repo",
    commitSha: commitSha || null,
    branch: result.branch || session.branch,
    files: uploadedFiles,
  };
}
