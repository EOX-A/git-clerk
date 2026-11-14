export const FILE_STATUS = {
  added: {
    label: "Added",
    letter: "A",
    color: "text-add-fg",
    icon: "file-plus",
  },
  removed: {
    label: "Deleted",
    letter: "D",
    color: "text-del-fg",
    icon: "file-minus",
  },
  modified: {
    label: "Modified",
    letter: "M",
    color: "text-warn",
    icon: "file-diff",
  },
  renamed: {
    label: "Renamed",
    letter: "R",
    color: "text-primary",
    icon: "file-diff",
  },
  copied: {
    label: "Copied",
    letter: "C",
    color: "text-add-fg",
    icon: "file-plus",
  },
  changed: {
    label: "Changed",
    letter: "M",
    color: "text-warn",
    icon: "file-diff",
  },
  unchanged: {
    label: "Unchanged",
    letter: "",
    color: "text-muted",
    icon: "file",
  },
};

export function fileName(path) {
  return path.split("/").pop();
}
export function fileDirectory(path) {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
}
export function fileTab(path) {
  return { id: path, path };
}
export function changedFileTabs(files) {
  return files.map((file) => fileTab(file.path));
}
export function closeFileTab(tabs, activeID, id) {
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index < 0) return { tabs, activeID };
  const remaining = tabs.filter((tab) => tab.id !== id);
  return {
    tabs: remaining,
    activeID:
      activeID === id
        ? remaining[Math.min(index, remaining.length - 1)]?.id || null
        : activeID,
  };
}
