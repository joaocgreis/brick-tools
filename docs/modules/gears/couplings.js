import { fmt, colorForOverfit } from "../util/format.js";

const DEFAULT_GEARS = [
  { id: "1_1L", label: "1 (1L)", teeth: 1, kind: "worm", radius: 0.75 },
  { id: "1_2L", label: "1 (2L)", teeth: 1, kind: "worm", radius: 0.5 },
  { id: "8", label: "8", teeth: 8 },
  { id: "12", label: "12", teeth: 12 },
  { id: "16", label: "16", teeth: 16 },
  { id: "20", label: "20", teeth: 20 },
  { id: "24", label: "24", teeth: 24 },
  { id: "28", label: "28", teeth: 28 },
  { id: "36", label: "36", teeth: 36 },
  { id: "40", label: "40", teeth: 40 },
];

function buildControls() {
  const host = document.getElementById("gears-controls");
  const opts = DEFAULT_GEARS.map(g => `<label><input type="checkbox" data-teeth="${g.teeth}" data-kind="${g.kind||''}" ${g.teeth<=24?"checked":""}> ${g.label}</label>`).join(" ");
  host.innerHTML = `
    <div class="form-row">
      <div style="display:flex; gap:12px; flex-wrap:wrap">${opts}</div>
    </div>
    <div class="form-row">
      <label>Custom teeth (A)
        <input id="customA" type="number" min="1" step="1" placeholder="e.g. 14">
      </label>
      <label>Custom teeth (B)
        <input id="customB" type="number" min="1" step="1" placeholder="e.g. 18">
      </label>
      <label>Max overfit (studs)
        <input id="maxOver" type="number" min="0" step="0.01" value="0.2">
      </label>
      <label>Min underfit (studs)
        <input id="minUnder" type="number" min="0" step="0.01" value="0.1">
      </label>
      <button class="primary" id="run-gears">Run</button>
    </div>
  `;
}

function ratio(a, b) { return a / b; }
function centerDist(aTeeth, bTeeth) { return (aTeeth + bTeeth) / 16; }

function enumeratePairs(dist, maxOver, minUnder) {
  const step = 0.5;
  const results = { exact: [], over: [], under: [] };
  const maxCoord = dist + maxOver;
  for (let x = 0; x <= maxCoord; x += step) {
    for (let y = 0; y <= x; y += step) {
      const d = Math.hypot(x, y);
      const d3 = Number(d.toFixed(3));
      const xs = Number(x.toFixed(1));
      const ys = Number(y.toFixed(1));
      if (Math.abs(d - dist) < 1e-9) {
        results.exact.push(`${xs}×${ys}`);
      } else if (d > dist && d <= dist + maxOver + 1e-9) {
        results.over.push({ pair: `${xs}×${ys}`, d: d3 });
      } else if (d < dist && d >= dist - minUnder - 1e-9) {
        results.under.push({ pair: `${xs}×${ys}`, d: d3 });
      }
    }
  }
  return results;
}

export function renderGearCouplings() {
  buildControls();
  const tableEl = document.getElementById("gears-table");
  const table = new Tabulator(tableEl, {
    height: 480,
    layout: "fitDataStretch",
    columns: [
      { title: "A", field: "A", sorter: "number", headerFilter: "input" },
      { title: "B", field: "B", sorter: "number", headerFilter: "input" },
      { title: "Ratio", field: "Ratio", sorter: "number", headerFilter: "input" },
      { title: "Dist", field: "Dist", sorter: "number", headerFilter: "input" },
      { title: "Exact", field: "Exact", formatter: "html", headerFilter: "input" },
      { title: "Overfit", field: "Overfit", formatter: "html", headerFilter: "input" },
      { title: "Underfit", field: "Underfit", formatter: "html", headerFilter: "input" },
    ],
  });

  document.getElementById("run-gears").addEventListener("click", () => {
    const maxOver = parseFloat(document.getElementById("maxOver").value);
    const minUnder = parseFloat(document.getElementById("minUnder").value);

    const selected = Array.from(document.querySelectorAll('#gears-controls input[type=checkbox]:checked'))
      .map(el => ({ teeth: parseInt(el.dataset.teeth, 10), kind: el.dataset.kind }));

    const customA = parseInt(document.getElementById("customA").value, 10);
    const customB = parseInt(document.getElementById("customB").value, 10);
    const aList = [...selected.map(s => s.teeth), ...(customA? [customA] : [])];
    const bList = [...selected.map(s => s.teeth), ...(customB? [customB] : [])];

    const rows = [];
    for (const a of aList) {
      const isWorm = a === 1; // only A can be worm
      for (const b of bList) {
        if (isWorm === true && a !== 1) continue; // safety
        const r = ratio(a, b);
        const dist = centerDist(a, b);
        const pairs = enumeratePairs(dist, maxOver, minUnder);
        const exactHtml = pairs.exact.length ? pairs.exact.join('; ') : "--";
        const overHtml = pairs.over.length ? pairs.over.map(o => `<span class="${colorForOverfit(o.d, dist)}">${o.pair} (${fmt(o.d,3)})</span>`).join('; ') : "--";
        const underHtml = pairs.under.length ? pairs.under.map(u => `<span class="text-red">${u.pair} (${fmt(u.d,3)})</span>`).join('; ') : "--";
        rows.push({ A: a, B: b, Ratio: Number(r.toFixed(2)), Dist: Number(dist.toFixed(3)), Exact: exactHtml, Overfit: overHtml, Underfit: underHtml });
      }
    }
    table.replaceData(rows);
  });
}
