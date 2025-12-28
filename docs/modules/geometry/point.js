export class Point {
  constructor(x=0, y=0) { this.x = x; this.y = y; }
}

// Returns 0, 1, or 2 intersection points of circles (c0,r0) and (c1,r1)
export function circleIntersections(c0, r0, c1, r1) {
  const dx = c1.x - c0.x, dy = c1.y - c0.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-12) return []; // coincident centers -> degenerate for our use
  // no intersection when d > r0 + r1 or d < |r0 - r1|
  if (d > r0 + r1 + 1e-12) return [];
  if (d < Math.abs(r0 - r1) - 1e-12) return [];
  // tangent will yield h ~ 0
  const a = (r0*r0 - r1*r1 + d*d) / (2*d);
  const h2 = r0*r0 - a*a;
  const h = h2 <= 0 ? 0 : Math.sqrt(h2);
  const x2 = c0.x + a * (dx/d);
  const y2 = c0.y + a * (dy/d);
  const rx = -dy * (h/d);
  const ry =  dx * (h/d);
  if (h === 0) {
    return [{ x: x2, y: y2 }];
  }
  return [
    { x: x2 + rx, y: y2 + ry },
    { x: x2 - rx, y: y2 - ry },
  ];
}

export function angleBetween(v0x, v0y, v1x, v1y) {
  const dot = v0x*v1x + v0y*v1y;
  const m0 = Math.hypot(v0x, v0y);
  const m1 = Math.hypot(v1x, v1y);
  if (m0 < 1e-12 || m1 < 1e-12) return 0;
  const c = Math.min(1, Math.max(-1, dot/(m0*m1)));
  return Math.acos(c);
}
