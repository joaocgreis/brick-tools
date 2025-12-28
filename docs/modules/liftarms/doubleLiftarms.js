import { fmt, deg } from "../util/format.js";
import { Point, circleIntersections, angleBetween } from "../geometry/point.js";

function buildControls()
{
  const host = document.getElementById("liftarms-controls");
  host.innerHTML = `
  <div class="form-row">
    <label>A max length (studs)
      <input id="al-max" type="number" min="1" step="0.5" value="5">
    </label>
    <label>B max length (studs)
      <input id="bl-max" type="number" min="1" step="0.5" value="5">
    </label>
    <label>Consider half studs
      <select id="half-studs">
        <option value="false" selected>No</option>
        <option value="true">Yes</option>
      </select>
    </label>
    <label>Presets
      <select id="preset">
        <option value="none" selected>None</option>
        <option value="hypotenuses">Hypotenuses</option>
        <option value="catheti">Catheti</option>
        <option value="right">90 degrees</option>
      </select>
    </label>
    <button class="primary" id="run">Run</button>
  </div>`;
}

function enumerate({aMax, bMax, half}) {
  const step = half ? 0.5 : 1;
  const rows = [];
  const origin = new Point(0,0);
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
              rows.push({
                Sx: Number(Sx.toFixed(3)),
                Sy: Number(Sy.toFixed(3)),
                S: s,
                Al: Number(al.toFixed(1)),
                Bl: Number(bl.toFixed(1)),
                Tx: Number(tx.toFixed(1)),
                Ty: Number(ty.toFixed(1)),
                Ix: Number(I.x.toFixed(3)),
                Iy: Number(I.y.toFixed(3)),
                AngA: Number(deg(angleA).toFixed(2)),
                AngB: Number(deg(angleBLine).toFixed(2)),
                AngMin: Number(deg(minAngle).toFixed(2)),
              });
            }
          }
        }
      }
    }
  }
  return rows;
}

function applyPreset(preset, table) {
  // Implements filter presets per spec via a single custom predicate
  table.clearFilter(true);
  if (preset === "hypotenuses") {
    table.setFilter((data) => data.Iy === 0 && data.Tx === data.Ix);
  } else if (preset === "catheti") {
    table.setFilter((data) => data.Ix === data.Tx && data.Ty === 0);
  } else if (preset === "right") {
    table.setFilter((data) => data.AngMin === 90);
  }
}

export function renderLiftarms() {
  buildControls();
  const tableEl = document.getElementById("liftarms-table");
  const table = new Tabulator(tableEl, {
    height: 480,
    layout: "fitDataStretch",
    index: "id",
    columns: [
      { title: "Sx", field: "Sx", sorter: "number", headerFilter: "input" },
      { title: "Sy", field: "Sy", sorter: "number", headerFilter: "input" },
      { title: "S", field: "S", sorter: "number", headerFilter: "input" },
      { title: "Al", field: "Al", sorter: "number", headerFilter: "input" },
      { title: "Bl", field: "Bl", sorter: "number", headerFilter: "input" },
      { title: "Tx", field: "Tx", sorter: "number", headerFilter: "input" },
      { title: "Ty", field: "Ty", sorter: "number", headerFilter: "input" },
      { title: "Ix", field: "Ix", sorter: "number", headerFilter: "input" },
      { title: "Iy", field: "Iy", sorter: "number", headerFilter: "input" },
      { title: "AngA", field: "AngA", sorter: "number", headerFilter: "input" },
      { title: "AngB", field: "AngB", sorter: "number", headerFilter: "input" },
      { title: "AngMin", field: "AngMin", sorter: "number", headerFilter: "input" },
    ],
  });

  const presetSel = document.getElementById("preset");
  const runBtn = document.getElementById("run");
  runBtn.addEventListener("click", async () => {
    const aMax = parseFloat(document.getElementById("al-max").value);
    const bMax = parseFloat(document.getElementById("bl-max").value);
    const half = document.getElementById("half-studs").value === "true";

    table.replaceData([]);
    // Offload to worker for responsiveness
    const worker = new Worker("../workers/liftarms.worker.js", { type: "module" });
    worker.onmessage = (ev) => {
      const { type, payload } = ev.data;
      if (type === "rows") table.addData(payload);
      if (type === "done") {
        applyPreset(presetSel.value, table);
        worker.terminate();
      }
    };
    worker.postMessage({ aMax, bMax, half });
  });
}
