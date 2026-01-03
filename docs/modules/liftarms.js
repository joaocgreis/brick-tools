/**
 * Liftarms Module - Two Liftarm Dimensions Calculator
 * Calculates all positions reachable by two connected liftarms.
 * Liftarm A starts at origin (0,0), connects to Liftarm B at point I (intersection),
 * and Liftarm B ends at point T (target).
 */
(function () {
    'use strict';

    /**
     * Point class for geometric calculations
     */
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        /**
         * Calculate distance to another point
         * @param {Point} other - The other point
         * @returns {number} Distance between points
         */
        distanceTo(other) {
            return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
        }

        /**
         * Find intersection points of two circles
         * Circle 1: centered at this point with radius r0
         * Circle 2: centered at other point with radius r1
         * @param {number} r0 - Radius of circle centered at this point
         * @param {Point} other - Center of second circle
         * @param {number} r1 - Radius of second circle
         * @returns {Point[]} Array of 0, 1, or 2 intersection points
         */
        circleIntersections(r0, other, r1) {
            const d = this.distanceTo(other);

            // No solution cases
            if (d > r0 + r1 || d < Math.abs(r0 - r1) || d === 0) {
                return [];
            }

            const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
            const h2 = r0 * r0 - a * a;
            if (h2 < 0) return [];
            const h = Math.sqrt(h2);

            // Point on line between centers
            const px = this.x + a * (other.x - this.x) / d;
            const py = this.y + a * (other.y - this.y) / d;

            // Offset perpendicular to line
            const rx = -(other.y - this.y) * h / d;
            const ry = (other.x - this.x) * h / d;

            if (h === 0) {
                return [new Point(px, py)];
            }
            return [new Point(px + rx, py + ry), new Point(px - rx, py - ry)];
        }
    }

    /**
     * Format a number to specified decimal places
     * @param {number} value - The value to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted number string
     */
    function formatNumber(value, decimals) {
        return value.toFixed(decimals);
    }

    /**
     * Calculate angle (in degrees) at `vertex` between vectors (vertex - pointA) and (pointB - vertex).
     * Returns 0 if either vector has (near) zero length to avoid NaN.
     * @param {Point} vertex - Point where angle is measured
     * @param {Point} pointA - First point (forms vector from vertex to pointA)
     * @param {Point} pointB - Second point (forms vector from vertex to pointB)
     * @returns {number} Angle in degrees between the two vectors
     */
    function angleAt(vertex, pointA, pointB) {
        // v1 = pointA - vertex
        const v1x = pointA.x - vertex.x;
        const v1y = pointA.y - vertex.y;
        // v2 = pointB - vertex
        const v2x = pointB.x - vertex.x;
        const v2y = pointB.y - vertex.y;

        const norm1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const norm2 = Math.sqrt(v2x * v2x + v2y * v2y);

        // Avoid division by zero / invalid acos
        if (norm1 < 1e-12 || norm2 < 1e-12) {
            return 0;
        }

        const dot = v1x * v2x + v1y * v2y;
        let cosAngle = dot / (norm1 * norm2);
        cosAngle = Math.max(-1, Math.min(1, cosAngle));
        return Math.acos(cosAngle) * 180 / Math.PI;
    }

    /**
     * Create a unique key for deduplication
     * @param {number} sx - S.x coordinate
     * @param {number} sy - S.y coordinate
     * @param {number} aLen - Liftarm A length
     * @param {number} bLen - Liftarm B length
     * @returns {string} Unique key
     */
    function createKey(sx, sy, aLen, bLen) {
        return `${formatNumber(sx, 3)}_${formatNumber(sy, 3)}_${aLen}_${bLen}`;
    }

    /**
     * Calculate all liftarm positions
     * @param {number} maxA - Maximum length of liftarm A
     * @param {number} maxB - Maximum length of liftarm B
     * @param {boolean} halfStuds - Whether to include half stud positions
     * @returns {Object[]} Array of result objects
     */
    function calculatePositions(maxA, maxB, halfStuds) {
        const results = [];
        const seen = new Set();
        const origin = new Point(0, 0);
        const step = halfStuds ? 0.5 : 1;

        // Reasonable max for Tx based on max reachable distance
        const maxReach = maxA + maxB;

        for (let tx = -maxReach; tx <= maxReach; tx += step) {
            let foundAnyForTx = false;

            for (let ty = -maxReach; ty <= maxReach; ty += step) {
                const T = new Point(tx, ty);
                let foundAny = false;

                for (let aLen = 1; aLen <= maxA; aLen += step) {
                    for (let bLen = 0; bLen <= maxB; bLen += step) {
                        const intersections = origin.circleIntersections(aLen, T, bLen);

                        if (intersections.length > 0) {
                            foundAny = true;
                            foundAnyForTx = true;

                            for (const I of intersections) {
                                // // Only consider I points in first quadrant with Iy <= Ix
                                // // Using small tolerance for floating point comparison
                                // if (I.x < -0.001 || I.y < -0.001 || I.y > I.x + 0.001) {
                                //     continue;
                                // }
                                if (I.x < 0 || I.y < 0) {
                                    continue;
                                }

                                // For each stud position S on liftarm A (1 to aLen)
                                for (let sNum = step; sNum <= aLen; sNum += step) {
                                    // S is at distance sNum from origin along line to I
                                    const ratio = sNum / aLen;
                                    const S = new Point(I.x * ratio, I.y * ratio);

                                    // // Create key for deduplication
                                    // const key = createKey(S.x, S.y, aLen, bLen);
                                    // if (seen.has(key)) {
                                    //     continue;
                                    // }
                                    // seen.add(key);

                                    // Calculate angles
                                    const angleA = Math.atan2(I.y, I.x) * 180 / Math.PI;
                                    // Angle of liftarm B (from I to T)
                                    const angleB = Math.atan2(T.y - I.y, T.x - I.x) * 180 / Math.PI;
                                    // Angle of liftarm C (from origin to T)
                                    const angleC = Math.atan2(T.y, T.x) * 180 / Math.PI;

                                    // Triangle corner angles
                                    const angleAB = angleAt(I, origin, T);
                                    const angleAC = angleAt(origin, I, T);
                                    const angleBC = angleAt(T, origin, I);

                                    results.push({
                                        sx: parseFloat(formatNumber(S.x, 3)),
                                        sy: parseFloat(formatNumber(S.y, 3)),
                                        sNum: sNum,
                                        aLen: aLen,
                                        bLen: bLen,
                                        // C is defined from origin to T
                                        cLen: parseFloat(formatNumber(origin.distanceTo(T), 3)),
                                        tx: parseFloat(formatNumber(T.x, 3)),
                                        ty: parseFloat(formatNumber(T.y, 3)),
                                        ix: parseFloat(formatNumber(I.x, 3)),
                                        iy: parseFloat(formatNumber(I.y, 3)),
                                        angleA: parseFloat(formatNumber(angleA, 1)),
                                        angleB: parseFloat(formatNumber(angleB, 1)),
                                        angleC: parseFloat(formatNumber(angleC, 1)),
                                        angleAB: parseFloat(formatNumber(angleAB, 1)),
                                        angleAC: parseFloat(formatNumber(angleAC, 1)),
                                        angleBC: parseFloat(formatNumber(angleBC, 1))
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // If no intersections found for any A,B combo at this Tx, stop
            if (!foundAnyForTx && tx > 0) {
                break;
            }
        }

        // Sort results by default: Sx, Sy, aLen, bLen
        results.sort((a, b) => {
            if (a.sx !== b.sx) return a.sx - b.sx;
            if (a.sy !== b.sy) return a.sy - b.sy;
            if (a.aLen !== b.aLen) return a.aLen - b.aLen;
            return a.bLen - b.bLen;
        });

        return results;
    }

    /**
     * Create filter presets for the table
     * @returns {Object[]} Array of preset objects
     */
    function createPresets() {
        const tolerance = 0.001;

        return [
            {
                name: 'All Results',
                filters: {}
            },
            {
                name: 'Hypotenuses',
                // Iy = 0 AND Tx = Ix (liftarm A horizontal, liftarm B vertical)
                filterFn: (row) => {
                    return Math.abs(row.iy) < tolerance &&
                        Math.abs(row.tx - row.ix) < tolerance;
                }
            },
            {
                name: 'Catheti',
                // Ix = Tx AND Ty = 0 (liftarm B vertical from T on x-axis)
                filterFn: (row) => {
                    return Math.abs(row.ix - row.tx) < tolerance &&
                        Math.abs(row.ty) < tolerance;
                }
            },
            {
                name: '90 Degrees',
                // minAngle = 90 (perpendicular liftarms)
                filterFn: (row) => {
                    return Math.abs(row.minAngle - 90) < tolerance;
                }
            }
        ];
    }

    /**
     * Initialize the liftarms module
     */
    function init() {
        const container = document.getElementById('liftarms-module');
        if (!container) {
            console.error('Liftarms module container not found');
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Create module header
        const header = document.createElement('div');
        header.className = 'module-header';
        header.innerHTML = `
            <h2>Two Liftarm Dimensions Calculator</h2>
            <p>Calculate all positions reachable by two connected liftarms. Liftarm A starts at origin (0,0),
            connects to Liftarm B at point I (intersection), and Liftarm B ends at point T (target).</p>
        `;
        container.appendChild(header);

        // Create controls section
        const controls = document.createElement('div');
        controls.className = 'controls-section';

        // Max Liftarm A Length control
        const maxAGroup = document.createElement('div');
        maxAGroup.className = 'control-group';
        maxAGroup.innerHTML = `
            <label for="liftarm-max-a">Max Liftarm A Length</label>
            <input type="number" id="liftarm-max-a" value="5" min="1" max="15" step="1">
        `;
        controls.appendChild(maxAGroup);

        // Max Liftarm B Length control
        const maxBGroup = document.createElement('div');
        maxBGroup.className = 'control-group';
        maxBGroup.innerHTML = `
            <label for="liftarm-max-b">Max Liftarm B Length</label>
            <input type="number" id="liftarm-max-b" value="5" min="1" max="15" step="1">
        `;
        controls.appendChild(maxBGroup);

        // Include Half Studs control
        const halfStudsGroup = document.createElement('div');
        halfStudsGroup.className = 'control-group';
        halfStudsGroup.innerHTML = `
            <label>
                <input type="checkbox" id="liftarm-half-studs">
                Include Half Studs
            </label>
        `;
        controls.appendChild(halfStudsGroup);

        // Calculate button
        const calcButtonGroup = document.createElement('div');
        calcButtonGroup.className = 'control-group';
        calcButtonGroup.style.justifyContent = 'flex-end';
        const calcButton = document.createElement('button');
        calcButton.id = 'liftarm-calculate';
        calcButton.className = 'btn btn-primary';
        calcButton.textContent = 'Calculate';
        calcButtonGroup.appendChild(calcButton);
        controls.appendChild(calcButtonGroup);

        // Preset dropdown control
        const presetGroup = document.createElement('div');
        presetGroup.className = 'control-group';
        presetGroup.innerHTML = `
            <label for="liftarm-preset">Filter Preset</label>
            <select id="liftarm-preset">
                <option value="0">All Results</option>
                <option value="1">Hypotenuses</option>
                <option value="2">Catheti</option>
                <option value="3">90 Degrees</option>
            </select>
        `;
        controls.appendChild(presetGroup);

        container.appendChild(controls);

        // Create table container
        const tableContainer = document.createElement('div');
        tableContainer.id = 'liftarms-table-container';
        container.appendChild(tableContainer);

        // Define table columns
        const columns = [
            { key: 'sx', label: 'Stud.x', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'sy', label: 'Stud.y', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'sNum', label: 'Stud # (in A)', type: 'number' },
            { key: 'aLen', label: 'A Length', type: 'number' },
            { key: 'bLen', label: 'B Length', type: 'number' },
            { key: 'cLen', label: 'C Length', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'tx', label: 'Target.x', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'ty', label: 'Target.y', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'ix', label: 'Intersection.x', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'iy', label: 'Intersection.y', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'angleA', label: '∠A° (to x-axis)', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'angleB', label: '∠B° (to x-axis)', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'angleC', label: '∠C° (to x-axis)', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'angleAB', label: '∠AB° (at I)', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'angleAC', label: '∠AC° (at 0)', type: 'number', formatter: (v) => formatNumber(v, 3) },
            { key: 'angleBC', label: '∠BC° (at T)', type: 'number', formatter: (v) => formatNumber(v, 3) }
        ];

        // Create DataTable instance
        const dataTable = new DataTable('liftarms-table-container', columns);

        // Store all results and presets for filtering
        let allResults = [];
        const presets = createPresets();

        /**
         * Apply preset filter to data
         * @param {number} presetIndex - Index of the preset to apply
         */
        function applyPreset(presetIndex) {
            const preset = presets[presetIndex];
            if (!preset) return;

            if (preset.filterFn) {
                const filteredData = allResults.filter(preset.filterFn);
                dataTable.setData(filteredData);
            } else {
                dataTable.setData(allResults);
            }
            dataTable.render();
        }

        // Calculate button click handler
        calcButton.addEventListener('click', () => {
            const maxA = parseInt(document.getElementById('liftarm-max-a').value) || 5;
            const maxB = parseInt(document.getElementById('liftarm-max-b').value) || 5;
            const halfStuds = document.getElementById('liftarm-half-studs').checked;

            // Clamp values
            const clampedMaxA = Math.max(1, Math.min(15, maxA));
            const clampedMaxB = Math.max(1, Math.min(15, maxB));

            // Update inputs if clamped
            document.getElementById('liftarm-max-a').value = clampedMaxA;
            document.getElementById('liftarm-max-b').value = clampedMaxB;

            // Calculate positions
            allResults = calculatePositions(clampedMaxA, clampedMaxB, halfStuds);

            // Reset preset to "All Results"
            document.getElementById('liftarm-preset').value = '0';

            // Update table
            dataTable.setData(allResults);
            dataTable.render();
        });

        // Preset dropdown change handler
        document.getElementById('liftarm-preset').addEventListener('change', (e) => {
            const presetIndex = parseInt(e.target.value);
            applyPreset(presetIndex);
        });

        // Initial render with empty data
        dataTable.setData([]);
        dataTable.render();
    }

    // Register the module
    TechnicTools.registerModule('liftarms-module', 'Two Liftarm Dimensions', init);
})();
