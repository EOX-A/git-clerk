// Sample conversation only. Never imply that the demo has changed a repository.
export const getDummyMessages = () => [
  {
    id: "demo-intro",
    role: "assistant",
    showChanges: true,
    text: "Try the chat here. Replies are examples only; sending a message won’t change your files or branch.",
  },
];

export const splitFilePath = (path = "") => {
  const index = path.lastIndexOf("/");
  return { dir: path.slice(0, index + 1), name: path.slice(index + 1) };
};
