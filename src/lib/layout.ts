// One source for the space left by navigation and safe areas. Screen grids must
// use this width rather than the full device width on iPad and desktop.
export function appLayout(windowWidth: number, fontScale = 1, left = 0, right = 0) {
  const available = Math.max(0, windowWidth - left - right);
  const regular = available >= 1000 && available / fontScale >= 760;
  const padding = regular ? 36 : available < 360 ? 16 : 20;
  return { regular, padding, contentWidth: Math.min(1120, Math.max(0, available - (regular ? 244 : 0) - 2 * padding)) };
}

export function gridItemStyle(width: number, fontScale = 1, gap = 18, minimumWidth = 280) {
  const columns = Math.max(1, Math.min(3, Math.floor((width + gap) / (minimumWidth * Math.max(1, fontScale) + gap))));
  return { width: columns === 1 ? '100%' as const : Math.floor((width - gap * (columns - 1)) / columns * 100) / 100 };
}
