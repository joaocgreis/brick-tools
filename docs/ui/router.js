import { renderLiftarms } from "../modules/liftarms/doubleLiftarms.js";
import { renderGearCouplings } from "../modules/gears/couplings.js";
import { renderGearbox } from "../modules/gearbox/editor.js";

function mount(viewHtml) {
  const view = document.getElementById("view");
  view.innerHTML = viewHtml;
}

function route() {
  const hash = location.hash || "#/liftarms";
  if (hash.startsWith("#/liftarms")) {
    mount(`<h2 class=module-title>Two Liftarm Dimensions</h2>
      <p class=module-desc>Enumerate positions and angles for two liftarms locked in sequence.</p>
      <div id="liftarms-controls"></div>
      <div id="liftarms-table" style="margin-top:12px"></div>`);
    renderLiftarms();
    return;
  }
  if (hash.startsWith("#/gearcouplings")) {
    mount(`<h2 class=module-title>Gear Couplings</h2>
      <p class=module-desc>All possible couplings between selected Technic gears.</p>
      <div id="gears-controls"></div>
      <div id="gears-table" style="margin-top:12px"></div>`);
    renderGearCouplings();
    return;
  }
  if (hash.startsWith("#/gearbox")) {
    mount(`<h2 class=module-title>Gearbox Calculator</h2>
      <p class=module-desc>Build a diagram of tools and compute axle speed/torque per gear.</p>
      <div id="gearbox-controls"></div>
      <div id="gearbox-diagram" style="margin:12px 0"></div>
      <div>
        <canvas id="gearbox-chart" height="160"></canvas>
      </div>`);
    renderGearbox();
    return;
  }
}

window.addEventListener("hashchange", route);

let domReady = false;
let tabulatorReady = false;
function tryRoute() {
  if (domReady && tabulatorReady) route();
}
window.addEventListener("DOMContentLoaded", () => { domReady = true; tryRoute(); });

// Load Tabulator after DOM so modules can use it
const tabulatorScript = document.createElement("script");
tabulatorScript.src = "https://cdn.jsdelivr.net/npm/tabulator-tables@5.6.2/dist/js/tabulator.min.js";
tabulatorScript.onload = () => { tabulatorReady = true; tryRoute(); };
document.head.appendChild(tabulatorScript);
