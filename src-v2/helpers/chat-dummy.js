// Introductory UI message; API test responses are logged only in the console.
export const getDummyMessages = () => [
  {
    id: "demo-intro",
    role: "assistant",
    showChanges: true,
    text: "Send a message to test the chat API. The response appears only in the browser console.",
  },
];

export const splitFilePath = (path = "") => {
  const index = path.lastIndexOf("/");
  return { dir: path.slice(0, index + 1), name: path.slice(index + 1) };
};
