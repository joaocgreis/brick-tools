import { computePerGear } from "./compute.js";

class CouplingTool {
  constructor(name, aAxle, bAxle, aTeeth=20, bTeeth=20) {
    this.type = "Coupling"; this.name = name;
    this.aAxle = aAxle; this.bAxle = bAxle; this.aTeeth = aTeeth; this.bTeeth = bTeeth;
  }
  getIO(gearIndex) {
    // If one side has an input, the other is an output; else flagged no-op.
    return { inputs: [{ axle: this.aAxle }, { axle: this.bAxle }], outputs: [{ axle: this.aAxle }, { axle: this.bAxle }] };
  }
  apply(state, gearIndex) {
    const aState = state.get(this.aAxle) || { speed: 0, torque: 0 };
    const bState = state.get(this.bAxle) || { speed: 0, torque: 0 };
    const aHasInput = aState.speed !== 0 || aState.torque !== 0;
    const bHasInput = bState.speed !== 0 || bState.torque !== 0;
    if (aHasInput && !bHasInput) {
      state.set(this.bAxle, {
        speed: aState.speed * (this.aTeeth / this.bTeeth),
        torque: aState.torque * (this.bTeeth / this.aTeeth),
      });
    } else if (bHasInput && !aHasInput) {
      state.set(this.aAxle, {
        speed: bState.speed * (this.bTeeth / this.aTeeth),
        torque: bState.torque * (this.aTeeth / this.bTeeth),
      });
    }
  }
}

class SelectorTool {
  constructor(name, centerAxle, aAxle, bAxle, perGearMode) {
    this.type = "Selector"; this.name = name;
    this.centerAxle = centerAxle; this.aAxle = aAxle; this.bAxle = bAxle; this.perGearMode = perGearMode; // array of "A"|"free"|"B"
  }
  getIO(gearIndex) {
    const mode = this.perGearMode[gearIndex] || "free";
    if (mode === "A") return { inputs: [{ axle: this.aAxle }], outputs: [{ axle: this.centerAxle }] };
    if (mode === "B") return { inputs: [{ axle: this.bAxle }], outputs: [{ axle: this.centerAxle }] };
    return { inputs: [], outputs: [] };
  }
  apply(state, gearIndex) {
    const mode = this.perGearMode[gearIndex] || "free";
    if (mode === "A") {
      const a = state.get(this.aAxle) || { speed: 0, torque: 0 };
      const center = state.get(this.centerAxle) || { speed: 0, torque: 0 };
      if (a.speed || a.torque) state.set(this.centerAxle, { speed: a.speed, torque: a.torque });
    } else if (mode === "B") {
      const b = state.get(this.bAxle) || { speed: 0, torque: 0 };
      const center = state.get(this.centerAxle) || { speed: 0, torque: 0 };
      if (b.speed || b.torque) state.set(this.centerAxle, { speed: b.speed, torque: b.torque });
    }
  }
}

class DifferentialTool {
  constructor(name, bodyAxle, aAxle, bAxle) {
    this.type = "Differential"; this.name = name;
    this.bodyAxle = bodyAxle; this.aAxle = aAxle; this.bAxle = bAxle;
  }
  getIO(gearIndex) {
    return { inputs: [{ axle: this.bodyAxle }, { axle: this.aAxle }, { axle: this.bAxle }], outputs: [{ axle: this.bodyAxle }, { axle: this.aAxle }, { axle: this.bAxle }] };
  }
  apply(state, gearIndex) {
    const body = state.get(this.bodyAxle) || { speed: 0, torque: 0 };
    const A = state.get(this.aAxle) || { speed: 0, torque: 0 };
    const B = state.get(this.bAxle) || { speed: 0, torque: 0 };
    const inputs = [body, A, B].filter(s => s.speed || s.torque);
    if (inputs.length !== 2) return; // flagged/no-op
    const isBodyInput = (body.speed || body.torque) && !(A.speed || A.torque) || (body.speed || body.torque) && !(B.speed || B.torque);
    if (isBodyInput) {
      // Body + one side input => output at other side
      if (A.speed || A.torque) {
        // B is output
        state.set(this.bAxle, {
          speed: 2 * body.speed - A.speed,
          torque: (body.torque + A.torque) / 2,
        });
      } else if (B.speed || B.torque) {
        // A is output
        state.set(this.aAxle, {
          speed: 2 * body.speed - B.speed,
          torque: (body.torque + B.torque) / 2,
        });
      }
    } else {
      // A & B inputs => body is output
      state.set(this.bodyAxle, {
        speed: (A.speed + B.speed) / 2,
        torque: 2 * (A.torque + B.torque),
      });
    }
  }
}

export function renderGearbox() {
  const host = document.getElementById("gearbox-controls");
  host.innerHTML = `
    <div class="form-row">
      <label>Gears (count)
        <input id="gear-count" type="number" min="1" step="1" value="2">
      </label>
      <label>Select axle for chart
        <input id="chart-axle" type="text" placeholder="e.g. Output Axle" value="Output Axle">
      </label>
      <button class="primary" id="compute">Compute</button>
    </div>
    <div class="form-row">
      <label>Add tool
        <select id="tool-type">
          <option value="Coupling">Coupling</option>
          <option value="Selector">Selector</option>
          <option value="Differential">Differential</option>
        </select>
      </label>
      <button id="add-tool">Add</button>
    </div>
    <div id="tools-list"></div>
  `;

  const diagram = { tools: [], axles: new Set(["Source Axle", "Output Axle"]) };

  function renderToolsList() {
    const listHost = document.getElementById("tools-list");
    listHost.innerHTML = diagram.tools.map((t, idx) => {
      if (t.type === "Coupling") {
        return `<div class="view" style="margin-top:8px;padding:8px">[Coupling ${t.name}] A=${t.aAxle} (${t.aTeeth}), B=${t.bAxle} (${t.bTeeth})</div>`;
      } else if (t.type === "Selector") {
        return `<div class="view" style="margin-top:8px;padding:8px">[Selector ${t.name}] center=${t.centerAxle}, A=${t.aAxle}, B=${t.bAxle}</div>`;
      } else if (t.type === "Differential") {
        return `<div class="view" style="margin-top:8px;padding:8px">[Differential ${t.name}] body=${t.bodyAxle}, A=${t.aAxle}, B=${t.bAxle}</div>`;
      }
      return "";
    }).join("");
  }

  document.getElementById("add-tool").addEventListener("click", () => {
    const type = document.getElementById("tool-type").value;
    if (type === "Coupling") {
      const name = `C${diagram.tools.length+1}`;
      const aAxle = prompt("Coupling: Gear A axle?", "Source Axle") || "Source Axle";
      const bAxle = prompt("Coupling: Gear B axle?", "Output Axle") || "Output Axle";
      const aTeeth = parseInt(prompt("Gear A teeth?", "20") || "20", 10);
      const bTeeth = parseInt(prompt("Gear B teeth?", "20") || "20", 10);
      diagram.axles.add(aAxle); diagram.axles.add(bAxle);
      diagram.tools.push(new CouplingTool(name, aAxle, bAxle, aTeeth, bTeeth));
    } else if (type === "Selector") {
      const name = `S${diagram.tools.length+1}`;
      const centerAxle = prompt("Selector: center axle?", "Output Axle") || "Output Axle";
      const aAxle = prompt("Selector: A axle?", "Source Axle") || "Source Axle";
      const bAxle = prompt("Selector: B axle?", "Output Axle") || "Output Axle";
      const gearCount = parseInt(document.getElementById("gear-count").value, 10);
      const perGear = [];
      for (let g = 0; g < gearCount; g++) {
        perGear.push(prompt(`Selector mode for gear ${g+1} (A/free/B)`, "free") || "free");
      }
      diagram.axles.add(centerAxle); diagram.axles.add(aAxle); diagram.axles.add(bAxle);
      diagram.tools.push(new SelectorTool(name, centerAxle, aAxle, bAxle, perGear));
    } else if (type === "Differential") {
      const name = `D${diagram.tools.length+1}`;
      const body = prompt("Differential: body axle?", "Output Axle") || "Output Axle";
      const aAxle = prompt("Differential: A axle?", "Source Axle") || "Source Axle";
      const bAxle = prompt("Differential: B axle?", "Output Axle") || "Output Axle";
      diagram.axles.add(body); diagram.axles.add(aAxle); diagram.axles.add(bAxle);
      diagram.tools.push(new DifferentialTool(name, body, aAxle, bAxle));
    }
    renderToolsList();
  });

  let chart;
  document.getElementById("compute").addEventListener("click", () => {
    const gearCount = parseInt(document.getElementById("gear-count").value, 10);
    const axleName = document.getElementById("chart-axle").value || "Output Axle";
    const speeds = [], torques = [];
    for (let g = 0; g < gearCount; g++) {
      const state = computePerGear(diagram, g);
      const s = state.get(axleName) || { speed: 0, torque: 0 };
      speeds.push(s.speed);
      torques.push(s.torque);
    }
    const ctx = document.getElementById("gearbox-chart");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "line",
      data: { labels: speeds.map((_, i) => `G${i+1}`), datasets: [
        { label: "Speed", data: speeds, borderColor: "#4aa3ff" },
        { label: "Torque", data: torques, borderColor: "#ff9f40" },
      ]},
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });
  });

  renderToolsList();
}
