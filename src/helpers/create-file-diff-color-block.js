export default function createColorBlocks(additions, deletions, changes) {
  const totalBlocks = 5;

  const additionBlocks = Math.floor((additions / changes) * totalBlocks);
  const deletionBlocks = Math.floor((deletions / changes) * totalBlocks);

  let remainingBlocks = totalBlocks - additionBlocks - deletionBlocks;
  let blocks = [];

  for (let i = 0; i < additionBlocks; i++) {
    blocks.push("green");
  }

  for (let i = 0; i < deletionBlocks; i++) {
    blocks.push("red");
  }

  while (remainingBlocks > 0) {
    blocks.push("grey");
    remainingBlocks--;
  }

  while (blocks.length < totalBlocks) {
    blocks.push("grey");
  }

  return blocks;
}
