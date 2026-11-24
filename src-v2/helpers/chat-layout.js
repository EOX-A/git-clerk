// Minimum sizes yield to the available space on short or narrow windows.
export const clampFloatingBounds = ({ x, y, w, h }, width, height) => {
  const maxW = Math.max(1, width - 16);
  const top = 8;
  const maxH = Math.max(1, height - top - 8);
  const nextW = Math.max(Math.min(320, maxW), Math.min(w, maxW));
  const nextH = Math.max(
    Math.min(360, Math.round(height * 0.6), maxH),
    Math.min(h, maxH),
  );
  return {
    x: Math.max(8, Math.min(x, width - nextW - 8)),
    y: Math.max(top, Math.min(y, height - nextH - 8)),
    w: nextW,
    h: nextH,
  };
};

export const initialFloatingBounds = (width, height) => {
  const w = 480;
  const h = Math.round(height * 0.6);
  return clampFloatingBounds(
    { x: width - w - 24, y: height - h - 24, w, h },
    width,
    height,
  );
};

export const clampDockedWidth = (width, containerWidth) =>
  Math.max(320, Math.min(width, containerWidth - 380));

export const resizeFloatingBounds = (
  bounds,
  direction,
  dx,
  dy,
  width,
  height,
) => {
  const next = { ...bounds };
  if (direction.includes("r")) next.w += dx;
  if (direction.includes("l")) next.w -= dx;
  if (direction.includes("b")) next.h += dy;
  if (direction.includes("t")) next.h -= dy;
  const size = clampFloatingBounds(next, width, height);
  if (direction.includes("l")) size.x = bounds.x + bounds.w - size.w;
  if (direction.includes("t")) size.y = bounds.y + bounds.h - size.h;
  return clampFloatingBounds(size, width, height);
};
