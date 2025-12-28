/**
 * Gears Module - Gear Couplings Calculator
 * Calculates all possible gear coupling configurations between two Technic Brick gears,
 * showing exact, overfit, and underfit mounting positions.
 */
(function() {
    'use strict';

    // Standard gear teeth options
    const STANDARD_TEETH = [
        { value: '1(1L)', label: '1(1L)', numeric: 0.75, isWorm: true, radius: 0.75 },
        { value: '1(2L)', label: '1(2L)', numeric: 0.5, isWorm: true, radius: 0.5 },
        { value: 8, label: '8', numeric: 8, isWorm: false, radius: 0.5 },
        { value: 12, label: '12', numeric: 12, isWorm: false, radius: 0.75 },
        { value: 16, label: '16', numeric: 16, isWorm: false, radius: 1 },
        { value: 20, label: '20', numeric: 20, isWorm: false, radius: 1.25 },
        { value: 24, label: '24', numeric: 24, isWorm: false, radius: 1.5 },
        { value: 28, label: '28', numeric: 28, isWorm: false, radius: 1.75 },
        { value: 36, label: '36', numeric: 36, isWorm: false, radius: 2.25 },
        { value: 40, label: '40', numeric: 40, isWorm: false, radius: 2.5 }
    ];

    // Default checked teeth
    const DEFAULT_CHECKED = ['1(1L)', '1(2L)', 8, 12, 16, 20, 24];

    /**
     * Get the radius of a gear
     * @param {string|number} teeth - Teeth count or worm designation
     * @returns {number} Radius in studs
     */
    function getGearRadius(teeth) {
        if (teeth === '1(1L)') return 0.75;
        if (teeth === '1(2L)') return 0.5;
        return teeth / 16;
    }

    /**
     * Check if a gear is a worm gear
     * @param {string|number} teeth - Teeth count or worm designation
     * @returns {boolean} True if worm gear
     */
    function isWormGear(teeth) {
        return teeth === '1(1L)' || teeth === '1(2L)';
    }

    /**
     * Get the numeric sorting value for a gear
     * @param {string|number} teeth - Teeth count or worm designation
     * @returns {number} Numeric value for sorting
     */
    function getGearSortValue(teeth) {
        if (teeth === '1(1L)') return 0.75;
        if (teeth === '1(2L)') return 0.5;
        return teeth;
    }

    /**
     * Calculate center distance between two gears
     * @param {string|number} gearA - Gear A teeth
     * @param {string|number} gearB - Gear B teeth
     * @returns {number} Center distance in studs
     */
    function calculateCenterDistance(gearA, gearB) {
        if (gearA === '1(1L)') {
            return 0.75 + (gearB / 16);
        } else if (gearA === '1(2L)') {
            return 0.5 + (gearB / 16);
        } else {
            return (gearA + gearB) / 16;
        }
    }

    /**
     * Calculate gear ratio
     * @param {string|number} gearA - Gear A teeth (driver)
     * @param {string|number} gearB - Gear B teeth (follower)
     * @returns {number} Gear ratio
     */
    function calculateGearRatio(gearA, gearB) {
        if (gearA === '1(1L)' || gearA === '1(2L)') {
            return 1 / gearB;
        }
        return gearA / gearB;
    }

    /**
     * Find all valid mounting positions for a gear pair
     * @param {number} dist - Ideal center distance
     * @param {number} maxOverfit - Maximum overfit tolerance
     * @param {number} maxUnderfit - Maximum underfit tolerance
     * @returns {Object} Object with exact, overfit, and underfit arrays
     */
    function findMountingPositions(dist, maxOverfit, maxUnderfit) {
        const exactList = [];
        const overfitList = [];
        const underfitList = [];
        
        const maxCoord = Math.ceil(dist + maxOverfit + 1);
        
        for (let x = 0; x <= maxCoord; x += 0.5) {
            for (let y = 0; y <= x; y += 0.5) {
                const actualDist = Math.sqrt(x * x + y * y);
                
                // Skip if too far or too close
                if (actualDist > dist + maxOverfit) continue;
                if (actualDist < dist - maxUnderfit) continue;
                if (actualDist === 0) continue;
                
                const diff = actualDist - dist;
                
                if (Math.abs(diff) < 0.0001) {
                    exactList.push({ x, y, dist: actualDist });
                } else if (diff > 0) {
                    overfitList.push({ x, y, dist: actualDist });
                } else {
                    underfitList.push({ x, y, dist: actualDist });
                }
            }
        }
        
        return { exact: exactList, overfit: overfitList, underfit: underfitList };
    }

    /**
     * Format position for exact column
     * @param {Object} pos - Position object {x, y, dist}
     * @returns {string} Formatted position
     */
    function formatExactPosition(pos) {
        return `${pos.x.toFixed(1)}×${pos.y.toFixed(1)}`;
    }

    /**
     * Format position for overfit/underfit column
     * @param {Object} pos - Position object {x, y, dist}
     * @returns {string} Formatted position with distance
     */
    function formatPositionWithDist(pos) {
        return `${pos.x.toFixed(1)}×${pos.y.toFixed(1)} (${pos.dist.toFixed(3)})`;
    }

    /**
     * Get color class for overfit position
     * @param {number} actualDist - Actual distance
     * @param {number} idealDist - Ideal center distance
     * @returns {string} CSS class name
     */
    function getOverfitColorClass(actualDist, idealDist) {
        const diff = actualDist - idealDist;
        if (diff <= 0.05) return 'text-green';
        if (diff <= 0.1) return 'text-orange';
        return 'text-red';
    }

    /**
     * Format exact positions list for table cell
     * @param {Array} positions - Array of position objects
     * @returns {string} HTML string
     */
    function formatExactList(positions) {
        if (positions.length === 0) return '<span class="text-black">--</span>';
        const formatted = positions.map(p => formatExactPosition(p)).join('; ');
        return `<span class="text-black">${formatted}</span>`;
    }

    /**
     * Format overfit positions list for table cell
     * @param {Array} positions - Array of position objects
     * @param {number} idealDist - Ideal center distance
     * @returns {string} HTML string
     */
    function formatOverfitList(positions, idealDist) {
        if (positions.length === 0) return '<span class="text-black">--</span>';
        return positions.map(pos => {
            const colorClass = getOverfitColorClass(pos.dist, idealDist);
            return `<span class="${colorClass}">${formatPositionWithDist(pos)}</span>`;
        }).join('; ');
    }

    /**
     * Format underfit positions list for table cell
     * @param {Array} positions - Array of position objects
     * @returns {string} HTML string
     */
    function formatUnderfitList(positions) {
        if (positions.length === 0) return '<span class="text-black">--</span>';
        const formatted = positions.map(p => formatPositionWithDist(p)).join('; ');
        return `<span class="text-red">${formatted}</span>`;
    }

    /**
     * Calculate all gear coupling combinations
     * @param {Array} selectedTeeth - Array of selected teeth values
     * @param {number} maxOverfit - Maximum overfit tolerance
     * @param {number} maxUnderfit - Maximum underfit tolerance
     * @returns {Array} Array of result objects
     */
    function calculateGearCouplings(selectedTeeth, maxOverfit, maxUnderfit) {
        const results = [];
        
        for (const gearA of selectedTeeth) {
            for (const gearB of selectedTeeth) {
                // Skip worm gears as follower (Gear B)
                if (isWormGear(gearB)) continue;
                
                const dist = calculateCenterDistance(gearA, gearB);
                const ratio = calculateGearRatio(gearA, gearB);
                const positions = findMountingPositions(dist, maxOverfit, maxUnderfit);
                
                results.push({
                    gearA: gearA,
                    gearB: gearB,
                    ratio: ratio,
                    dist: dist,
                    exact: positions.exact,
                    overfit: positions.overfit,
                    underfit: positions.underfit
                });
            }
        }
        
        // Sort by Gear A (numeric), then Gear B
        results.sort((a, b) => {
            const sortA = getGearSortValue(a.gearA);
            const sortB = getGearSortValue(b.gearA);
            if (sortA !== sortB) return sortA - sortB;
            return a.gearB - b.gearB;
        });
        
        return results;
    }

    /**
     * Create the UI controls
     * @param {HTMLElement} container - The module container
     * @param {Function} onCalculate - Callback when calculate button is clicked
     */
    function createControls(container, onCalculate) {
        const controls = document.createElement('div');
        controls.className = 'controls-section';
        
        // Gear Teeth Selection
        const teethGroup = document.createElement('div');
        teethGroup.className = 'control-group';
        teethGroup.style.flex = '1 1 100%';
        
        const teethLabel = document.createElement('label');
        teethLabel.textContent = 'Gear Teeth Selection';
        teethGroup.appendChild(teethLabel);
        
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.display = 'flex';
        checkboxContainer.style.flexWrap = 'wrap';
        checkboxContainer.style.gap = '0.75rem';
        checkboxContainer.style.marginTop = '0.5rem';
        
        STANDARD_TEETH.forEach(tooth => {
            const label = document.createElement('label');
            label.style.display = 'inline-flex';
            label.style.alignItems = 'center';
            label.style.gap = '0.25rem';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `gear-tooth-${tooth.value}`;
            checkbox.value = tooth.value;
            checkbox.checked = DEFAULT_CHECKED.includes(tooth.value);
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(tooth.label));
            checkboxContainer.appendChild(label);
        });
        
        // Custom input
        const customLabel = document.createElement('label');
        customLabel.style.display = 'inline-flex';
        customLabel.style.alignItems = 'center';
        customLabel.style.gap = '0.25rem';
        
        const customText = document.createElement('span');
        customText.textContent = 'Custom:';
        customLabel.appendChild(customText);
        
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.id = 'gear-custom-teeth';
        customInput.placeholder = 'e.g., 56';
        customInput.style.width = '80px';
        customInput.style.marginLeft = '0.25rem';
        customLabel.appendChild(customInput);
        
        checkboxContainer.appendChild(customLabel);
        teethGroup.appendChild(checkboxContainer);
        controls.appendChild(teethGroup);
        
        // Max Overfit Distance
        const overfitGroup = document.createElement('div');
        overfitGroup.className = 'control-group';
        
        const overfitLabel = document.createElement('label');
        overfitLabel.htmlFor = 'gear-max-overfit';
        overfitLabel.textContent = 'Max Overfit Distance (studs)';
        overfitGroup.appendChild(overfitLabel);
        
        const overfitInput = document.createElement('input');
        overfitInput.type = 'number';
        overfitInput.id = 'gear-max-overfit';
        overfitInput.value = '0.2';
        overfitInput.min = '0';
        overfitInput.max = '1';
        overfitInput.step = '0.01';
        overfitGroup.appendChild(overfitInput);
        controls.appendChild(overfitGroup);
        
        // Max Underfit Distance
        const underfitGroup = document.createElement('div');
        underfitGroup.className = 'control-group';
        
        const underfitLabel = document.createElement('label');
        underfitLabel.htmlFor = 'gear-max-underfit';
        underfitLabel.textContent = 'Max Underfit Distance (studs)';
        underfitGroup.appendChild(underfitLabel);
        
        const underfitInput = document.createElement('input');
        underfitInput.type = 'number';
        underfitInput.id = 'gear-max-underfit';
        underfitInput.value = '0.1';
        underfitInput.min = '0';
        underfitInput.max = '1';
        underfitInput.step = '0.01';
        underfitGroup.appendChild(underfitInput);
        controls.appendChild(underfitGroup);
        
        // Calculate Button
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'control-group';
        buttonGroup.style.justifyContent = 'flex-end';
        buttonGroup.style.alignSelf = 'flex-end';
        
        const calcButton = document.createElement('button');
        calcButton.id = 'gear-calculate';
        calcButton.className = 'btn btn-primary';
        calcButton.textContent = 'Calculate';
        calcButton.addEventListener('click', onCalculate);
        buttonGroup.appendChild(calcButton);
        controls.appendChild(buttonGroup);
        
        container.appendChild(controls);
    }

    /**
     * Get selected teeth values from UI
     * @returns {Array} Array of selected teeth values
     */
    function getSelectedTeeth() {
        const selected = [];
        
        STANDARD_TEETH.forEach(tooth => {
            const checkbox = document.getElementById(`gear-tooth-${tooth.value}`);
            if (checkbox && checkbox.checked) {
                selected.push(tooth.value);
            }
        });
        
        // Parse custom input
        const customInput = document.getElementById('gear-custom-teeth');
        if (customInput && customInput.value.trim()) {
            const customValues = customInput.value.split(',').map(v => v.trim());
            customValues.forEach(v => {
                const num = parseInt(v, 10);
                if (!isNaN(num) && num > 0 && !selected.includes(num)) {
                    selected.push(num);
                }
            });
        }
        
        return selected;
    }

    /**
     * Create and configure the data table
     * @param {HTMLElement} container - Container element
     * @returns {DataTable} The configured table instance
     */
    function createDataTable(container) {
        // Create table container div
        const tableContainer = document.createElement('div');
        tableContainer.id = 'gear-couplings-table';
        container.appendChild(tableContainer);
        
        const columns = [
            {
                key: 'gearA',
                label: 'A',
                type: 'text'
            },
            {
                key: 'gearB',
                label: 'B',
                type: 'number'
            },
            {
                key: 'ratio',
                label: 'Ratio',
                type: 'number',
                formatter: (value) => value.toFixed(2)
            },
            {
                key: 'dist',
                label: 'Dist',
                type: 'number',
                formatter: (value) => value.toFixed(3)
            },
            {
                key: 'exact',
                label: 'Exact',
                type: 'text',
                formatter: (value) => formatExactList(value)
            },
            {
                key: 'overfit',
                label: 'Overfit',
                type: 'text',
                formatter: (value, row) => formatOverfitList(value, row.dist)
            },
            {
                key: 'underfit',
                label: 'Underfit',
                type: 'text',
                formatter: (value) => formatUnderfitList(value)
            }
        ];
        
        const table = new DataTable('gear-couplings-table', columns);
        return table;
    }

    /**
     * Initialize the gears module
     */
    function init() {
        const container = document.getElementById('gears-module');
        if (!container) {
            console.error('Gears module container not found');
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Create module header
        const header = document.createElement('div');
        header.className = 'module-header';
        header.innerHTML = `
            <h2>Gear Couplings Calculator</h2>
            <p>Calculate all possible gear coupling configurations between two Technic Brick gears, 
            showing exact, overfit, and underfit mounting positions.</p>
        `;
        container.appendChild(header);

        // Variable to hold the table reference
        let dataTable = null;

        // Create controls with calculate callback
        createControls(container, function() {
            const selectedTeeth = getSelectedTeeth();
            
            if (selectedTeeth.length === 0) {
                alert('Please select at least one gear tooth count.');
                return;
            }
            
            const maxOverfit = parseFloat(document.getElementById('gear-max-overfit').value) || 0.2;
            const maxUnderfit = parseFloat(document.getElementById('gear-max-underfit').value) || 0.1;
            
            const results = calculateGearCouplings(selectedTeeth, maxOverfit, maxUnderfit);
            
            // Create table if it doesn't exist
            if (!dataTable) {
                dataTable = createDataTable(container);
            }
            
            dataTable.setData(results);
            dataTable.render();
        });

        // Create initial empty table
        dataTable = createDataTable(container);
        dataTable.setData([]);
        dataTable.render();
    }

    // Register the module
    TechnicTools.registerModule('gears-module', 'Gear Couplings', init);
})();
