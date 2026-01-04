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
     * Convert array of objects to CSV string
     * @param {Object[]} data - Array of data objects
     * @param {Object[]} columns - Column definitions with key, label, formatter
     * @returns {string} CSV formatted string
     */
    function arrayToCSV(data, columns) {
        if (data.length === 0) return '';
        const headers = columns.map(col => col.label);
        const csvRows = [headers.join(',')];
        for (const row of data) {
            const values = columns.map(col => {
                const val = row[col.key];
                const formatted = col.formatter ? col.formatter(val) : val;
                if (typeof formatted === 'string' && formatted.includes(',')) {
                    return `"${formatted}"`;
                }
                return formatted;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    }

    /**
     * Download CSV data as file
     * @param {string} csv - CSV content
     * @param {string} filename - Name of the file to download
     */
    function downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
     * Calculate all liftarm positions
     * @param {boolean} halfStuds - Whether to include half stud positions
     * @param {boolean} removeLarger - Whether to remove larger liftarm combinations
     * @param {boolean} removeYGreaterX - Whether to remove positions where y > x
     * @param {number} minA - Minimum length of liftarm A
     * @param {number} maxA - Maximum length of liftarm A
     * @param {number} minB - Minimum length of liftarm B
     * @param {number} maxB - Maximum length of liftarm B
     * @param {number} minDecimal - Minimum decimal part for sx and sy
     * @param {number} maxDecimal - Maximum decimal part for sx and sy
     * @param {boolean} includeComplementaryDecimal - Whether to also include positions where the decimal parts fall in the complementary range [1-maxDecimal, 1-minDecimal]
     * @returns {Object[]} Array of result objects
     */
    function calculatePositions(halfStuds, removeLarger, removeYGreaterX, minA, maxA, minB, maxB, minDecimal, maxDecimal, includeComplementaryDecimal) {
        const results = [];
        const minLenSum = new Map();
        const origin = new Point(0, 0);
        const step = halfStuds ? 0.5 : 1;

        // Reasonable max for Tx based on max reachable distance
        const maxReach = maxA + maxB;

        for (let tx = -maxReach; tx <= maxReach; tx += step) {
            let foundAnyForTx = false;

            for (let ty = -maxReach; ty <= maxReach; ty += step) {
                const T = new Point(tx, ty);
                let foundAny = false;

                for (let aLen = minA; aLen <= maxA; aLen += step) {
                    for (let bLen = minB; bLen <= maxB; bLen += step) {
                        const intersections = origin.circleIntersections(aLen, T, bLen);

                        if (intersections.length > 0) {
                            foundAny = true;
                            foundAnyForTx = true;

                            for (const I of intersections) {
                                // // Only consider I points in first quadrant
                                if (I.x < 0 || I.y < 0) {
                                    continue;
                                }
                                // Filter out positions where y > x if option is enabled
                                if (removeYGreaterX && I.y > I.x) {
                                    continue;
                                }

                                // For each stud position S on liftarm A (1 to aLen)
                                for (let sNum = step; sNum <= aLen; sNum += step) {
                                    // S is at distance sNum from origin along line to I
                                    const ratio = sNum / aLen;
                                    const S = new Point(I.x * ratio, I.y * ratio);

                                    // Filter by decimal part of sx and sy
                                    const sxDecimal = S.x % 1;
                                    const syDecimal = S.y % 1;
                                    if ((sxDecimal < minDecimal || sxDecimal > maxDecimal) &&
                                        (syDecimal < minDecimal || syDecimal > maxDecimal)) {
                                        if (!includeComplementaryDecimal) {
                                            continue;
                                        }
                                        if ((sxDecimal < (1 - maxDecimal) || sxDecimal > (1 - minDecimal)) &&
                                            (syDecimal < (1 - maxDecimal) || syDecimal > (1 - minDecimal))) {
                                            continue;
                                        }
                                    }

                                    // Filter out larger liftarms if option is enabled
                                    const keyRemoveLarger = `${formatNumber(S.x, 3)}_${formatNumber(S.y, 3)}`;
                                    if (removeLarger) {
                                        const thisVal = aLen + bLen;
                                        if (minLenSum.has(keyRemoveLarger) && (thisVal >= minLenSum.get(keyRemoveLarger) + 0.001))
                                            continue;
                                        minLenSum.set(keyRemoveLarger, thisVal);
                                    }

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
                                        angleBC: parseFloat(formatNumber(angleBC, 1)),
                                        keyRemoveLarger
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

        // Filter out larger liftarms if option is enabled
        if (removeLarger) {
            for (let i = 0; i < results.length;) {
                const row = results[i];
                const lenSum = row.aLen + row.bLen;
                if (lenSum >= minLenSum.get(row.keyRemoveLarger) + 0.001)
                    results.splice(i, 1);
                else
                    i++;
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

        // Min Liftarm A Length control
        const minAGroup = document.createElement('div');
        minAGroup.className = 'control-group';
        minAGroup.innerHTML = `
            <label for="liftarm-min-a">Min Liftarm A Length</label>
            <input type="number" id="liftarm-min-a" value="1" min="1" max="15" step="1">
        `;
        controls.appendChild(minAGroup);

        // Max Liftarm A Length control
        const maxAGroup = document.createElement('div');
        maxAGroup.className = 'control-group';
        maxAGroup.innerHTML = `
            <label for="liftarm-max-a">Max Liftarm A Length</label>
            <input type="number" id="liftarm-max-a" value="4" min="1" max="15" step="1">
        `;
        controls.appendChild(maxAGroup);

        // Min Liftarm B Length control
        const minBGroup = document.createElement('div');
        minBGroup.className = 'control-group';
        minBGroup.innerHTML = `
            <label for="liftarm-min-b">Min Liftarm B Length</label>
            <input type="number" id="liftarm-min-b" value="0" min="0" max="15" step="1">
        `;
        controls.appendChild(minBGroup);

        // Max Liftarm B Length control
        const maxBGroup = document.createElement('div');
        maxBGroup.className = 'control-group';
        maxBGroup.innerHTML = `
            <label for="liftarm-max-b">Max Liftarm B Length</label>
            <input type="number" id="liftarm-max-b" value="4" min="0" max="15" step="1">
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

        // Min Decimal control
        const minDecimalGroup = document.createElement('div');
        minDecimalGroup.className = 'control-group';
        minDecimalGroup.innerHTML = `
            <label for="liftarm-min-decimal">Min Decimal</label>
            <input type="number" id="liftarm-min-decimal" value="0.000" min="0.000" max="1.000" step="0.001">
        `;
        controls.appendChild(minDecimalGroup);

        // Max Decimal control
        const maxDecimalGroup = document.createElement('div');
        maxDecimalGroup.className = 'control-group';
        maxDecimalGroup.innerHTML = `
            <label for="liftarm-max-decimal">Max Decimal</label>
            <input type="number" id="liftarm-max-decimal" value="1.000" min="0.000" max="1.000" step="0.001">
        `;
        controls.appendChild(maxDecimalGroup);

        // Include Complementary Decimal control
        const complementaryDecimalGroup = document.createElement('div');
        complementaryDecimalGroup.className = 'control-group';
        complementaryDecimalGroup.innerHTML = `
            <label>
                <input type="checkbox" id="liftarm-include-complementary-decimal">
                Include Complementary Decimal
            </label>
        `;
        controls.appendChild(complementaryDecimalGroup);

        // Remove Larger Liftarms control
        const removeLargerGroup = document.createElement('div');
        removeLargerGroup.className = 'control-group';
        removeLargerGroup.innerHTML = `
            <label>
                <input type="checkbox" id="liftarm-remove-larger" checked>
                Remove Larger Liftarms
            </label>
        `;
        controls.appendChild(removeLargerGroup);

        // Remove y > x control
        const removeYGreaterXGroup = document.createElement('div');
        removeYGreaterXGroup.className = 'control-group';
        removeYGreaterXGroup.innerHTML = `
            <label>
                <input type="checkbox" id="liftarm-remove-y-greater-x" checked>
                Remove y > x
            </label>
        `;
        controls.appendChild(removeYGreaterXGroup);

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

        // Download CSV button
        const downloadCsvButtonGroup = document.createElement('div');
        downloadCsvButtonGroup.className = 'control-group';
        downloadCsvButtonGroup.style.justifyContent = 'flex-end';
        const downloadButton = document.createElement('button');
        downloadButton.id = 'liftarm-download-csv';
        downloadButton.className = 'btn btn-secondary';
        downloadButton.textContent = 'Download CSV';
        downloadCsvButtonGroup.appendChild(downloadButton);
        controls.appendChild(downloadCsvButtonGroup);

        // Preset dropdown control (disabled/commented out)
        // const presetGroup = document.createElement('div');
        // presetGroup.className = 'control-group';
        // presetGroup.innerHTML = `
        //     <label for="liftarm-preset">Filter Preset</label>
        //     <select id="liftarm-preset">
        //         <option value="0">All Results</option>
        //         <option value="1">Hypotenuses</option>
        //         <option value="2">Catheti</option>
        //         <option value="3">90 Degrees</option>
        //     </select>
        // `;
        // controls.appendChild(presetGroup);

        container.appendChild(controls);

        // Create table container
        const tableContainer = document.createElement('div');
        tableContainer.id = 'liftarms-table-container';
        container.appendChild(tableContainer);

        // Define table columns
        const format3Dec = (v) => formatNumber(v, 3);
        const formatStuds = (v) => {
            const half = document.getElementById('liftarm-half-studs')?.checked;
            return formatNumber(v, half ? 1 : 0);
        };
        const columns = [
            { key: 'sx', label: 'Stud.x', type: 'number', formatter: format3Dec },
            { key: 'sy', label: 'Stud.y', type: 'number', formatter: format3Dec },
            { key: 'sNum', label: 'Stud # (in A)', type: 'number', formatter: formatStuds },
            { key: 'aLen', label: 'A Length', type: 'number', formatter: formatStuds },
            { key: 'bLen', label: 'B Length', type: 'number', formatter: formatStuds },
            { key: 'cLen', label: 'C Length', type: 'number', formatter: format3Dec },
            { key: 'tx', label: 'Target.x', type: 'number', formatter: format3Dec },
            { key: 'ty', label: 'Target.y', type: 'number', formatter: format3Dec },
            { key: 'ix', label: 'Intersection.x', type: 'number', formatter: format3Dec },
            { key: 'iy', label: 'Intersection.y', type: 'number', formatter: format3Dec },
            { key: 'angleA', label: '∠A° (to x-axis)', type: 'number', formatter: format3Dec },
            { key: 'angleB', label: '∠B° (to x-axis)', type: 'number', formatter: format3Dec },
            { key: 'angleC', label: '∠C° (to x-axis)', type: 'number', formatter: format3Dec },
            { key: 'angleAB', label: '∠AB° (at I)', type: 'number', formatter: format3Dec },
            { key: 'angleAC', label: '∠AC° (at 0)', type: 'number', formatter: format3Dec },
            { key: 'angleBC', label: '∠BC° (at T)', type: 'number', formatter: format3Dec }
        ];

        // Create DataTable instance
        const dataTable = new DataTable('liftarms-table-container', columns);

        // Store all results and presets for filtering
        let allResults = [];
        // Presets creation disabled for now. Use createPresets() if re-enabling filter presets.
        // const presets = createPresets();

        /**
         * Apply preset filter to data
         * @param {number} presetIndex - Index of the preset to apply
         */
        // applyPreset disabled while presets are commented out
        // function applyPreset(presetIndex) {
        //     const preset = presets[presetIndex];
        //     if (!preset) return;
        //
        //     if (preset.filterFn) {
        //         const filteredData = allResults.filter(preset.filterFn);
        //         dataTable.setData(filteredData);
        //     } else {
        //         dataTable.setData(allResults);
        //     }
        //     dataTable.render();
        // }

        // Calculate button click handler
        calcButton.addEventListener('click', () => {
            const rawMinA = parseFloat(document.getElementById('liftarm-min-a').value);
            const rawMinB = parseFloat(document.getElementById('liftarm-min-b').value);
            const rawMaxA = parseFloat(document.getElementById('liftarm-max-a').value);
            const rawMaxB = parseFloat(document.getElementById('liftarm-max-b').value);
            const rawMinDecimal = parseFloat(document.getElementById('liftarm-min-decimal').value);
            const rawMaxDecimal = parseFloat(document.getElementById('liftarm-max-decimal').value);

            // Step used in calculations (preserve .5 when half studs enabled)
            const halfStuds = document.getElementById('liftarm-half-studs').checked;
            const step = halfStuds ? 0.5 : 1;

            // Fallback to defaults if input is empty/invalid
            const safeMinA = isNaN(rawMinA) ? 1 : rawMinA;
            const safeMinB = isNaN(rawMinB) ? 0 : rawMinB;
            const safeMaxA = isNaN(rawMaxA) ? 4 : rawMaxA;
            const safeMaxB = isNaN(rawMaxB) ? 4 : rawMaxB;
            const safeMinDecimal = isNaN(rawMinDecimal) ? 0 : rawMinDecimal;
            const safeMaxDecimal = isNaN(rawMaxDecimal) ? 1 : rawMaxDecimal;

            // Snap functions: max values snap down, min values snap up to nearest step
            const snapDown = (v) => Math.floor(v / step) * step;
            const clampedMaxA = Math.max(1, Math.min(15, snapDown(safeMaxA)));
            const clampedMaxB = Math.max(0, Math.min(15, snapDown(safeMaxB)));
            const snapUp = (v) => Math.ceil(v / step) * step;
            const clampedMinA = Math.max(1, Math.min(15, snapUp(safeMinA)));
            const clampedMinB = Math.max(0, Math.min(15, snapUp(safeMinB)));
            const clampedMinDecimal = Math.max(0, Math.min(1, safeMinDecimal));
            const clampedMaxDecimal = Math.max(0, Math.min(1, safeMaxDecimal));

            // Ensure min <= max; if not, make min not greater than max
            let finalMinA = clampedMinA;
            let finalMinB = clampedMinB;
            let finalMaxA = clampedMaxA;
            let finalMaxB = clampedMaxB;
            let finalMinDecimal = clampedMinDecimal;
            let finalMaxDecimal = clampedMaxDecimal;
            if (finalMinA > finalMaxA) {
                finalMinA = finalMaxA;
            }
            if (finalMinB > finalMaxB) {
                finalMinB = finalMaxB;
            }
            if (finalMinDecimal > finalMaxDecimal) {
                finalMinDecimal = finalMaxDecimal;
            }

            // Write back with appropriate decimals (0 or 1)
            const decimals = (step % 1 === 0) ? 0 : 1;
            document.getElementById('liftarm-min-a').value = formatNumber(finalMinA, decimals);
            document.getElementById('liftarm-min-b').value = formatNumber(finalMinB, decimals);
            document.getElementById('liftarm-max-a').value = formatNumber(finalMaxA, decimals);
            document.getElementById('liftarm-max-b').value = formatNumber(finalMaxB, decimals);
            document.getElementById('liftarm-min-decimal').value = formatNumber(finalMinDecimal, 3);
            document.getElementById('liftarm-max-decimal').value = formatNumber(finalMaxDecimal, 3);

            // Calculate positions using min/max bounds
            const removeLarger = document.getElementById('liftarm-remove-larger').checked;
            const removeYGreaterX = document.getElementById('liftarm-remove-y-greater-x').checked;
            const includeComplementaryDecimal = document.getElementById('liftarm-include-complementary-decimal').checked;
            allResults = calculatePositions(halfStuds, removeLarger, removeYGreaterX, finalMinA, finalMaxA, finalMinB, finalMaxB, finalMinDecimal, finalMaxDecimal, includeComplementaryDecimal);

            // Preset UI disabled: skip resetting preset dropdown
            // document.getElementById('liftarm-preset').value = '0';

            // Update table
            dataTable.setData(allResults);
            dataTable.render();
        });

        // Download CSV button click handler
        downloadButton.addEventListener('click', () => {
            if (allResults.length === 0) {
                alert('No data to download. Please calculate first.');
                return;
            }
            const csv = arrayToCSV(allResults, columns);
            downloadCSV(csv, 'liftarms.csv');
        });

        // Preset dropdown change handler disabled while presets are commented out
        // document.getElementById('liftarm-preset').addEventListener('change', (e) => {
        //     const presetIndex = parseInt(e.target.value);
        //     applyPreset(presetIndex);
        // });

        // Initial render with empty data
        dataTable.setData([]);
        dataTable.render();
    }

    // Register the module
    TechnicTools.registerModule('liftarms-module', 'Two Liftarm Dimensions', init);
})();
