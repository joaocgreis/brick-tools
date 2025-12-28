// Core compute pass for Gearbox per gear
// Axles: identified by user-defined names. Tools output to axles depending on gear.

export function computePerGear(diagram, gearIndex) {
  // diagram: { tools: [...], axles: Set<string> }
  // Each tool exposes getIO(gearIndex): { inputs: [{axle}], outputs: [{axle}] } and apply(state): mutates output axles
  const state = new Map(); // axle -> { speed, torque }
  for (const axle of diagram.axles) state.set(axle, { speed: 0, torque: 0 });
  // Source axle fixed to 1
  state.set("Source Axle", { speed: 1, torque: 1 });

  // For each axle, determine the single output source tool (error if >1)
  const outputsPerAxle = new Map();
  for (const tool of diagram.tools) {
    const io = tool.getIO(gearIndex);
    for (const out of io.outputs) {
      const existing = outputsPerAxle.get(out.axle);
      if (existing) {
        tool.errors = tool.errors || [];
        tool.errors.push({ type: "multiple-outputs", axle: out.axle });
      } else {
        outputsPerAxle.set(out.axle, tool);
      }
    }
  }

  // Apply tools in naive order; for cycles, values may remain 0 except source-driven
  // This is a single pass; more robust approach would resolve DAG or iterate until convergence.
  for (const tool of diagram.tools) {
    tool.apply(state, gearIndex);
  }
  return state;
}
