import { useLoading } from "vue-loading-overlay";
export default function useLoader() {
  return useLoading({
    color: "#002742",
    loader: "dots",
    width: 50,
    height: 50,
    backgroundColor: "#002742",
    opacity: 0.5,
    zIndex: 999999,
  });
}
