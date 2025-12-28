export function fmt(n, places=3) {
  return Number(n).toFixed(places);
}
export function deg(rad) { return rad * 180 / Math.PI; }
export const EPS = 1e-9;

export function colorForOverfit(dist, center) {
  const delta = dist - center;
  if (delta <= 0.05) return "text-green";
  if (delta <= 0.10) return "text-orange";
  return "text-red";
}
