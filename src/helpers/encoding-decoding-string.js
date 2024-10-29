const encodeString = (value) => btoa(value);
const decodeString = (key) => atob(key);

export { encodeString, decodeString };
