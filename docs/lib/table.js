/**
 * DataTable - Reusable table component with sorting, filtering, and presets
 */
class DataTable {
    /**
     * Create a new DataTable
     * @param {string} containerId - The id of the container element
     * @param {Array} columns - Array of column definitions {key, label, type: 'number'|'text', formatter?}
     */
    constructor(containerId, columns) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.columns = columns;
        this.data = [];
        this.filteredData = [];
        this.presets = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filterValues = {};

        // Initialize filter values
        this.columns.forEach(col => {
            if (col.type === 'number') {
                this.filterValues[col.key] = { min: '', max: '' };
            } else {
                this.filterValues[col.key] = '';
            }
        });
    }

    /**
     * Set the data for the table
     * @param {Array} rows - Array of row objects
     */
    setData(rows) {
        this.data = rows.slice();
        this.applyFilters();
    }

    /**
     * Set presets for the table
     * @param {Array} presets - Array of preset objects {name, filters: {column: value}}
     */
    setPresets(presets) {
        this.presets = presets;
    }

    /**
     * Apply current filters to the data
     */
    applyFilters() {
        this.filteredData = this.data.filter(row => {
            return this.columns.every(col => {
                const value = row[col.key];
                const filter = this.filterValues[col.key];

                if (col.type === 'number') {
                    const numValue = parseFloat(value);
                    if (filter.min !== '' && !isNaN(parseFloat(filter.min))) {
                        if (numValue < parseFloat(filter.min)) return false;
                    }
                    if (filter.max !== '' && !isNaN(parseFloat(filter.max))) {
                        if (numValue > parseFloat(filter.max)) return false;
                    }
                } else {
                    if (filter !== '') {
                        const strValue = String(value).toLowerCase();
                        const filterStr = filter.toLowerCase();
                        if (!strValue.includes(filterStr)) return false;
                    }
                }

                return true;
            });
        });

        if (this.sortColumn !== null) {
            this.applySort(this.sortColumn, this.sortDirection);
        }
    }

    /**
     * Apply sorting to the filtered data
     * @param {string} column - Column key to sort by
     * @param {string} direction - 'asc' or 'desc'
     */
    applySort(column, direction) {
        this.sortColumn = column;
        this.sortDirection = direction;

        const colDef = this.columns.find(c => c.key === column);
        const isNumber = colDef && colDef.type === 'number';

        this.filteredData.sort((a, b) => {
            let valA = a[column];
            let valB = b[column];

            if (isNumber) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }

            let comparison = 0;
            if (valA < valB) comparison = -1;
            if (valA > valB) comparison = 1;

            return direction === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Render the preset dropdown
     * @returns {HTMLElement} The preset dropdown container
     */
    renderPresetDropdown() {
        const container = document.createElement('div');
        container.className = 'preset-container';

        if (this.presets.length === 0) {
            return container;
        }

        const label = document.createElement('span');
        label.className = 'preset-label';
        label.textContent = 'Presets:';
        container.appendChild(label);

        const select = document.createElement('select');
        select.className = 'preset-dropdown';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select a preset --';
        select.appendChild(defaultOption);

        this.presets.forEach((preset, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = preset.name;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            if (e.target.value === '') {
                // Reset filters
                this.columns.forEach(col => {
                    if (col.type === 'number') {
                        this.filterValues[col.key] = { min: '', max: '' };
                    } else {
                        this.filterValues[col.key] = '';
                    }
                });
            } else {
                const preset = this.presets[parseInt(e.target.value)];
                if (preset && preset.filters) {
                    // Reset all filters first
                    this.columns.forEach(col => {
                        if (col.type === 'number') {
                            this.filterValues[col.key] = { min: '', max: '' };
                        } else {
                            this.filterValues[col.key] = '';
                        }
                    });

                    // Apply preset filters
                    Object.keys(preset.filters).forEach(key => {
                        const filterValue = preset.filters[key];
                        if (typeof filterValue === 'object' && (filterValue.min !== undefined || filterValue.max !== undefined)) {
                            this.filterValues[key] = {
                                min: filterValue.min !== undefined ? filterValue.min : '',
                                max: filterValue.max !== undefined ? filterValue.max : ''
                            };
                        } else {
                            this.filterValues[key] = filterValue;
                        }
                    });
                }
            }

            this.applyFilters();
            this.render();
        });

        container.appendChild(select);
        return container;
    }

    /**
     * Render the complete table
     */
    render() {
        if (!this.container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }

        // Clear container
        this.container.innerHTML = '';

        // Add preset dropdown
        const presetDropdown = this.renderPresetDropdown();
        this.container.appendChild(presetDropdown);

        // Create table wrapper for horizontal scrolling
        const wrapper = document.createElement('div');
        wrapper.className = 'data-table-wrapper';

        // Create table
        const table = document.createElement('table');
        table.className = 'data-table';

        // Create header
        const thead = document.createElement('thead');

        // Column headers row
        const headerRow = document.createElement('tr');
        this.columns.forEach(col => {
            const th = document.createElement('th');
            th.dataset.column = col.key;

            const labelSpan = document.createElement('span');
            labelSpan.textContent = col.label;
            th.appendChild(labelSpan);

            const sortIndicator = document.createElement('span');
            sortIndicator.className = 'sort-indicator';
            th.appendChild(sortIndicator);

            if (this.sortColumn === col.key) {
                th.classList.add('sorted');
                th.classList.add(this.sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }

            th.addEventListener('click', () => {
                let newDirection = 'asc';
                if (this.sortColumn === col.key && this.sortDirection === 'asc') {
                    newDirection = 'desc';
                }
                this.applySort(col.key, newDirection);
                this.render();
            });

            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Filter row
        const filterRow = document.createElement('tr');
        filterRow.className = 'filter-row';
        this.columns.forEach(col => {
            const th = document.createElement('th');

            if (col.type === 'number') {
                const rangeDiv = document.createElement('div');
                rangeDiv.className = 'filter-range';

                const minInput = document.createElement('input');
                minInput.type = 'number';
                minInput.className = 'filter-input';
                minInput.placeholder = 'Min';
                minInput.value = this.filterValues[col.key].min;
                minInput.addEventListener('input', (e) => {
                    this.filterValues[col.key].min = e.target.value;
                    this.applyFilters();
                    this.renderTableBody(table.querySelector('tbody'));
                });

                const maxInput = document.createElement('input');
                maxInput.type = 'number';
                maxInput.className = 'filter-input';
                maxInput.placeholder = 'Max';
                maxInput.value = this.filterValues[col.key].max;
                maxInput.addEventListener('input', (e) => {
                    this.filterValues[col.key].max = e.target.value;
                    this.applyFilters();
                    this.renderTableBody(table.querySelector('tbody'));
                });

                rangeDiv.appendChild(minInput);
                rangeDiv.appendChild(maxInput);
                th.appendChild(rangeDiv);
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'filter-input';
                input.placeholder = 'Filter...';
                input.value = this.filterValues[col.key];
                input.addEventListener('input', (e) => {
                    this.filterValues[col.key] = e.target.value;
                    this.applyFilters();
                    this.renderTableBody(table.querySelector('tbody'));
                });
                th.appendChild(input);
            }

            filterRow.appendChild(th);
        });
        thead.appendChild(filterRow);

        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        this.renderTableBody(tbody);
        table.appendChild(tbody);

        wrapper.appendChild(table);
        this.container.appendChild(wrapper);
    }

    /**
     * Render just the table body (for filter updates without full re-render)
     * @param {HTMLElement} tbody - The tbody element to render into
     */
    renderTableBody(tbody) {
        tbody.innerHTML = '';

        if (this.filteredData.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = this.columns.length;
            cell.textContent = 'No data matching filters';
            cell.style.textAlign = 'center';
            cell.style.fontStyle = 'italic';
            cell.style.color = '#64748b';
            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }

        this.filteredData.forEach(rowData => {
            const row = document.createElement('tr');

            this.columns.forEach(col => {
                const cell = document.createElement('td');
                let value = rowData[col.key];

                if (col.formatter && typeof col.formatter === 'function') {
                    const formatted = col.formatter(value, rowData);
                    if (typeof formatted === 'string') {
                        cell.innerHTML = formatted;
                    } else if (formatted instanceof HTMLElement) {
                        cell.appendChild(formatted);
                    } else {
                        cell.textContent = formatted;
                    }
                } else {
                    cell.textContent = value !== undefined && value !== null ? value : '';
                }

                if (col.type === 'number') {
                    cell.style.textAlign = 'right';
                }

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DataTable = DataTable;
}
