export default function getTotalPages(linkHeader) {
  if (linkHeader) {
    const lastPageMatch = linkHeader.match(/&page=(\d+)>; rel="last"/);
    if (lastPageMatch) return parseInt(lastPageMatch[1], 10);
  }

  return 0;
}
