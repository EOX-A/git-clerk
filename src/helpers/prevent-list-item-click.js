export default function preventListItemClick(event) {
  if (event.target.closest(".action-list")) {
    event.preventDefault();
  }
}
