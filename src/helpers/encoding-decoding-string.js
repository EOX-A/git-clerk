import { Base64 } from "js-base64";

const encodeString = (value) => Base64.encode(value);
const decodeString = (key) => Base64.decode(key);

export { encodeString, decodeString };
