"use client";

/**
 * Classic interlocking 3×3 jigsaw paths in a 300×300 viewBox.
 * Tabs/notches connect so pieces visually fit together.
 */
export function jigsawPath(index: number): string {
  // Each cell is 100×100. Tabs are ±15 outward on edges that connect.
  const row = Math.floor(index / 3);
  const col = index % 3;
  const x0 = col * 100;
  const y0 = row * 100;
  const x1 = x0 + 100;
  const y1 = y0 + 100;
  const tab = 18;

  // Edge helpers for interlocking tabs/notches
  // Connections: right edge of (r,c) tabs into left of (r,c+1)
  // Bottom of (r,c) tabs into top of (r+1,c)
  // Convention: even cols have right TAB out; odd have right NOTCH (in)
  // even rows have bottom TAB out; odd have bottom NOTCH

  const rightTab = col < 2 && col % 2 === 0;
  const leftNotch = col > 0 && (col - 1) % 2 === 0; // mates with previous right tab
  const bottomTab = row < 2 && row % 2 === 0;
  const topNotch = row > 0 && (row - 1) % 2 === 0;

  const midX = x0 + 50;
  const midY = y0 + 50;

  let d = `M ${x0} ${y0}`;

  // TOP edge
  if (topNotch) {
    d += ` L ${midX - 20} ${y0}`;
    d += ` C ${midX - 20} ${y0 + tab} ${midX - tab} ${y0 + tab} ${midX} ${y0 + tab}`;
    d += ` C ${midX + tab} ${y0 + tab} ${midX + 20} ${y0 + tab} ${midX + 20} ${y0}`;
    d += ` L ${x1} ${y0}`;
  } else {
    d += ` L ${x1} ${y0}`;
  }

  // RIGHT edge
  if (rightTab) {
    d += ` L ${x1} ${midY - 20}`;
    d += ` C ${x1 + tab} ${midY - 20} ${x1 + tab} ${midY - tab} ${x1 + tab} ${midY}`;
    d += ` C ${x1 + tab} ${midY + tab} ${x1 + tab} ${midY + 20} ${x1} ${midY + 20}`;
    d += ` L ${x1} ${y1}`;
  } else if (col < 2) {
    // notch for neighbor's tab
    d += ` L ${x1} ${midY - 20}`;
    d += ` C ${x1 - tab} ${midY - 20} ${x1 - tab} ${midY - tab} ${x1 - tab} ${midY}`;
    d += ` C ${x1 - tab} ${midY + tab} ${x1 - tab} ${midY + 20} ${x1} ${midY + 20}`;
    d += ` L ${x1} ${y1}`;
  } else {
    d += ` L ${x1} ${y1}`;
  }

  // BOTTOM edge
  if (bottomTab) {
    d += ` L ${midX + 20} ${y1}`;
    d += ` C ${midX + 20} ${y1 + tab} ${midX + tab} ${y1 + tab} ${midX} ${y1 + tab}`;
    d += ` C ${midX - tab} ${y1 + tab} ${midX - 20} ${y1 + tab} ${midX - 20} ${y1}`;
    d += ` L ${x0} ${y1}`;
  } else if (row < 2) {
    d += ` L ${midX + 20} ${y1}`;
    d += ` C ${midX + 20} ${y1 - tab} ${midX + tab} ${y1 - tab} ${midX} ${y1 - tab}`;
    d += ` C ${midX - tab} ${y1 - tab} ${midX - 20} ${y1 - tab} ${midX - 20} ${y1}`;
    d += ` L ${x0} ${y1}`;
  } else {
    d += ` L ${x0} ${y1}`;
  }

  // LEFT edge
  if (leftNotch) {
    d += ` L ${x0} ${midY + 20}`;
    d += ` C ${x0 + tab} ${midY + 20} ${x0 + tab} ${midY + tab} ${x0 + tab} ${midY}`;
    d += ` C ${x0 + tab} ${midY - tab} ${x0 + tab} ${midY - 20} ${x0} ${midY - 20}`;
    d += ` L ${x0} ${y0}`;
  } else if (col > 0) {
    d += ` L ${x0} ${midY + 20}`;
    d += ` C ${x0 - tab} ${midY + 20} ${x0 - tab} ${midY + tab} ${x0 - tab} ${midY}`;
    d += ` C ${x0 - tab} ${midY - tab} ${x0 - tab} ${midY - 20} ${x0} ${midY - 20}`;
    d += ` L ${x0} ${y0}`;
  } else {
    d += ` L ${x0} ${y0}`;
  }

  d += " Z";
  return d;
}
