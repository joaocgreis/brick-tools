import { Point, circleIntersections, angleBetween } from "../modules/geometry/point.js";

function chunkAddRows(rows) {
  postMessage({ type: "rows", payload: rows });
}

self.onmessage = (ev) => {
  const { aMax, bMax, half } = ev.data;
  const step = half ? 0.5 : 1;
  const origin = new Point(0,0);
  let batch = [];
  for (let tx = 0; tx <= aMax + bMax; tx += step) {
    for (let ty = 0; ty <= tx; ty += step) {
      const T = new Point(tx, ty);
      for (let al = 1; al <= aMax; al += step) {
        for (let bl = 1; bl <= bMax; bl += step) {
          const inters = circleIntersections(origin, al, T, bl);
          if (!inters.length) continue;
          for (const I of inters) {
            const angleA = Math.atan2(I.y, I.x);
            const angleBLine = Math.atan2(T.y - I.y, T.x - I.x);
            const minAngle = angleBetween(I.x, I.y, T.x - I.x, T.y - I.y);
            const aLenInt = Math.floor(al);
            for (let s = 1; s <= aLenInt; s += 1) {
              const Sx = I.x * (s / al);
              const Sy = I.y * (s / al);
              batch.push({
                Sx: Number(Sx.toFixed(3)),
                Sy: Number(Sy.toFixed(3)),
                S: s,
                Al: Number(al.toFixed(1)),
                Bl: Number(bl.toFixed(1)),
                Tx: Number(tx.toFixed(1)),
                Ty: Number(ty.toFixed(1)),
                Ix: Number(I.x.toFixed(3)),
                Iy: Number(I.y.toFixed(3)),
                AngA: Number((angleA * 180 / Math.PI).toFixed(2)),
                AngB: Number((angleBLine * 180 / Math.PI).toFixed(2)),
                AngMin: Number((minAngle * 180 / Math.PI).toFixed(2)),
              });
              if (batch.length >= 2000) { chunkAddRows(batch); batch = []; }
            }
          }
        }
      }
    }
  }
  if (batch.length) chunkAddRows(batch);
  postMessage({ type: "done" });
};
