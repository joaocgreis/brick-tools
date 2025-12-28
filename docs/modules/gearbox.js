/**
 * Gearbox Module - Gearbox Calculator
 * Calculates gear ratios and configurations for Technic Brick gearboxes.
 * Allows users to design gearboxes by adding tools (Coupling, Selector, Differential)
 * and connecting them. Calculates speed and torque for each axle across multiple gear modes.
 * 
 * TERMINOLOGY:
 * - "gear mode" = overall gearbox operating mode (Mode 1, Mode 2, etc.) - DO NOT just call it "gear"
 * - "gear piece" = individual circular component with teeth (Gear A, Gear B on couplings)
 * - "mode" params in selectors (mode1, mode2, etc.) = which connection is active for that gear mode
 */
(function() {
    'use strict';

    // ==================== Data Model ====================

    /**
     * Axle class - represents a connection point between tools
     */
    class Axle {
        constructor(id, name) {
            this.id = id;
            this.name = name;
        }
    }

    /**
     * Connection class - represents a connection point on a tool
     */
    class Connection {
        constructor(name, tool) {
            this.name = name;       // e.g., "Gear A", "Gear B", "Center", "A", "B", "Body"
            this.tool = tool;       // parent tool reference
            this.axleId = null;     // which axle this connects to (null = disconnected)
        }
    }

    /**
     * Tool class - represents a gearbox component
     */
    class Tool {
        constructor(type, id) {
            this.type = type;       // 'source', 'coupling', 'selector', 'differential'
            this.id = id;
            this.connections = [];  // array of Connection
            this.params = {};       // tool-specific parameters
            this.status = {};       // per-gear-mode status: { gearModeNum: { error: string, flagged: bool } }
        }
    }

    // ==================== Module State ====================

    let numGearModes = 3;
    let tools = [];
    let axles = [];
    let nextToolId = 1;
    let nextAxleId = 2;  // 1 is pre-created for source
    let selectedAxleId = 1;
    let container = null;

    // Source tool (always exists, cannot be removed)
    let sourceTool = null;

    // ==================== Initialization ====================

    function init() {
        container = document.getElementById('gearbox-module');
        if (!container) {
            console.error('Gearbox module container not found');
            return;
        }

        // Initialize data
        resetData();

        // Build UI
        container.innerHTML = '';
        renderControls();
        renderDiagram();
        renderResults();

        // Initial computation
        compute();
    }

    function resetData() {
        numGearModes = 3;
        tools = [];
        axles = [];
        nextToolId = 1;
        nextAxleId = 2;
        selectedAxleId = 1;

        // Create initial axle
        axles.push(new Axle(1, 'Axle 1'));

        // Create source tool
        sourceTool = new Tool('source', 'source');
        const sourceConn = new Connection('Output', sourceTool);
        sourceConn.axleId = 1;  // Pre-connected to Axle 1
        sourceTool.connections.push(sourceConn);
        tools.push(sourceTool);
    }

    // ==================== UI Rendering ====================

    function renderControls() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'gearbox-controls';
        controlsDiv.innerHTML = `
            <div class="control-group">
                <label for="num-gear-modes">Number of Gear Modes:</label>
                <input type="number" id="num-gear-modes" min="1" max="9" value="${numGearModes}">
            </div>
            <button class="btn btn-primary" id="add-coupling">Add Coupling</button>
            <button class="btn btn-primary" id="add-selector">Add Selector</button>
            <button class="btn btn-primary" id="add-differential">Add Differential</button>
        `;
        container.appendChild(controlsDiv);

        // Event listeners
        document.getElementById('num-gear-modes').addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            if (val >= 1 && val <= 9) {
                numGearModes = val;
                updateSelectorParams();
                updateDiagram();
                compute();
            }
        });

        document.getElementById('add-coupling').addEventListener('click', () => addTool('coupling'));
        document.getElementById('add-selector').addEventListener('click', () => addTool('selector'));
        document.getElementById('add-differential').addEventListener('click', () => addTool('differential'));
    }

    function renderDiagram() {
        const diagramDiv = document.createElement('div');
        diagramDiv.className = 'gearbox-diagram';
        diagramDiv.id = 'gearbox-diagram';
        container.appendChild(diagramDiv);
        updateDiagram();
    }

    function renderResults() {
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'gearbox-results';
        resultsDiv.id = 'gearbox-results';
        resultsDiv.innerHTML = `
            <h3>Results</h3>
            <div class="results-controls">
                <label for="axle-selector">Select Axle:</label>
                <select id="axle-selector"></select>
            </div>
            <div class="chart-container" id="results-chart"></div>
            <div class="chart-legend">
                <div class="legend-item">
                    <div class="legend-color speed"></div>
                    <span>Speed</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color torque"></div>
                    <span>Torque</span>
                </div>
            </div>
        `;
        container.appendChild(resultsDiv);

        document.getElementById('axle-selector').addEventListener('change', (e) => {
            selectedAxleId = parseInt(e.target.value);
            renderResultsChart();
        });

        updateAxleSelector();
    }

    function updateDiagram() {
        const diagram = document.getElementById('gearbox-diagram');
        if (!diagram) return;

        diagram.innerHTML = '';

        for (const tool of tools) {
            const card = createToolCard(tool);
            diagram.appendChild(card);
        }
    }

    function createToolCard(tool) {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.dataset.toolId = tool.id;

        if (tool.type === 'source') {
            card.classList.add('source');
        }

        // Check for errors or flags
        const hasError = Object.values(tool.status).some(s => s.error);
        const hasFlag = Object.values(tool.status).some(s => s.flagged);
        if (hasError) card.classList.add('has-error');
        else if (hasFlag) card.classList.add('has-flag');

        // Header
        const header = document.createElement('div');
        header.className = 'tool-header';
        header.innerHTML = `
            <span class="tool-type ${tool.type}">${getToolTypeName(tool.type)}</span>
            ${tool.type !== 'source' ? '<button class="remove-tool">×</button>' : ''}
        `;
        card.appendChild(header);

        if (tool.type !== 'source') {
            header.querySelector('.remove-tool').addEventListener('click', () => removeTool(tool.id));
        }

        // Parameters
        const paramsDiv = document.createElement('div');
        paramsDiv.className = 'tool-params';
        paramsDiv.innerHTML = renderToolParams(tool);
        card.appendChild(paramsDiv);

        // Add param event listeners
        attachParamListeners(paramsDiv, tool);

        // Connections
        const connDiv = document.createElement('div');
        connDiv.className = 'tool-connections';
        connDiv.innerHTML = renderToolConnections(tool);
        card.appendChild(connDiv);

        // Add connection event listeners
        attachConnectionListeners(connDiv, tool);

        // Status
        const statusDiv = document.createElement('div');
        statusDiv.className = 'tool-status';
        statusDiv.innerHTML = renderToolStatus(tool);
        card.appendChild(statusDiv);

        return card;
    }

    function getToolTypeName(type) {
        const names = {
            'source': 'Source Axle',
            'coupling': 'Coupling',
            'selector': 'Selector',
            'differential': 'Differential'
        };
        return names[type] || type;
    }

    function renderToolParams(tool) {
        switch (tool.type) {
            case 'coupling':
                const teethA = tool.params.teethA || 16;
                const teethB = tool.params.teethB || 16;
                const gearRatio = (teethA / teethB).toFixed(2);
                const invertDir = tool.params.invertDirection !== undefined ? tool.params.invertDirection : true;
                return `
                    <div class="param-row">
                        <label>Teeth A:</label>
                        <input type="number" class="param-input" data-param="teethA" 
                               min="1" step="4" value="${teethA}">
                    </div>
                    <div class="param-row">
                        <label>Teeth B:</label>
                        <input type="number" class="param-input" data-param="teethB" 
                               min="8" step="4" value="${teethB}">
                    </div>
                    <div class="param-row">
                        <label>
                            <input type="checkbox" class="param-input" data-param="invertDirection" 
                                   ${invertDir ? 'checked' : ''}>
                            Invert direction
                        </label>
                    </div>
                    <div class="param-row">
                        <label>Gear ratio:</label>
                        <span>${gearRatio}</span>
                    </div>
                `;
            case 'selector':
                let html = '';
                for (let g = 1; g <= numGearModes; g++) {
                    const sel = tool.params[`mode${g}`] || 'Locked';
                    html += `
                        <div class="param-row">
                            <label>Mode ${g}:</label>
                            <select class="param-input" data-param="mode${g}">
                                <option value="A" ${sel === 'A' ? 'selected' : ''}>A</option>
                                <option value="Locked" ${sel === 'Locked' ? 'selected' : ''}>Locked</option>
                                <option value="B" ${sel === 'B' ? 'selected' : ''}>B</option>
                            </select>
                        </div>
                    `;
                }
                return html;
            case 'differential':
            case 'source':
            default:
                return '<div class="param-row" style="color: var(--text-muted); font-size: 0.85rem;">No parameters</div>';
        }
    }

    function renderToolConnections(tool) {
        let html = '';
        for (const conn of tool.connections) {
            const axleOptions = getAxleOptions(conn.axleId);
            html += `
                <div class="connection-row">
                    <span class="conn-name">${conn.name}:</span>
                    <select class="conn-select" data-conn="${conn.name}">
                        ${axleOptions}
                    </select>
                </div>
            `;
        }
        return html;
    }

    function getAxleOptions(selectedId) {
        let html = '<option value="">-- None --</option>';
        for (const axle of axles) {
            html += `<option value="${axle.id}" ${axle.id === selectedId ? 'selected' : ''}>${axle.name}</option>`;
        }
        html += '<option value="new">+ New Axle</option>';
        return html;
    }

    function renderToolStatus(tool) {
        let html = '';
        for (let g = 1; g <= numGearModes; g++) {
            const status = tool.status[g];
            let statusText = '';
            let statusClass = 'status-ok';

            if (status) {
                if (status.error) {
                    statusText = status.error;
                    statusClass = 'status-error';
                } else if (status.flagged) {
                    statusText = 'No input';
                    statusClass = 'status-flagged';
                } else {
                    statusText = '✓ OK';
                }
            } else {
                statusText = '—';
            }

            html += `
                <div class="status-item">
                    <span class="mode-label">Mode ${g}:</span>
                    <span class="${statusClass}">${statusText}</span>
                </div>
            `;
        }
        return html;
    }

    function attachParamListeners(paramsDiv, tool) {
        const inputs = paramsDiv.querySelectorAll('.param-input');
        inputs.forEach(input => {
            // Store initial value
            if (input.type === 'number' && (input.dataset.param === 'teethA' || input.dataset.param === 'teethB')) {
                input.dataset.prevValue = input.value;
            }
            
            input.addEventListener('change', (e) => {
                const paramName = e.target.dataset.param;
                let value = e.target.value;
                if (e.target.type === 'checkbox') {
                    value = e.target.checked;
                } else if (e.target.type === 'number') {
                    value = parseInt(value);
                    
                    // Special handling for teeth inputs
                    if (paramName === 'teethA' || paramName === 'teethB') {
                        const prevValue = parseInt(e.target.dataset.prevValue) || 16;
                        const min = paramName === 'teethA' ? 1 : 8;
                        
                        // Check if value is valid: 1 (A only), 8, 12, 16, 20, ...
                        const isValid = (value === 1 && paramName === 'teethA') || 
                                       (value >= 8 && (value - 8) % 4 === 0);
                        
                        if (!isValid) {
                            // Determine direction
                            const goingUp = value > prevValue;
                            
                            if (goingUp) {
                                // Jump to next valid value above
                                if (value < 8) {
                                    value = 8;
                                } else {
                                    value = Math.ceil((value - 8) / 4) * 4 + 8;
                                }
                            } else {
                                // Jump to next valid value below
                                if (paramName === 'teethA' && value < 8 && value >= 1) {
                                    value = 1;
                                } else if (value < 8) {
                                    value = min;
                                } else {
                                    value = Math.floor((value - 8) / 4) * 4 + 8;
                                    if (value < min) value = min;
                                }
                            }
                        }
                        
                        // Ensure minimum
                        if (value < min) {
                            value = min;
                        }
                        
                        e.target.value = value;
                        e.target.dataset.prevValue = value;
                    }
                }
                updateParam(tool.id, paramName, value);
            });
        });
    }

    function attachConnectionListeners(connDiv, tool) {
        const selects = connDiv.querySelectorAll('.conn-select');
        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                const connName = e.target.dataset.conn;
                let axleId = e.target.value;

                if (axleId === 'new') {
                    // Create new axle
                    const newAxle = new Axle(nextAxleId, `Axle ${nextAxleId}`);
                    axles.push(newAxle);
                    axleId = nextAxleId;
                    nextAxleId++;
                    updateAxleSelector();
                } else if (axleId === '') {
                    axleId = null;
                } else {
                    axleId = parseInt(axleId);
                }

                updateConnection(tool.id, connName, axleId);
            });
        });
    }

    function updateAxleSelector() {
        const selector = document.getElementById('axle-selector');
        if (!selector) return;

        selector.innerHTML = '';
        for (const axle of axles) {
            const option = document.createElement('option');
            option.value = axle.id;
            option.textContent = axle.name;
            if (axle.id === selectedAxleId) {
                option.selected = true;
            }
            selector.appendChild(option);
        }

        // Ensure selected axle still exists
        if (!axles.find(a => a.id === selectedAxleId) && axles.length > 0) {
            selectedAxleId = axles[0].id;
            selector.value = selectedAxleId;
        }
    }

    function updateSelectorParams() {
        // Ensure all selector tools have params for all gear modes
        for (const tool of tools) {
            if (tool.type === 'selector') {
                for (let g = 1; g <= numGearModes; g++) {
                    if (!tool.params[`mode${g}`]) {
                        tool.params[`mode${g}`] = 'Locked';
                    }
                }
            }
        }
    }

    // ==================== Tool Management ====================

    function addTool(type) {
        const tool = new Tool(type, `tool_${nextToolId}`);
        nextToolId++;

        // Set up connections and default params based on type
        switch (type) {
            case 'coupling':
                tool.connections.push(new Connection('Gear A', tool));
                tool.connections.push(new Connection('Gear B', tool));
                tool.params.teethA = 16;
                tool.params.teethB = 16;
                tool.params.invertDirection = true;
                break;
            case 'selector':
                tool.connections.push(new Connection('Center', tool));
                tool.connections.push(new Connection('A', tool));
                tool.connections.push(new Connection('B', tool));
                for (let g = 1; g <= numGearModes; g++) {
                    tool.params[`mode${g}`] = 'Locked';
                }
                break;
            case 'differential':
                tool.connections.push(new Connection('Body', tool));
                tool.connections.push(new Connection('A', tool));
                tool.connections.push(new Connection('B', tool));
                break;
        }

        tools.push(tool);
        updateDiagram();
        compute();
    }

    function removeTool(toolId) {
        if (toolId === 'source') return;  // Cannot remove source

        const index = tools.findIndex(t => t.id === toolId);
        if (index > -1) {
            tools.splice(index, 1);
            cleanupUnusedAxles();
            updateDiagram();
            updateAxleSelector();
            compute();
        }
    }

    function updateConnection(toolId, connName, axleId) {
        const tool = tools.find(t => t.id === toolId);
        if (!tool) return;

        const conn = tool.connections.find(c => c.name === connName);
        if (!conn) return;

        conn.axleId = axleId;
        cleanupUnusedAxles();
        updateDiagram();
        updateAxleSelector();
        compute();
    }

    function updateParam(toolId, paramName, value) {
        const tool = tools.find(t => t.id === toolId);
        if (!tool) return;

        tool.params[paramName] = value;
        compute();
        updateDiagram();  // Update status display
    }

    function cleanupUnusedAxles() {
        // Find all axle IDs in use
        const usedAxleIds = new Set();
        for (const tool of tools) {
            for (const conn of tool.connections) {
                if (conn.axleId !== null) {
                    usedAxleIds.add(conn.axleId);
                }
            }
        }

        // Keep only used axles (but always keep at least Axle 1 if source uses it)
        axles = axles.filter(a => usedAxleIds.has(a.id));

        // Ensure we have at least one axle
        if (axles.length === 0) {
            axles.push(new Axle(1, 'Axle 1'));
        }
    }

    // ==================== Computation ====================

    function compute() {
        // Clear all tool statuses
        for (const tool of tools) {
            tool.status = {};
        }

        const allResults = {};

        // Compute for each gear mode (1st gear, 2nd gear, etc.)
        for (let g = 1; g <= numGearModes; g++) {
            allResults[g] = computeGearMode(g);
        }

        // Update results display
        renderResultsChart(allResults);
    }

    function computeGearMode(gearModeNum) {
        // Track which axles have known values
        const axleValues = new Map();  // axleId -> { speed, torque, outputBy: toolId }

        // Initialize source axle output
        const sourceConn = sourceTool.connections[0];
        if (sourceConn.axleId !== null) {
            axleValues.set(sourceConn.axleId, { speed: 1, torque: 1, outputBy: 'source' });
        }
        sourceTool.status[gearModeNum] = { error: null, flagged: false };

        // Iterate until no changes (propagation)
        let changed = true;
        let iterations = 0;
        const maxIterations = 100;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;

            for (const tool of tools) {
                if (tool.type === 'source') continue;

                const result = evaluateTool(tool, gearModeNum, axleValues);

                // Update tool status
                tool.status[gearModeNum] = {
                    error: result.error || null,
                    flagged: result.flagged || false
                };

                // Handle single output
                if (result.output && !result.error) {
                    const { axleId, speed, torque } = result.output;
                    const existing = axleValues.get(axleId);

                    if (existing && existing.outputBy !== tool.id) {
                        // ERROR: multiple outputs to same axle
                        tool.status[gearModeNum] = {
                            error: `Conflict with ${getToolLabel(existing.outputBy)}`,
                            flagged: false
                        };
                    } else if (!existing) {
                        axleValues.set(axleId, { speed, torque, outputBy: tool.id });
                        changed = true;
                    }
                }

                // Handle multiple outputs (for Locked mode)
                if (result.outputs && !result.error) {
                    for (const output of result.outputs) {
                        const { axleId, speed, torque } = output;
                        const existing = axleValues.get(axleId);

                        if (existing && existing.outputBy !== tool.id) {
                            // Skip this output if another tool already controls it
                            continue;
                        } else if (!existing) {
                            axleValues.set(axleId, { speed, torque, outputBy: tool.id });
                            changed = true;
                        }
                    }
                }
            }
        }

        return axleValues;
    }

    function getToolLabel(toolId) {
        if (toolId === 'source') return 'Source';
        const tool = tools.find(t => t.id === toolId);
        if (tool) {
            return getToolTypeName(tool.type);
        }
        return toolId;
    }

    function evaluateTool(tool, gearModeNum, axleValues) {
        switch (tool.type) {
            case 'coupling':
                return evaluateCoupling(tool, gearModeNum, axleValues);
            case 'selector':
                return evaluateSelector(tool, gearModeNum, axleValues);
            case 'differential':
                return evaluateDifferential(tool, gearModeNum, axleValues);
            default:
                return { flagged: true };
        }
    }

    function evaluateCoupling(tool, gearModeNum, axleValues) {
        const connA = tool.connections.find(c => c.name === 'Gear A');  // Gear piece A
        const connB = tool.connections.find(c => c.name === 'Gear B');  // Gear piece B

        if (!connA || !connB) return { flagged: true };

        const teethA = tool.params.teethA || 16;
        const teethB = tool.params.teethB || 16;

        // Check if axles have inputs from OTHER tools (not this coupling)
        const hasInputA = connA.axleId !== null && axleValues.has(connA.axleId) && axleValues.get(connA.axleId).outputBy !== tool.id;
        const hasInputB = connB.axleId !== null && axleValues.has(connB.axleId) && axleValues.get(connB.axleId).outputBy !== tool.id;

        if (hasInputA && hasInputB) {
            return { error: 'Conflicting outputs' };
        }

        if (!hasInputA && !hasInputB) {
            return { flagged: true };
        }

        // Determine input and output
        let inputConn, outputConn, inputTeeth, outputTeeth;
        if (hasInputA) {
            inputConn = connA;
            outputConn = connB;
            inputTeeth = teethA;
            outputTeeth = teethB;
        } else {
            inputConn = connB;
            outputConn = connA;
            inputTeeth = teethB;
            outputTeeth = teethA;
        }

        if (outputConn.axleId === null) {
            return { flagged: true };  // Output not connected
        }

        const input = axleValues.get(inputConn.axleId);
        // Gears reverse direction if invertDirection is enabled
        const invertDirection = tool.params.invertDirection !== undefined ? tool.params.invertDirection : true;
        const directionMultiplier = invertDirection ? -1 : 1;
        const outputSpeed = directionMultiplier * input.speed * (inputTeeth / outputTeeth);
        const outputTorque = input.torque * (outputTeeth / inputTeeth);

        return {
            output: {
                axleId: outputConn.axleId,
                speed: outputSpeed,
                torque: outputTorque
            }
        };
    }

    function evaluateSelector(tool, gearModeNum, axleValues) {
        const connCenter = tool.connections.find(c => c.name === 'Center');
        const connA = tool.connections.find(c => c.name === 'A');
        const connB = tool.connections.find(c => c.name === 'B');

        if (!connCenter || !connA || !connB) return { flagged: true };

        // Get selection for this gear mode (Mode 1, Mode 2, etc.)
        const selection = tool.params[`mode${gearModeNum}`] || 'Locked';

        if (selection === 'Locked') {
            // Locked mode: any connection without existing output gets speed=0
            const outputs = [];
            
            for (const conn of [connCenter, connA, connB]) {
                if (conn.axleId === null) continue;
                
                const hasExistingOutput = axleValues.has(conn.axleId) && axleValues.get(conn.axleId).outputBy !== tool.id;
                if (!hasExistingOutput) {
                    outputs.push({
                        axleId: conn.axleId,
                        speed: 0,
                        torque: 0
                    });
                }
            }
            
            // Return all outputs (or flagged if none)
            if (outputs.length > 0) {
                return { outputs: outputs };
            }
            return { flagged: true };
        }

        // For 'A' or 'B' selection: connect center axle to selected axle
        const activeConn = selection === 'A' ? connA : connB;

        // Check if axles have inputs from OTHER tools (not this selector)
        const hasCenterInput = connCenter.axleId !== null && axleValues.has(connCenter.axleId) && axleValues.get(connCenter.axleId).outputBy !== tool.id;
        const hasActiveInput = activeConn.axleId !== null && axleValues.has(activeConn.axleId) && axleValues.get(activeConn.axleId).outputBy !== tool.id;

        if (hasCenterInput && hasActiveInput) {
            return { error: 'Conflicting outputs' };
        }

        if (!hasCenterInput && !hasActiveInput) {
            return { flagged: true };  // No input (not an error, just no-op)
        }

        // Determine input and output (pass through unchanged)
        let inputConn, outputConn;
        if (hasCenterInput) {
            inputConn = connCenter;
            outputConn = activeConn;
        } else {
            inputConn = activeConn;
            outputConn = connCenter;
        }

        if (outputConn.axleId === null) {
            return { flagged: true };  // Output not connected
        }

        const input = axleValues.get(inputConn.axleId);

        return {
            output: {
                axleId: outputConn.axleId,
                speed: input.speed,
                torque: input.torque
            }
        };
    }

    function evaluateDifferential(tool, gearModeNum, axleValues) {
        const connBody = tool.connections.find(c => c.name === 'Body');
        const connA = tool.connections.find(c => c.name === 'A');
        const connB = tool.connections.find(c => c.name === 'B');

        if (!connBody || !connA || !connB) return { flagged: true };

        // Check if axles have inputs from OTHER tools (not this differential)
        const hasBodyInput = connBody.axleId !== null && axleValues.has(connBody.axleId) && axleValues.get(connBody.axleId).outputBy !== tool.id;
        const hasAInput = connA.axleId !== null && axleValues.has(connA.axleId) && axleValues.get(connA.axleId).outputBy !== tool.id;
        const hasBInput = connB.axleId !== null && axleValues.has(connB.axleId) && axleValues.get(connB.axleId).outputBy !== tool.id;

        const inputCount = (hasBodyInput ? 1 : 0) + (hasAInput ? 1 : 0) + (hasBInput ? 1 : 0);

        if (inputCount === 0 || inputCount === 1) {
            return { flagged: true };
        }

        if (inputCount === 3) {
            return { error: 'Conflicting outputs' };
        }

        // Exactly 2 inputs - the third becomes output
        let outputConn;
        let outputSpeed, outputTorque;

        if (!hasBodyInput) {
            // Body is output
            outputConn = connBody;
            const inputA = axleValues.get(connA.axleId);
            const inputB = axleValues.get(connB.axleId);
            outputSpeed = (inputA.speed + inputB.speed) / 2;
            outputTorque = 2 * (inputA.torque + inputB.torque);
        } else if (!hasAInput) {
            // A is output
            outputConn = connA;
            const bodyInput = axleValues.get(connBody.axleId);
            const bInput = axleValues.get(connB.axleId);
            outputSpeed = 2 * bodyInput.speed - bInput.speed;
            outputTorque = (bodyInput.torque + bInput.torque) / 2;
        } else {
            // B is output
            outputConn = connB;
            const bodyInput = axleValues.get(connBody.axleId);
            const aInput = axleValues.get(connA.axleId);
            outputSpeed = 2 * bodyInput.speed - aInput.speed;
            outputTorque = (bodyInput.torque + aInput.torque) / 2;
        }

        if (outputConn.axleId === null) {
            return { flagged: true };  // Output not connected
        }

        return {
            output: {
                axleId: outputConn.axleId,
                speed: outputSpeed,
                torque: outputTorque
            }
        };
    }

    // ==================== Results Display ====================

    function renderResultsChart(allResults) {
        const chartDiv = document.getElementById('results-chart');
        if (!chartDiv) return;

        // Use stored results if not provided
        if (!allResults) {
            allResults = {};
            for (let g = 1; g <= numGearModes; g++) {
                allResults[g] = computeGearMode(g);
            }
        }

        // Get values for selected axle across all gear modes
        const axleData = [];
        let maxSpeed = 0;
        let maxTorque = 0;

        for (let g = 1; g <= numGearModes; g++) {
            const modeResults = allResults[g];
            const axleValue = modeResults.get(selectedAxleId);

            if (axleValue) {
                axleData.push({
                    mode: g,
                    speed: axleValue.speed,
                    torque: axleValue.torque,
                    error: null
                });
                maxSpeed = Math.max(maxSpeed, Math.abs(axleValue.speed));
                maxTorque = Math.max(maxTorque, Math.abs(axleValue.torque));
            } else {
                axleData.push({
                    mode: g,
                    speed: null,
                    torque: null,
                    error: 'No data'
                });
            }
        }

        // Ensure we have reasonable max values for scaling
        maxSpeed = maxSpeed || 1;
        maxTorque = maxTorque || 1;

        // Render chart
        if (axleData.every(d => d.error)) {
            chartDiv.innerHTML = '<div class="no-data-message">No data available for selected axle. Connect tools to this axle to see results.</div>';
            return;
        }

        let html = '';
        for (const data of axleData) {
            html += `
                <div class="chart-row">
                    <span class="mode-label">Mode ${data.mode}</span>
                    <div class="chart-bars">
            `;

            if (data.error) {
                html += `
                    <div class="chart-bar-wrapper">
                        <span class="chart-bar-label">Speed:</span>
                        <div class="chart-bar-container">
                            <div class="chart-bar error" style="width: 0%"></div>
                        </div>
                        <span class="chart-bar-value error">${data.error}</span>
                    </div>
                    <div class="chart-bar-wrapper">
                        <span class="chart-bar-label">Torque:</span>
                        <div class="chart-bar-container">
                            <div class="chart-bar error" style="width: 0%"></div>
                        </div>
                        <span class="chart-bar-value error">${data.error}</span>
                    </div>
                `;
            } else {
                const speedWidth = (Math.abs(data.speed) / maxSpeed) * 100;
                const torqueWidth = (Math.abs(data.torque) / maxTorque) * 100;

                html += `
                    <div class="chart-bar-wrapper">
                        <span class="chart-bar-label">Speed:</span>
                        <div class="chart-bar-container">
                            <div class="chart-bar speed" style="width: ${speedWidth}%"></div>
                        </div>
                        <span class="chart-bar-value">${formatValue(data.speed)}</span>
                    </div>
                    <div class="chart-bar-wrapper">
                        <span class="chart-bar-label">Torque:</span>
                        <div class="chart-bar-container">
                            <div class="chart-bar torque" style="width: ${torqueWidth}%"></div>
                        </div>
                        <span class="chart-bar-value">${formatValue(data.torque)}</span>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }

        chartDiv.innerHTML = html;
    }

    function formatValue(value) {
        if (value === null || value === undefined) return '—';
        if (Number.isInteger(value)) return value.toString();
        return value.toFixed(3);
    }

    // ==================== Module Registration ====================

    TechnicTools.registerModule('gearbox-module', 'Gearbox Calculator', init);
})();
