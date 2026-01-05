(function () {
  'use strict';

  const { eq, neq, gt, gte, lt, lte } = window.FloatUtils;
  const { formatNumber } = window.Utils;
  // `Point` is provided by docs/lib/point.js and exported as window.Point

  function createControls(container) {
    const controls = document.createElement('div');
    controls.className = 'controls-section distances-controls';

    const xGroup = document.createElement('div');
    xGroup.className = 'control-group';
    xGroup.innerHTML = `
            <label for="dist-x">X</label>
            <input type="number" id="dist-x" value="0" step="1" min="-100" max="100">
        `;
    controls.appendChild(xGroup);

    const yGroup = document.createElement('div');
    yGroup.className = 'control-group';
    yGroup.innerHTML = `
            <label for="dist-y">Y</label>
            <input type="number" id="dist-y" value="0" step="1" min="-100" max="100">
        `;
    controls.appendChild(yGroup);

    // Include Half Studs control
    const halfStudsGroup = document.createElement('div');
    halfStudsGroup.className = 'control-group';
    halfStudsGroup.innerHTML = `
            <label>
                <input type="checkbox" id="dist-halfstuds">
                Include Half Studs
            </label>
        `;
    controls.appendChild(halfStudsGroup);

    // Min Highlight control
    const minHighlightGroup = document.createElement('div');
    minHighlightGroup.className = 'control-group';
    minHighlightGroup.innerHTML = `
            <label for="dist-min-highlight">Min Highlight</label>
            <input type="number" id="dist-min-highlight" value="0.000" step="1.000">
        `;
    controls.appendChild(minHighlightGroup);

    // Max Highlight control
    const maxHighlightGroup = document.createElement('div');
    maxHighlightGroup.className = 'control-group';
    maxHighlightGroup.innerHTML = `
            <label for="dist-max-highlight">Max Highlight</label>
            <input type="number" id="dist-max-highlight" value="0.000" step="1.000">
        `;
    controls.appendChild(maxHighlightGroup);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'control-group';
    btnGroup.style.justifyContent = 'flex-end';
    const calcBtn = document.createElement('button');
    calcBtn.id = 'dist-calculate';
    calcBtn.className = 'btn btn-primary';
    calcBtn.textContent = 'Calculate';
    btnGroup.appendChild(calcBtn);
    controls.appendChild(btnGroup);

    container.appendChild(controls);

    return { calcBtn };
  }

  function createTable(container, halfStuds = false) {
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'dist-table-wrapper';

    const table = document.createElement('table');
    table.className = 'dist-table';

    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className = 'corner-cell';
    corner.textContent = '';
    headerRow.appendChild(corner);

    const step = halfStuds ? 0.5 : 1;
    const decimals = halfStuds ? 1 : 0;
    const max = halfStuds ? 10 : 5;
    for (let x = -max; x <= max; x++) {
      const th = document.createElement('th');
      th.className = 'header-cell';
      th.dataset.offset = x;
      th.textContent = formatNumber(x * step, decimals);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let y = max; y >= -max; y--) {
      const tr = document.createElement('tr');
      const yHeader = document.createElement('th');
      yHeader.className = 'header-cell';
      yHeader.dataset.offset = y;
      yHeader.textContent = formatNumber(y * step, decimals);
      tr.appendChild(yHeader);

      for (let x = -max; x <= max; x++) {
        const td = document.createElement('td');
        td.className = 'value-cell';
        td.dataset.ox = x;
        td.dataset.oy = y;
        td.textContent = '';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
    return tableWrapper;
  }

  function init() {
    const container = document.getElementById('distances-module');
    if (!container) return;
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'module-header';
    header.innerHTML = `
            <h2>Planar Distances</h2>
            <p>Enter coordinates X and Y and click Calculate to see distances from each grid cell.</p>
        `;
    container.appendChild(header);

    const { calcBtn } = createControls(container);
    let tableWrapper = null;

    function rebuildTable(half) {
      if (tableWrapper && tableWrapper.parentNode) tableWrapper.parentNode.removeChild(tableWrapper);
      tableWrapper = createTable(container, half);
    }

    calcBtn.addEventListener('click', () => {
      const rawX = parseFloat(document.getElementById('dist-x').value);
      const rawY = parseFloat(document.getElementById('dist-y').value);
      const x = isNaN(rawX) ? 0 : rawX;
      const y = isNaN(rawY) ? 0 : rawY;

      const halfStuds = document.getElementById('dist-halfstuds').checked;
      // create table on calculate (do not create before first calculate)
      rebuildTable(halfStuds);
      const step = halfStuds ? 0.5 : 1;
      const decimals = halfStuds ? 1 : 0;

      // central column/row use Math.floor of the coordinates when step==1
      // when using half studs, we want to floor to nearest 0.5 multiple
      const centerX = halfStuds ? Math.floor(x / 0.5) * 0.5 : Math.floor(x);
      const centerY = halfStuds ? Math.floor(y / 0.5) * 0.5 : Math.floor(y);

      const target = new Point(x, y);

      // Update column headers to show absolute coordinates based on floored center
      const colHeaders = tableWrapper.querySelectorAll('thead th.header-cell');
      colHeaders.forEach(th => {
        const off = parseFloat(th.dataset.offset);
        const val = centerX + off * step;
        th.textContent = formatNumber(val, decimals);
      });

      // Update row headers similarly
      const rows = tableWrapper.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const yHead = row.querySelector('th.header-cell');
        const off = parseFloat(yHead.dataset.offset);
        const val = centerY + off * step;
        yHead.textContent = formatNumber(val, decimals);
      });

      const cells = tableWrapper.querySelectorAll('.value-cell');
      cells.forEach(cell => {
        const ox = parseFloat(cell.dataset.ox);
        const oy = parseFloat(cell.dataset.oy);
        const cx = centerX + ox * step;
        const cy = centerY + oy * step;
        const p = new Point(cx, cy);
        const d = p.distanceTo(target);
        cell.textContent = formatNumber(d, 3);
        // Determine if this cell lies on the global x=0 or y=0 lines
        const isAxisX = eq(cx, 0);
        const isAxisY = eq(cy, 0);
        cell.classList.toggle('axis-x', !!isAxisX);
        cell.classList.toggle('axis-y', !!isAxisY);
        // Determine if this cell should be highlighted
        const minHighlight = parseFloat(document.getElementById('dist-min-highlight').value);
        const maxHighlight = parseFloat(document.getElementById('dist-max-highlight').value);
        if ((neq(minHighlight, 0) || neq(maxHighlight, 0)) &&
          !isNaN(minHighlight) && gte(d, minHighlight) &&
          !isNaN(maxHighlight) && lte(d, maxHighlight)) {
          cell.classList.add('highlighted');
        } else {
          cell.classList.remove('highlighted');
        }
      });
    });

    // Do not rebuild table when checkbox changes — table is created only on Calculate
  }

  TechnicTools.registerModule('distances-module', 'Planar Distances', init);

})();
